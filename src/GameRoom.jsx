import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import QRCode from 'qrcode'
import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import {
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Dice5,
  DoorOpen,
  Gamepad2,
  Laugh,
  LockKeyhole,
  Maximize2,
  MessageCircle,
  Minimize2,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  UserRound,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'
import { avatarPresets } from './avatars'
import { ChessGame, LudoGame } from './BoardGames'
import { logAnalyticsEvent, submitFeedback } from './feedback'
import { auth, db, isFirebaseConfigured } from './firebase'
import {
  AvatarPicker,
  PlayerRoster,
  RoomSocialPanel,
  SessionControls,
} from './PartySession'
import {
  createChessState,
  createLudoState,
  restoreLudo,
  serializeLudo,
} from './roomGameEngines'
import {
  createInitialSession,
  createRoomMaintenancePatch,
  isPlayerActive,
  normalizePlayer,
  normalizePlayerPatch,
  normalizePlayers,
  normalizeTime,
  playerPresenceTimeoutMs,
  removePlayerFromScores,
  removePlayerFromSeats,
} from './roomState'
import VoiceChannel from './VoiceChannel'
const truthPrompts = [
  'What is the funniest thing you have searched online recently?',
  'Who in this group has the most dramatic reaction to small problems?',
  'What is one message you typed but never sent?',
  'What is your most unserious habit?',
  'Who was your first silly crush?',
]

const darePrompts = [
  'Send the third photo in your gallery to the group, no explanation.',
  'Talk like a news reporter for the next two minutes.',
  'Let the group choose your next profile picture for 10 minutes.',
  'Do your best celebrity introduction for yourself.',
  'Text someone "important meeting, call you later" and refuse context.',
]

const likelyPrompts = [
  'Who is most likely to say "I am coming" while still at home?',
  'Who is most likely to laugh at the wrong moment?',
  'Who is most likely to forget why they opened their phone?',
  'Who is most likely to become famous for something random?',
  'Who is most likely to start a plan and then cancel it?',
]

const wouldYouRatherPrompts = [
  ['Only reply with voice notes for a week', 'Only receive voice notes for a week'],
  ['Lose your playlist', 'Lose your chat stickers'],
  ['Always be 10 minutes late', 'Always arrive awkwardly early'],
  ['Have your search history read aloud', 'Have your drafts read aloud'],
  ['Never eat fries again', 'Never drink cold coffee again'],
]

const roomGames = ['Truth or Dare', "Who's Most Likely To", 'Would You Rather', 'Chess', 'Ludo']
const promptRoomGames = roomGames.slice(0, 3)
const playerStorageKey = 'just-for-fun-player'
const chatMessageLimit = 60
const matchHistoryLimit = 12
const kickLimit = 3
const roomLifetimeMs = 24 * 60 * 60 * 1000
const roomSchemaVersion = 2
const gameStateDocId = 'current'
const gameStateKeys = ['game', 'prompt', 'round', 'reactions', 'session', 'chess', 'ludo']
const roomMetadataKeys = ['roomCode', 'hostId', 'expiresAt', 'resetAt', 'kickedPlayers', 'locked']
const roomExitReasons = [
  ['done_playing', 'Done playing'],
  ['left_alone', 'No one joined'],
  ['confusing_room', 'Room felt confusing'],
  ['connection_issue', 'Connection issue'],
  ['other', 'Other'],
]

function randomItem(items, current) {
  if (items.length === 1) return items[0]
  let next = current
  while (next === current) {
    next = items[Math.floor(Math.random() * items.length)]
  }
  return next
}

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function sanitizeRoomCode(value) {
  return value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()
}

function formatSyncError(error) {
  const message = error?.message || String(error || '')
  const code = error?.code || ''
  if (code === 'auth/configuration-not-found' || message.toLowerCase().includes('auth/configuration-not-found')) {
    return 'Firebase Anonymous Authentication is not enabled. Open Firebase Console > Authentication > Sign-in method and enable Anonymous.'
  }
  if (code === 'permission-denied' || message.toLowerCase().includes('missing or insufficient permissions')) {
    return 'Firebase rules are blocking this room. Open Firebase Console > Firestore Database > Rules and publish the rules from firestore.rules.'
  }
  if (message.toLowerCase().includes('client is offline')) {
    return 'Firestore is unreachable. Check that the database exists and your Firebase .env values match this project.'
  }
  return message
}

function ToolPage({ children }) {
  return <div className="tool-page">{children}</div>
}

function RoomStartChecklist({ items }) {
  return (
    <div className="room-start-checklist" aria-label="Room start checklist">
      {items.map((item) => (
        <div className={item.done ? 'done' : ''} key={item.label}>
          <span>{item.done ? 'Done' : item.step}</span>
          <strong>{item.label}</strong>
        </div>
      ))}
    </div>
  )
}

function RoomExitSheet({
  exitMessage,
  exitReason,
  exitStatus,
  exitSubmitting,
  onClose,
  onMessageChange,
  onReasonChange,
  onSkip,
  onSubmit,
}) {
  return (
    <section className="feedback-shell" aria-label="Room exit feedback">
      <form className="feedback-sheet room-exit-sheet" onSubmit={onSubmit}>
        <button className="icon-button feedback-close" type="button" aria-label="Close exit feedback" onClick={onClose}>
          <DoorOpen size={18} />
        </button>
        <div className="feedback-copy">
          <span className="mini-label">Leaving room</span>
          <h2>What made you leave?</h2>
          <p>This helps spot room setup, invite, and connection problems.</p>
        </div>
        <div className="feedback-type-grid room-exit-reasons" aria-label="Exit reason">
          {roomExitReasons.map(([value, label]) => (
            <button
              className={exitReason === value ? 'active' : ''}
              type="button"
              key={value}
              onClick={() => onReasonChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="feedback-message">
          Extra detail
          <textarea
            rows="3"
            maxLength="800"
            value={exitMessage}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="Optional: what should feel easier?"
          />
        </label>
        <div className="feedback-actions">
          <button type="submit" disabled={exitSubmitting}>
            <ArrowRight size={17} />
            {exitSubmitting ? 'Saving...' : 'Leave & Send'}
          </button>
          <button className="secondary-button" type="button" onClick={onSkip}>
            Leave Without Sending
          </button>
        </div>
        {exitStatus && <p className="feedback-status">{exitStatus}</p>}
      </form>
    </section>
  )
}

function getInitialRoomCode() {
  const params = new URLSearchParams(window.location.search)
  return sanitizeRoomCode(params.get('room') || '') || createRoomCode()
}

function getStoredPlayer() {
  try {
    const storedPlayer = JSON.parse(window.localStorage.getItem(playerStorageKey))
    if (storedPlayer?.id) {
      return {
        id: storedPlayer.id,
        name: typeof storedPlayer.name === 'string' ? storedPlayer.name : '',
        avatar: storedPlayer.avatar || avatarPresets[0].id,
      }
    }
  } catch {
    // A fresh local identity is enough if saved data is unavailable.
  }

  const id = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return {
    id,
    name: '',
    avatar: avatarPresets[Math.abs(id.charCodeAt(0) || 0) % avatarPresets.length].id,
  }
}

function savePlayer(player) {
  window.localStorage.setItem(playerStorageKey, JSON.stringify(player))
}

function createRoomExpiry(now = Date.now()) {
  return now + roomLifetimeMs
}

function currentTimestamp() {
  return Date.now()
}

function ttlFields(expiresAt = createRoomExpiry()) {
  return {
    expiresAt,
    expireAt: Timestamp.fromMillis(expiresAt),
  }
}

function createInitialRoom(roomCode, player = null, now = Date.now()) {
  const game = roomGames[0]
  const expiresAt = createRoomExpiry(now)

  return {
    roomCode,
    hostId: player?.id || '',
    createdAt: now,
    expiresAt,
    resetAt: now,
    kickedPlayers: {},
    joinRequests: {},
    locked: false,
    players: player
      ? {
          [player.id]: {
            uid: player.uid || player.id,
            name: player.name,
            avatar: player.avatar || avatarPresets[0].id,
            ready: false,
            points: 0,
            joinedAt: now,
            lastSeen: now,
            lastSeenAt: now,
          },
        }
      : {},
    game,
    prompt: promptForGame(game, ''),
    round: 1,
    reactions: { laughs: 0, chaos: 0, skip: 0 },
    session: createInitialSession(),
    messages: [],
    history: [],
  }
}

function createEventId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function systemMessage(text) {
  return {
    id: createEventId(),
    system: true,
    text,
    createdAt: Date.now(),
  }
}

function appendMessages(messages, ...nextMessages) {
  const byId = new Map(
    [...(messages || []), ...nextMessages.map(normalizeMessage)]
      .map((message) => [message.id, message]),
  )
  return [...byId.values()].slice(-chatMessageLimit)
}

function appendHistory(history, ...nextMatches) {
  const byId = new Map(
    [...(history || []), ...nextMatches.map(normalizeMatch)]
      .map((match) => [match.id, match]),
  )
  return [...byId.values()].slice(-matchHistoryLimit)
}

function normalizeKickedPlayers(kickedPlayers) {
  if (!kickedPlayers || Array.isArray(kickedPlayers) || typeof kickedPlayers !== 'object') return {}

  return Object.fromEntries(
    Object.entries(kickedPlayers)
      .filter(([playerId]) => playerId)
      .map(([playerId, kickRecord]) => [playerId, normalizeKickRecord(kickRecord)]),
  )
}

function normalizeKickRecord(kickRecord) {
  if (!kickRecord) return null

  if (typeof kickRecord === 'object' && !kickRecord.toMillis) {
    const count = Math.max(1, Math.min(kickLimit, Number(kickRecord.count) || 1))
    return {
      count,
      lastRemovedAt: normalizeTime(kickRecord.lastRemovedAt) || Date.now(),
      blocked: Boolean(kickRecord.blocked) || count >= kickLimit,
    }
  }

  return {
    count: 1,
    lastRemovedAt: normalizeTime(kickRecord) || Date.now(),
    blocked: false,
  }
}

function normalizeJoinRequests(joinRequests) {
  if (!joinRequests || Array.isArray(joinRequests) || typeof joinRequests !== 'object') return {}

  return Object.fromEntries(
    Object.entries(joinRequests)
      .filter(([playerId]) => playerId)
      .map(([playerId, request]) => [playerId, normalizeJoinRequest(request)]),
  )
}

function normalizeJoinRequest(request = {}) {
  const status = ['pending', 'accepted', 'rejected', 'joined'].includes(request.status)
    ? request.status
    : 'pending'

  return {
    uid: request.uid || '',
    name: request.name || 'Player',
    avatar: request.avatar || avatarPresets[0].id,
    requestedAt: normalizeTime(request.requestedAt) || Date.now(),
    decidedAt: normalizeTime(request.decidedAt),
    joinedAt: normalizeTime(request.joinedAt),
    attempts: Math.max(1, Number(request.attempts) || 1),
    status,
  }
}

function createJoinRequest(player, previousRequest = null) {
  const previous = previousRequest ? normalizeJoinRequest(previousRequest) : null

  return {
    uid: player.uid || player.id || '',
    name: player.name || 'Player',
    avatar: player.avatar || avatarPresets[0].id,
    requestedAt: Date.now(),
    decidedAt: 0,
    joinedAt: 0,
    attempts: (previous?.attempts || 0) + 1,
    status: 'pending',
  }
}

function playersFromQuerySnapshot(snapshot) {
  return Object.fromEntries(
    (snapshot?.docs || []).map((playerSnapshot) => [
      playerSnapshot.id,
      normalizePlayer(playerSnapshot.data()),
    ]),
  )
}

function playersFromDocSnapshots(snapshots) {
  return Object.fromEntries(
    snapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => [snapshot.id, normalizePlayer(snapshot.data())]),
  )
}

function hasRoomPatch(patch) {
  return Object.values(patch || {}).some((value) => {
    if (value === undefined) return false
    if (Array.isArray(value)) return value.length > 0
    if (value && typeof value === 'object' && !value.toMillis) return Object.keys(value).length > 0
    return true
  })
}

function mergeRoomPatches(...patches) {
  return patches.filter(hasRoomPatch).reduce((merged, patch) => {
    const next = {
      ...merged,
      ...patch,
    }

    if (merged.playerDeletes || patch.playerDeletes) {
      next.playerDeletes = [...new Set([
        ...(merged.playerDeletes || []),
        ...(patch.playerDeletes || []),
      ])]
    }

    if (merged.playerPatches || patch.playerPatches) {
      const playerPatches = { ...(merged.playerPatches || {}) }
      Object.entries(patch.playerPatches || {}).forEach(([playerId, playerPatch]) => {
        playerPatches[playerId] = {
          ...(playerPatches[playerId] || {}),
          ...playerPatch,
        }
      })
      next.playerPatches = playerPatches
    }

    if (merged.joinRequestPatches || patch.joinRequestPatches) {
      const joinRequestPatches = { ...(merged.joinRequestPatches || {}) }
      Object.entries(patch.joinRequestPatches || {}).forEach(([playerId, requestPatch]) => {
        joinRequestPatches[playerId] = {
          ...(joinRequestPatches[playerId] || {}),
          ...requestPatch,
        }
      })
      next.joinRequestPatches = joinRequestPatches
    }

    if (merged.joinRequestDeletes || patch.joinRequestDeletes) {
      next.joinRequestDeletes = [...new Set([
        ...(merged.joinRequestDeletes || []),
        ...(patch.joinRequestDeletes || []),
      ])]
    }

    if (merged.messageCreates || patch.messageCreates) {
      next.messageCreates = [
        ...(merged.messageCreates || []),
        ...(patch.messageCreates || []),
      ]
    }

    if (merged.historyCreates || patch.historyCreates) {
      next.historyCreates = [
        ...(merged.historyCreates || []),
        ...(patch.historyCreates || []),
      ]
    }

    return next
  }, {})
}

function preserveOptimisticCreateMetadata(patch, optimisticPatch) {
  const nextPatch = { ...patch }

  if (patch.messageCreates?.length && optimisticPatch.messageCreates?.length) {
    nextPatch.messageCreates = patch.messageCreates.map((message, index) => ({
      ...message,
      ...(optimisticPatch.messageCreates[index]?.id
        ? { id: optimisticPatch.messageCreates[index].id }
        : {}),
      ...(optimisticPatch.messageCreates[index]?.createdAt
        ? { createdAt: optimisticPatch.messageCreates[index].createdAt }
        : {}),
    }))
  }

  if (patch.historyCreates?.length && optimisticPatch.historyCreates?.length) {
    nextPatch.historyCreates = patch.historyCreates.map((match, index) => ({
      ...match,
      ...(optimisticPatch.historyCreates[index]?.id
        ? { id: optimisticPatch.historyCreates[index].id }
        : {}),
      ...(optimisticPatch.historyCreates[index]?.endedAt
        ? { endedAt: optimisticPatch.historyCreates[index].endedAt }
        : {}),
    }))
  }

  if (patch.session && optimisticPatch.session) {
    nextPatch.session = {
      ...patch.session,
      ...(optimisticPatch.session.matchId ? { matchId: optimisticPatch.session.matchId } : {}),
      ...(optimisticPatch.session.startedAt ? { startedAt: optimisticPatch.session.startedAt } : {}),
      ...(optimisticPatch.session.endedAt ? { endedAt: optimisticPatch.session.endedAt } : {}),
    }
  }

  return nextPatch
}

function normalizeMessage(message = {}) {
  const createdAt = normalizeTime(message.createdAt) || Date.now()
  const normalized = {
    id: message.id || createEventId(),
    system: Boolean(message.system),
    text: String(message.text || ''),
    createdAt,
  }

  if (!normalized.system) {
    normalized.playerId = message.playerId || ''
    normalized.uid = message.uid || ''
    normalized.name = message.name || 'Player'
    normalized.avatar = message.avatar || avatarPresets[0].id
  }

  return normalized
}

function normalizeMatch(match = {}) {
  return {
    id: match.id || createEventId(),
    game: match.game || roomGames[0],
    scores: match.scores && typeof match.scores === 'object' ? match.scores : {},
    winnerIds: Array.isArray(match.winnerIds) ? match.winnerIds : [],
    playerNames: match.playerNames && typeof match.playerNames === 'object' ? match.playerNames : {},
    startedAt: normalizeTime(match.startedAt),
    endedAt: normalizeTime(match.endedAt) || Date.now(),
  }
}

function createInitialGameState(room) {
  const state = {
    game: room.game,
    prompt: room.prompt,
    round: room.round,
    reactions: room.reactions,
    session: room.session,
  }

  if (room.chess) state.chess = room.chess
  if (room.ludo) state.ludo = room.ludo

  return state
}

function pickFields(source, keys) {
  return keys.reduce((picked, key) => {
    if (source && source[key] !== undefined) picked[key] = source[key]
    return picked
  }, {})
}

function mergePlayerPatches(players, playerPatches) {
  if (!playerPatches) return players

  const nextPlayers = { ...players }
  Object.entries(playerPatches).forEach(([playerId, playerPatch]) => {
    nextPlayers[playerId] = {
      ...(nextPlayers[playerId] || normalizePlayer()),
      ...normalizePlayerPatch(playerPatch),
    }
  })
  return nextPlayers
}

function mergeJoinRequestPatches(joinRequests, joinRequestPatches) {
  if (!joinRequestPatches) return joinRequests

  const nextJoinRequests = { ...joinRequests }
  Object.entries(joinRequestPatches).forEach(([playerId, requestPatch]) => {
    nextJoinRequests[playerId] = normalizeJoinRequest({
      ...(nextJoinRequests[playerId] || {}),
      ...requestPatch,
    })
  })
  return nextJoinRequests
}

function applyRoomPatch(currentRoom, patch) {
  const {
    historyCreates = [],
    joinRequestDeletes = [],
    joinRequestPatches,
    messageCreates = [],
    playerDeletes = [],
    playerPatches,
    ...roomPatch
  } = patch || {}
  const nextRoom = {
    ...currentRoom,
    ...roomPatch,
  }

  if (roomPatch.players) nextRoom.players = normalizePlayers(roomPatch.players)
  if (playerDeletes.length) {
    nextRoom.players = { ...nextRoom.players }
    playerDeletes.forEach((playerId) => {
      delete nextRoom.players[playerId]
    })
  }
  if (playerPatches) nextRoom.players = mergePlayerPatches(nextRoom.players, playerPatches)
  if (roomPatch.joinRequests) nextRoom.joinRequests = normalizeJoinRequests(roomPatch.joinRequests)
  if (joinRequestDeletes.length) {
    nextRoom.joinRequests = { ...nextRoom.joinRequests }
    joinRequestDeletes.forEach((playerId) => {
      delete nextRoom.joinRequests[playerId]
    })
  }
  if (joinRequestPatches) {
    nextRoom.joinRequests = mergeJoinRequestPatches(nextRoom.joinRequests, joinRequestPatches)
  }
  if (messageCreates.length) nextRoom.messages = appendMessages(currentRoom.messages, ...messageCreates)
  if (historyCreates.length) nextRoom.history = appendHistory(currentRoom.history, ...historyCreates)

  return normalizeRoom(nextRoom, currentRoom.roomCode)
}

function normalizeRoom(data, roomCode) {
  const fallback = createInitialRoom(roomCode)
  const players = normalizePlayers(data?.players)
  const hostId = data?.hostId || Object.keys(players)[0] || ''
  const expiresAt = normalizeTime(data?.expiresAt)
    || normalizeTime(data?.expireAt)
    || fallback.expiresAt
  const resetAt = normalizeTime(data?.resetAt)
    || normalizeTime(data?.createdAt)
    || fallback.resetAt

  return {
    ...fallback,
    ...data,
    roomCode,
    players,
    hostId,
    createdAt: normalizeTime(data?.createdAt) || fallback.createdAt,
    expiresAt,
    resetAt,
    kickedPlayers: normalizeKickedPlayers(data?.kickedPlayers),
    joinRequests: normalizeJoinRequests(data?.joinRequests),
    locked: Boolean(data?.locked),
    reactions: {
      ...fallback.reactions,
      ...data?.reactions,
    },
    session: {
      ...fallback.session,
      ...data?.session,
      scores: data?.session?.scores || {},
      winnerIds: data?.session?.winnerIds || [],
    },
    messages: Array.isArray(data?.messages)
      ? data.messages.map(normalizeMessage).slice(-chatMessageLimit)
      : [],
    history: Array.isArray(data?.history)
      ? data.history.map(normalizeMatch).slice(-matchHistoryLimit)
      : [],
  }
}

function roomFromFirestoreSnapshots(roomSnapshot, gameStateSnapshot, localRoom, roomCode) {
  const roomData = roomSnapshot?.exists() ? roomSnapshot.data() : {}
  const gameStateData = gameStateSnapshot?.exists() ? gameStateSnapshot.data() : {}
  const legacyPlayers = normalizePlayers(roomData.players)
  const localPlayers = normalizePlayers(localRoom.players)

  return normalizeRoom({
    ...localRoom,
    ...roomData,
    ...gameStateData,
    players: {
      ...legacyPlayers,
      ...localPlayers,
    },
    messages: localRoom.messages?.length ? localRoom.messages : roomData.messages,
    history: localRoom.history?.length ? localRoom.history : roomData.history,
  }, roomCode)
}

function messageFromDoc(snapshot) {
  return normalizeMessage({
    id: snapshot.id,
    ...snapshot.data(),
  })
}

function joinRequestFromDoc(snapshot) {
  return normalizeJoinRequest(snapshot.data())
}

function matchFromDoc(snapshot) {
  return normalizeMatch({
    id: snapshot.id,
    ...snapshot.data(),
  })
}

function writeRoomPatchToAtomicWrite(atomicWrite, roomCode, patch) {
  const roomRef = doc(db, 'rooms', roomCode)
  const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
  const roomPatch = pickFields(patch, roomMetadataKeys)
  const gameStatePatch = pickFields(patch, gameStateKeys)
  const nextExpiresAt = normalizeTime(patch.expiresAt) || createRoomExpiry()
  const ttl = ttlFields(nextExpiresAt)

  if (Object.keys(roomPatch).length > 0) {
    atomicWrite.set(roomRef, {
      ...roomPatch,
      ...ttl,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  if (Object.keys(gameStatePatch).length > 0) {
    atomicWrite.set(gameStateRef, {
      ...gameStatePatch,
      expireAt: ttl.expireAt,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  if (patch.players) {
    Object.entries(normalizePlayers(patch.players)).forEach(([playerId, player]) => {
      atomicWrite.set(doc(db, 'rooms', roomCode, 'players', playerId), {
        ...player,
        uid: player.uid || playerId,
        expireAt: ttl.expireAt,
        ...(player.lastSeen ? { lastSeenAt: serverTimestamp() } : {}),
      }, { merge: true })
    })
  }

  if (patch.playerPatches) {
    Object.entries(patch.playerPatches).forEach(([playerId, playerPatch]) => {
      const normalizedPatch = normalizePlayerPatch(playerPatch)
      if (Object.keys(normalizedPatch).length > 0) {
        atomicWrite.set(doc(db, 'rooms', roomCode, 'players', playerId), {
          ...normalizedPatch,
          uid: normalizedPatch.uid || playerId,
          expireAt: ttl.expireAt,
          ...(normalizedPatch.lastSeen ? { lastSeenAt: serverTimestamp() } : {}),
        }, { merge: true })
      }
    })
  }

  if (patch.joinRequests) {
    Object.entries(normalizeJoinRequests(patch.joinRequests)).forEach(([playerId, request]) => {
      atomicWrite.set(doc(db, 'rooms', roomCode, 'joinRequests', playerId), {
        ...request,
        uid: request.uid || playerId,
        expireAt: ttl.expireAt,
      }, { merge: true })
    })
  }

  if (patch.joinRequestPatches) {
    Object.entries(patch.joinRequestPatches).forEach(([playerId, requestPatch]) => {
      const request = normalizeJoinRequest({
        uid: playerId,
        ...requestPatch,
      })
      atomicWrite.set(doc(db, 'rooms', roomCode, 'joinRequests', playerId), {
        ...request,
        uid: request.uid || playerId,
        expireAt: ttl.expireAt,
      }, { merge: true })
    })
  }

  if (patch.joinRequestDeletes?.length) {
    patch.joinRequestDeletes.forEach((playerId) => {
      atomicWrite.delete(doc(db, 'rooms', roomCode, 'joinRequests', playerId))
    })
  }

  if (patch.playerDeletes?.length) {
    patch.playerDeletes.forEach((playerId) => {
      atomicWrite.delete(doc(db, 'rooms', roomCode, 'players', playerId))
    })
  }

  if (patch.messageCreates?.length) {
    patch.messageCreates.map(normalizeMessage).forEach((message) => {
      atomicWrite.set(doc(db, 'rooms', roomCode, 'messages', message.id), {
        ...message,
        ...(!message.system ? { uid: message.uid || message.playerId } : {}),
        expireAt: ttl.expireAt,
      })
    })
  }

  if (patch.historyCreates?.length) {
    patch.historyCreates.map(normalizeMatch).forEach((match) => {
      atomicWrite.set(doc(db, 'rooms', roomCode, 'history', match.id), {
        ...match,
        expireAt: ttl.expireAt,
      })
    })
  }
}

function writeFreshRoomToTransaction(transaction, roomCode, currentPlayer, options = {}) {
  const {
    archivedPlayerIds = [],
    messageText = '',
    now = Date.now(),
  } = options
  const nextRoom = createInitialRoom(roomCode, currentPlayer, now)
  const ttl = ttlFields(nextRoom.expiresAt)
  const roomRef = doc(db, 'rooms', roomCode)
  const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
  const playerRef = doc(db, 'rooms', roomCode, 'players', currentPlayer.id)

  transaction.set(roomRef, {
    roomCode,
    hostId: currentPlayer.id,
    schemaVersion: roomSchemaVersion,
    expiresAt: nextRoom.expiresAt,
    resetAt: nextRoom.resetAt,
    expireAt: ttl.expireAt,
    kickedPlayers: {},
    joinRequests: {},
    locked: false,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  transaction.set(gameStateRef, {
    ...createInitialGameState(nextRoom),
    expireAt: ttl.expireAt,
    updatedAt: serverTimestamp(),
  })
  archivedPlayerIds
    .filter((playerId) => playerId && playerId !== currentPlayer.id)
    .forEach((playerId) => {
      transaction.delete(doc(db, 'rooms', roomCode, 'players', playerId))
    })
  transaction.set(playerRef, {
    uid: currentPlayer.uid || currentPlayer.id,
    name: currentPlayer.name,
    avatar: currentPlayer.avatar,
    ready: false,
    points: 0,
    joinedAt: now,
    lastSeen: now,
    lastSeenAt: serverTimestamp(),
    expireAt: ttl.expireAt,
  })

  if (messageText) {
    const message = {
      ...systemMessage(messageText),
      createdAt: now,
    }
    transaction.set(doc(db, 'rooms', roomCode, 'messages', message.id), {
      ...message,
      expireAt: ttl.expireAt,
    })
  }

  return nextRoom
}

function promptForGame(game, currentPrompt) {
  if (game === "Who's Most Likely To") return randomItem(likelyPrompts, currentPrompt)
  if (game === 'Would You Rather') {
    const next = randomItem(wouldYouRatherPrompts, currentPrompt)
    return `${next[0]} or ${next[1]}?`
  }
  if (!promptRoomGames.includes(game)) return currentPrompt
  return randomItem([...truthPrompts, ...darePrompts], currentPrompt)
}

function freshGamePatch(room) {
  if (room.game === 'Chess') {
    return {
      chess: createChessState(room.players, room.hostId),
    }
  }

  if (room.game === 'Ludo') {
    return {
      ludo: createLudoState(
        room.ludo?.players?.length || Math.min(4, Math.max(2, Object.keys(room.players).length)),
        room.players,
        room.hostId,
      ),
    }
  }

  return {
    prompt: promptForGame(room.game, room.prompt),
    round: 1,
    reactions: { laughs: 0, chaos: 0, skip: 0 },
  }
}

function finishMatchPatch(room, winnerIds, scores = room.session.scores) {
  const endedAt = Date.now()
  const uniqueWinnerIds = [...new Set(winnerIds.filter(Boolean))]
  const playerNames = Object.fromEntries(
    Object.entries(room.players).map(([playerId, player]) => [playerId, player.name]),
  )
  const playerPatches = Object.fromEntries(
    Object.entries(room.players).map(([playerId, player]) => [
      playerId,
      {
        points: (player.points || 0)
          + (scores[playerId] || 0)
          + (uniqueWinnerIds.includes(playerId) ? 3 : 0),
        ready: false,
      },
    ]),
  )
  const winnerText = uniqueWinnerIds.length
    ? `${uniqueWinnerIds.map((playerId) => playerNames[playerId]).join(' & ')} won ${room.session.game || room.game}.`
    : `${room.session.game || room.game} ended without a declared winner.`
  const match = {
    id: room.session.matchId || createEventId(),
    game: room.session.game || room.game,
    scores,
    winnerIds: uniqueWinnerIds,
    playerNames,
    startedAt: room.session.startedAt || endedAt,
    endedAt,
  }

  return {
    playerPatches,
    session: {
      ...room.session,
      status: 'finished',
      scores,
      winnerIds: uniqueWinnerIds,
      endedAt,
    },
    historyCreates: [match],
    messageCreates: [systemMessage(winnerText)],
  }
}

function currentPlayerPresencePatch(room, currentPlayer, now = Date.now()) {
  const existingPlayer = room.players[currentPlayer.id]
  if (!existingPlayer) return {}

  return {
    playerPatches: {
      [currentPlayer.id]: {
        uid: currentPlayer.uid || currentPlayer.id,
        name: currentPlayer.name,
        avatar: currentPlayer.avatar,
        joinedAt: existingPlayer.joinedAt || now,
        lastSeen: now,
      },
    },
  }
}

function kickPlayerPatch(room, playerId) {
  const playerName = room.players[playerId]?.name || 'A player'
  const nextScores = removePlayerFromScores(room.session.scores, playerId)
  const previousKick = normalizeKickRecord(room.kickedPlayers[playerId])
  const count = Math.min(kickLimit, (previousKick?.count || 0) + 1)
  const blocked = count >= kickLimit
  const kickText = blocked
    ? `${playerName} was permanently removed from the room. Strike ${count}/${kickLimit}.`
    : `${playerName} was removed from the room. Strike ${count}/${kickLimit}.`
  const patch = {
    kickedPlayers: {
      ...room.kickedPlayers,
      [playerId]: {
        count,
        lastRemovedAt: Date.now(),
        blocked,
      },
    },
    playerDeletes: [playerId],
    session: {
      ...room.session,
      scores: nextScores,
      winnerIds: room.session.winnerIds.filter((winnerId) => winnerId !== playerId),
    },
    messageCreates: [systemMessage(kickText)],
  }

  if (room.chess) {
    patch.chess = {
      ...room.chess,
      seats: removePlayerFromSeats(room.chess.seats, playerId),
    }
  }

  if (room.ludo) {
    patch.ludo = {
      ...room.ludo,
      seats: removePlayerFromSeats(room.ludo.seats, playerId),
    }
  }

  return patch
}

function formatRoomExpiry(expiresAt, now = Date.now()) {
  const remaining = (expiresAt || 0) - now
  if (remaining <= 0) return 'Expired'

  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.max(1, Math.ceil((remaining % (60 * 60 * 1000)) / (60 * 1000)))

  if (hours >= 24) return `${Math.round(hours / 24)}d left`
  if (hours >= 1) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

function GameRoom() {
  const [currentPlayer, setCurrentPlayer] = useState(getStoredPlayer)
  const [authUser, setAuthUser] = useState(() => auth?.currentUser || null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [room, setRoom] = useState(() => createInitialRoom(
    getInitialRoomCode(),
    currentPlayer.name ? currentPlayer : null,
  ))
  const [hasJoined, setHasJoined] = useState(Boolean(currentPlayer.name))
  const [joinName, setJoinName] = useState(currentPlayer.name)
  const [joinAvatar, setJoinAvatar] = useState(currentPlayer.avatar)
  const [joinCode, setJoinCode] = useState(room.roomCode)
  const [copied, setCopied] = useState(false)
  const [syncStatus, setSyncStatus] = useState(isFirebaseConfigured ? 'Connecting' : 'Local demo')
  const [syncError, setSyncError] = useState('')
  const [presenceNow, setPresenceNow] = useState(Date.now)
  const [rejoinGraceUntil, setRejoinGraceUntil] = useState(0)
  const [reconnectNonce, setReconnectNonce] = useState(0)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [mobileRoomInfoOpen, setMobileRoomInfoOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState('game')
  const [boardFullscreen, setBoardFullscreen] = useState(false)
  const [roomJoinOpen, setRoomJoinOpen] = useState(false)
  const [roomJoinCode, setRoomJoinCode] = useState('')
  const [roomJoinError, setRoomJoinError] = useState('')
  const [exitPromptOpen, setExitPromptOpen] = useState(false)
  const [exitReason, setExitReason] = useState('done_playing')
  const [exitMessage, setExitMessage] = useState('')
  const [exitStatus, setExitStatus] = useState('')
  const [exitSubmitting, setExitSubmitting] = useState(false)
  const blockedEventMarkerRef = useRef('')
  const roomRef = useRef(room)
  const pendingWritesRef = useRef(0)
  const optimisticTransactionsRef = useRef([])
  const updateRoom = useCallback((updater) => {
    setRoom((currentRoom) => {
      const nextRoom = typeof updater === 'function' ? updater(currentRoom) : updater
      roomRef.current = nextRoom
      return nextRoom
    })
  }, [])
  const updateSyncedRoom = useCallback((updater) => {
    setRoom((currentRoom) => {
      const syncedRoom = typeof updater === 'function' ? updater(currentRoom) : updater
      const nextRoom = optimisticTransactionsRef.current.reduce(
        (optimisticRoom, operation) => applyRoomPatch(optimisticRoom, operation.patch),
        syncedRoom,
      )
      roomRef.current = nextRoom
      return nextRoom
    })
  }, [])
  const authUid = authUser?.uid || ''
  const { game, history, messages, players, prompt, reactions, roomCode, round, session } = room
  const currentKickRecord = room.kickedPlayers?.[currentPlayer.id]
  const currentJoinRequest = room.joinRequests?.[currentPlayer.id]
  const currentPlayerIsMember = Boolean(players[currentPlayer.id])
  const currentPlayerBlocked = hasJoined && Boolean(currentKickRecord?.blocked)
  const rejoinGraceActive = rejoinGraceUntil > presenceNow
  const currentPlayerNeedsAdmission = hasJoined
    && !currentPlayerBlocked
    && !currentPlayerIsMember
    && Boolean(room.locked || currentJoinRequest)
  const currentPlayerRemoved = hasJoined
    && Boolean(currentKickRecord)
    && !currentPlayerBlocked
    && !currentPlayerIsMember
    && !rejoinGraceActive
    && !currentPlayerNeedsAdmission
  const currentPlayerLockedOut = currentPlayerBlocked || currentPlayerRemoved
  const currentKickCount = currentKickRecord?.count || 0
  const pendingRequests = Object.entries(room.joinRequests || {}).filter(([playerId, request]) => (
    request.status === 'pending'
    && !players[playerId]
    && !room.kickedPlayers?.[playerId]?.blocked
  ))
  const roomExpired = Boolean(room.expiresAt && room.expiresAt <= presenceNow)
  const expiryLabel = formatRoomExpiry(room.expiresAt, presenceNow)
  const playerEntries = Object.entries(players).sort(([firstId], [secondId]) => {
    if (firstId === room.hostId) return -1
    if (secondId === room.hostId) return 1
    return 0
  })
  const isHost = room.hostId === currentPlayer.id
  const hostPlayer = players[room.hostId]
  const hostIsAway = !hostPlayer || presenceNow - (hostPlayer.lastSeen || 0) >= playerPresenceTimeoutMs
  const canControlRoom = !currentPlayerLockedOut && (isHost || hostIsAway)
  const activePlayerEntries = playerEntries.filter(([, player]) => (
    isPlayerActive(player, presenceNow)
  ))
  const nonHostPlayers = activePlayerEntries.filter(([playerId]) => playerId !== room.hostId)
  const allReady = activePlayerEntries.length > 0 && nonHostPlayers.every(([, player]) => player.ready)
  const readyCount = activePlayerEntries.filter(([playerId, player]) => (
    playerId === room.hostId || player.ready
  )).length
  const hostLabel = isHost
    ? 'You'
    : hostPlayer?.name || (hostIsAway ? 'Reassigning' : 'Open')
  const accessLabel = pendingRequests.length
    ? `${pendingRequests.length} pending`
    : room.locked ? 'Locked' : 'Open'
  const readyLabel = activePlayerEntries.length
    ? `${readyCount}/${activePlayerEntries.length}`
    : '0/0'
  const livePlayerLabel = activePlayerEntries.length === 1
    ? '1 live'
    : `${activePlayerEntries.length} live`
  const modeLabel = session.status === 'playing'
    ? session.game
    : game
  const winnerNames = session.winnerIds
    .map((playerId) => players[playerId]?.name)
    .filter(Boolean)
  const inviteUrl = `${window.location.origin}/game-room?room=${roomCode}`
  const syncTone = syncStatus === 'Offline'
    ? 'offline'
    : syncStatus === 'Reconnecting'
      ? 'reconnecting'
      : syncStatus === 'Live'
        ? 'live'
        : 'working'
  const SyncIcon = syncTone === 'offline' ? WifiOff : syncTone === 'live' ? Wifi : RefreshCw
  const syncTitle = syncStatus === 'Live'
    ? 'Firebase live sync'
    : syncStatus === 'Local demo'
      ? 'Local demo'
      : syncStatus
  const syncDetail = syncStatus === 'Offline'
    ? syncError || 'Room sync is paused. Try reconnecting.'
    : syncStatus === 'Reconnecting'
      ? 'Connection is shaky. Room changes will catch up when Firestore responds.'
      : syncStatus === 'Saving'
        ? 'Saving the latest room change.'
        : syncStatus === 'Signing in'
          ? 'Creating a temporary room identity.'
          : syncStatus === 'Connecting'
            ? 'Opening the room connection.'
            : syncStatus === 'Local demo'
              ? 'This room is only running in this browser.'
              : 'Room changes are syncing.'
  const canRetrySync = isFirebaseConfigured && ['Offline', 'Reconnecting'].includes(syncStatus)
  const roomGuideItems = [
    { step: '1', label: 'Share invite', done: copied || qrOpen || shareStatus },
    { step: '2', label: 'Friends join', done: activePlayerEntries.length > 1 },
    { step: '3', label: 'Ready up', done: allReady && activePlayerEntries.length > 1 },
    { step: '4', label: 'Start match', done: session.status !== 'lobby' },
  ]
  const currentPlayerReady = Boolean(players[currentPlayer.id]?.ready)
  const isSoloHost = Object.keys(players).length === 1 && room.hostId === currentPlayer.id
  const ludoTurnSeat = room.ludo?.seats?.[room.ludo?.turn] || ''
  const canPlayLudoTurn = session.status === 'playing' && (
    ludoTurnSeat === currentPlayer.id
      || (!ludoTurnSeat && room.hostId === currentPlayer.id)
      || isSoloHost
  )
  const chessTurn = room.chess?.fen?.split(' ')[1] || 'w'
  const chessTurnSeat = room.chess?.seats?.[chessTurn] || ''
  const canPlayChessTurn = session.status === 'playing' && (
    chessTurnSeat === currentPlayer.id
      || (!chessTurnSeat && room.hostId === currentPlayer.id)
      || isSoloHost
  )

  function logRoomEvent(event, context = {}) {
    logAnalyticsEvent(event, {
      page: '/game-room',
      roomCode,
      ...context,
    })
  }

  useEffect(() => {
    if (!currentPlayerLockedOut) return
    const value = currentPlayerBlocked ? 'permanent' : 'removed'
    const marker = `${roomCode}:${value}`
    if (blockedEventMarkerRef.current === marker) return

    logAnalyticsEvent('join_blocked', {
      page: '/game-room',
      roomCode,
      value,
    })
    blockedEventMarkerRef.current = marker
  }, [currentPlayerBlocked, currentPlayerLockedOut, roomCode])

  useEffect(() => {
    if (!hasJoined) return undefined
    const presenceTimer = window.setInterval(() => setPresenceNow(Date.now()), 30000)
    return () => window.clearInterval(presenceTimer)
  }, [hasJoined])

  useEffect(() => {
    if (!hasJoined || typeof IntersectionObserver === 'undefined') return undefined

    const sections = ['game', 'players', 'chat']
      .map((section) => document.getElementById(`room-${section}`))
      .filter(Boolean)
    if (!sections.length) return undefined

    const observer = new IntersectionObserver((entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]
      if (visibleEntry) setMobileSection(visibleEntry.target.id.replace('room-', ''))
    }, {
      rootMargin: '-116px 0px -45% 0px',
      threshold: [0.12, 0.35, 0.6],
    })

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [hasJoined])

  useEffect(() => {
    if (!boardFullscreen) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setBoardFullscreen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [boardFullscreen])

  useEffect(() => {
    const resetInviteState = window.setTimeout(() => {
      setQrOpen(false)
      setQrDataUrl('')
      setShareStatus('')
    }, 0)
    return () => window.clearTimeout(resetInviteState)
  }, [roomCode])

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return undefined

    let cancelled = false
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (cancelled || !user) return
      setAuthUser(user)
      setAuthReady(true)
      setCurrentPlayer((storedPlayer) => {
        const nextPlayer = {
          ...storedPlayer,
          id: user.uid,
          uid: user.uid,
        }
        savePlayer(nextPlayer)
        return nextPlayer
      })
    })

    const signInTimer = window.setTimeout(() => {
      if (cancelled || auth.currentUser) return
      setSyncStatus('Signing in')
      signInAnonymously(auth).catch((error) => {
        if (cancelled) return
        setAuthReady(false)
        setSyncStatus('Offline')
        setSyncError(formatSyncError(error))
      })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(signInTimer)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!hasJoined || !isFirebaseConfigured || !authReady || !authUid || currentPlayerLockedOut) return undefined

    const roomRef = doc(db, 'rooms', roomCode)
    const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
    const playerRef = doc(db, 'rooms', roomCode, 'players', currentPlayer.id)
    const playersRef = collection(db, 'rooms', roomCode, 'players')
    const joinRequestRef = doc(db, 'rooms', roomCode, 'joinRequests', currentPlayer.id)
    const messagesQuery = query(
      collection(db, 'rooms', roomCode, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(chatMessageLimit),
    )
    const historyQuery = query(
      collection(db, 'rooms', roomCode, 'history'),
      orderBy('endedAt', 'desc'),
      limit(matchHistoryLimit),
    )
    let heartbeatId
    let cancelled = false
    let shouldStartHeartbeat = false
    const unsubscribers = []

    getDocs(playersRef)
      .then((playersSnapshot) => runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef)
        const gameStateSnapshot = await transaction.get(gameStateRef)
        const playerSnapshot = await transaction.get(playerRef)
        const joinRequestSnapshot = await transaction.get(joinRequestRef)
        const roomData = snapshot.exists() ? snapshot.data() : {}
        const currentHostId = roomData.hostId || currentPlayer.id
        const hostRef = doc(db, 'rooms', roomCode, 'players', currentHostId)
        const hostSnapshot = currentHostId === currentPlayer.id
          ? playerSnapshot
          : await transaction.get(hostRef)
        const now = Date.now()
        const preloadedPlayers = playersFromQuerySnapshot(playersSnapshot)
        if (playerSnapshot.exists()) {
          preloadedPlayers[currentPlayer.id] = normalizePlayer(playerSnapshot.data())
        }
        if (hostSnapshot.exists()) {
          preloadedPlayers[currentHostId] = normalizePlayer(hostSnapshot.data())
        }
        const shouldMigrateLegacyRoom = snapshot.exists()
          && (!gameStateSnapshot.exists() || roomData.schemaVersion !== roomSchemaVersion)

        if (!snapshot.exists()) {
          writeFreshRoomToTransaction(transaction, roomCode, currentPlayer, {
            archivedPlayerIds: Object.keys(preloadedPlayers),
            now,
          })
          shouldStartHeartbeat = true
          return
        }

        const persistedRoom = roomFromFirestoreSnapshots(
          snapshot,
          gameStateSnapshot,
          {
            ...createInitialRoom(roomCode, null, now),
            players: preloadedPlayers,
          },
          roomCode,
        )
        const persistedPlayerIds = Object.keys(persistedRoom.players)
        const activePersistedPlayerIds = persistedPlayerIds.filter((playerId) => (
          isPlayerActive(persistedRoom.players[playerId], now)
        ))

        if (activePersistedPlayerIds.length === 0) {
          writeFreshRoomToTransaction(transaction, roomCode, currentPlayer, {
            archivedPlayerIds: persistedPlayerIds,
            messageText: 'Room reset after everyone left.',
            now,
          })
          shouldStartHeartbeat = true
          return
        }

        const currentExpiresAt = normalizeTime(roomData.expiresAt)
          || normalizeTime(roomData.expireAt)
          || createRoomExpiry(now)
        const ttl = ttlFields(currentExpiresAt)
        const currentKick = normalizeKickRecord(persistedRoom.kickedPlayers?.[currentPlayer.id])
        if (currentKick?.blocked) {
          throw new Error('You were permanently removed from this room by the host.')
        }

        const maintenancePatch = createRoomMaintenancePatch(persistedRoom, now, {
          keepPlayerId: currentPlayer.id,
        })
        const maintainedRoom = applyRoomPatch(persistedRoom, maintenancePatch)
        if (hasRoomPatch(maintenancePatch)) {
          writeRoomPatchToAtomicWrite(transaction, roomCode, maintenancePatch)
        }

        const existingPlayer = playerSnapshot.exists()
          ? normalizePlayer(playerSnapshot.data())
          : maintainedRoom.players[currentPlayer.id]
        const joinRequests = maintainedRoom.joinRequests
        if (joinRequestSnapshot.exists()) {
          joinRequests[currentPlayer.id] = normalizeJoinRequest(joinRequestSnapshot.data())
        }
        const currentRequest = joinRequests[currentPlayer.id]
        const isExistingMember = Boolean(maintainedRoom.players[currentPlayer.id])
        const requestIsApproved = currentRequest?.status === 'accepted'
        const shouldRequestToJoin = maintainedRoom.locked
          && !isExistingMember
          && !requestIsApproved
          && maintainedRoom.hostId !== currentPlayer.id

        if (shouldRequestToJoin) {
          transaction.set(joinRequestRef, {
            ...(currentRequest?.status === 'pending'
              ? {
                  ...currentRequest,
                  uid: currentPlayer.uid || currentPlayer.id,
                  name: currentPlayer.name,
                  avatar: currentPlayer.avatar,
                }
              : createJoinRequest(currentPlayer, currentRequest)),
            expireAt: ttl.expireAt,
          }, { merge: true })
          return
        }

        transaction.set(roomRef, {
          roomCode,
          schemaVersion: roomSchemaVersion,
          hostId: maintainedRoom.hostId,
          ...(requestIsApproved
            ? {
                lastActiveAt: serverTimestamp(),
              }
            : {}),
          expiresAt: currentExpiresAt,
          resetAt: maintainedRoom.resetAt,
          expireAt: ttl.expireAt,
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })

        if (requestIsApproved) {
          transaction.set(joinRequestRef, {
            ...currentRequest,
            uid: currentPlayer.uid || currentPlayer.id,
            name: currentPlayer.name,
            avatar: currentPlayer.avatar,
            status: 'joined',
            joinedAt: now,
            expireAt: ttl.expireAt,
          }, { merge: true })
        }

        if (!gameStateSnapshot.exists()) {
          transaction.set(gameStateRef, {
            ...createInitialGameState(maintainedRoom),
            expireAt: ttl.expireAt,
            updatedAt: serverTimestamp(),
          }, { merge: true })
        }

        if (shouldMigrateLegacyRoom) {
          Object.entries(normalizePlayers(roomData.players))
            .filter(([playerId]) => !maintenancePatch.playerDeletes?.includes(playerId))
            .forEach(([playerId, player]) => {
              transaction.set(doc(db, 'rooms', roomCode, 'players', playerId), {
                ...player,
                uid: player.uid || playerId,
                expireAt: ttl.expireAt,
                ...(player.lastSeen ? { lastSeenAt: serverTimestamp() } : {}),
              }, { merge: true })
            })
          ;(Array.isArray(roomData.messages) ? roomData.messages : [])
            .slice(-chatMessageLimit)
            .map(normalizeMessage)
            .filter((message) => message.createdAt >= maintainedRoom.resetAt)
            .forEach((message) => {
              transaction.set(doc(db, 'rooms', roomCode, 'messages', message.id), {
                ...message,
                expireAt: ttl.expireAt,
              }, { merge: true })
            })
          ;(Array.isArray(roomData.history) ? roomData.history : [])
            .slice(-matchHistoryLimit)
            .map(normalizeMatch)
            .filter((match) => match.endedAt >= maintainedRoom.resetAt)
            .forEach((match) => {
              transaction.set(doc(db, 'rooms', roomCode, 'history', match.id), {
                ...match,
                expireAt: ttl.expireAt,
              }, { merge: true })
            })
        }

        transaction.set(playerRef, {
          uid: currentPlayer.uid || currentPlayer.id,
          name: currentPlayer.name,
          avatar: currentPlayer.avatar,
          ready: existingPlayer?.ready || false,
          points: existingPlayer?.points || 0,
          joinedAt: existingPlayer?.joinedAt || now,
          lastSeen: now,
          lastSeenAt: serverTimestamp(),
          expireAt: ttl.expireAt,
        }, { merge: true })
        shouldStartHeartbeat = true
      }))
      .then(() => {
        if (cancelled || !shouldStartHeartbeat) return
        unsubscribers.push(
          onSnapshot(
            messagesQuery,
            { includeMetadataChanges: true },
            (snapshot) => {
              const nextMessages = snapshot.docs.map(messageFromDoc).reverse()
              updateSyncedRoom((currentRoom) => normalizeRoom({
                ...currentRoom,
                messages: nextMessages.filter((message) => message.createdAt >= currentRoom.resetAt),
              }, roomCode))
              markSnapshot(snapshot)
            },
            (error) => {
              setSyncStatus('Offline')
              setSyncError(formatSyncError(error))
            },
          ),
          onSnapshot(
            historyQuery,
            { includeMetadataChanges: true },
            (snapshot) => {
              const nextHistory = snapshot.docs.map(matchFromDoc).reverse()
              updateSyncedRoom((currentRoom) => normalizeRoom({
                ...currentRoom,
                history: nextHistory.filter((match) => match.endedAt >= currentRoom.resetAt),
              }, roomCode))
              markSnapshot(snapshot)
            },
            (error) => {
              setSyncStatus('Offline')
              setSyncError(formatSyncError(error))
            },
          ),
        )
        heartbeatId = window.setInterval(() => {
          setDoc(playerRef, {
            uid: currentPlayer.uid || currentPlayer.id,
            name: currentPlayer.name,
            avatar: currentPlayer.avatar,
            lastSeen: Date.now(),
            lastSeenAt: serverTimestamp(),
            expireAt: ttlFields(createRoomExpiry()).expireAt,
          }, { merge: true }).catch(() => {
            setSyncStatus('Reconnecting')
          })
          setDoc(roomRef, {
            lastActiveAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {
            setSyncStatus('Reconnecting')
          })
        }, 45000)
      })
      .catch((error) => {
        setSyncStatus('Offline')
        setSyncError(formatSyncError(error))
      })

    function markSnapshot(snapshot) {
      setSyncStatus(
        pendingWritesRef.current > 0 || snapshot.metadata.hasPendingWrites
          ? 'Saving'
          : snapshot.metadata.fromCache ? 'Reconnecting' : 'Live',
      )
      setSyncError('')
    }

    unsubscribers.push(
      onSnapshot(
      roomRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.exists()) {
          return
        }
        updateSyncedRoom((currentRoom) => normalizeRoom({
          ...currentRoom,
          ...pickFields(snapshot.data(), roomMetadataKeys),
        }, roomCode))
        markSnapshot(snapshot)
      },
      (error) => {
        setSyncStatus('Offline')
        setSyncError(formatSyncError(error))
      },
      ),
      onSnapshot(
        gameStateRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!snapshot.exists()) return
          updateSyncedRoom((currentRoom) => normalizeRoom({
            ...currentRoom,
            ...pickFields(snapshot.data(), gameStateKeys),
          }, roomCode))
          markSnapshot(snapshot)
        },
        (error) => {
          setSyncStatus('Offline')
          setSyncError(formatSyncError(error))
        },
      ),
      onSnapshot(
        playersRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          const nextPlayers = Object.fromEntries(
            snapshot.docs.map((playerSnapshot) => [
              playerSnapshot.id,
              normalizePlayer(playerSnapshot.data()),
            ]),
          )
          updateSyncedRoom((currentRoom) => normalizeRoom({
            ...currentRoom,
            players: nextPlayers,
          }, roomCode))
          markSnapshot(snapshot)
        },
        (error) => {
          setSyncStatus('Offline')
          setSyncError(formatSyncError(error))
        },
      ),
      onSnapshot(
        joinRequestRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          updateSyncedRoom((currentRoom) => normalizeRoom({
            ...currentRoom,
            joinRequests: snapshot.exists()
              ? {
                  ...currentRoom.joinRequests,
                  [currentPlayer.id]: joinRequestFromDoc(snapshot),
                }
              : Object.fromEntries(
                  Object.entries(currentRoom.joinRequests)
                    .filter(([playerId]) => playerId !== currentPlayer.id),
                ),
          }, roomCode))
          markSnapshot(snapshot)
        },
        (error) => {
          setSyncStatus('Offline')
          setSyncError(formatSyncError(error))
        },
      ),
    )

    return () => {
      cancelled = true
      unsubscribers.forEach((unsubscribe) => unsubscribe())
      window.clearInterval(heartbeatId)
    }
  }, [authReady, authUid, currentPlayer, currentPlayerLockedOut, hasJoined, reconnectNonce, roomCode, updateSyncedRoom])

  useEffect(() => {
    if (
      !hasJoined
      || !isFirebaseConfigured
      || !authReady
      || !authUid
      || currentPlayerLockedOut
      || !currentPlayerIsMember
      || !isHost
    ) return undefined

    const joinRequestsRef = collection(db, 'rooms', roomCode, 'joinRequests')
    return onSnapshot(
      joinRequestsRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const nextJoinRequests = Object.fromEntries(
          snapshot.docs.map((requestSnapshot) => [
            requestSnapshot.id,
            joinRequestFromDoc(requestSnapshot),
          ]),
        )
        updateSyncedRoom((currentRoom) => normalizeRoom({
          ...currentRoom,
          joinRequests: Object.fromEntries(
            Object.entries(nextJoinRequests).filter(([, request]) => (
              request.requestedAt >= currentRoom.resetAt
            )),
          ),
        }, roomCode))
      },
      (error) => {
        setSyncStatus('Offline')
        setSyncError(formatSyncError(error))
      },
    )
  }, [authReady, authUid, currentPlayerIsMember, currentPlayerLockedOut, hasJoined, isHost, roomCode, updateSyncedRoom])

  useEffect(() => {
    if (!hasJoined || currentPlayerLockedOut || currentPlayerNeedsAdmission) return undefined
    if (isFirebaseConfigured && (!authReady || !authUid)) return undefined

    const maintenancePatch = createRoomMaintenancePatch(room, presenceNow, {
      keepPlayerId: currentPlayer.id,
      preferredHostId: hostIsAway ? currentPlayer.id : '',
    })
    if (!hasRoomPatch(maintenancePatch)) return undefined

    if (!isFirebaseConfigured) {
      const maintenanceId = window.setTimeout(() => updateRoom((currentRoom) => {
        const now = Date.now()
        const nextMaintenancePatch = createRoomMaintenancePatch(currentRoom, now, {
          keepPlayerId: currentPlayer.id,
          preferredHostId: hostIsAway ? currentPlayer.id : '',
        })
        if (!hasRoomPatch(nextMaintenancePatch)) return currentRoom
        const maintainedRoom = applyRoomPatch(currentRoom, nextMaintenancePatch)
        return applyRoomPatch(
          maintainedRoom,
          currentPlayerPresencePatch(maintainedRoom, currentPlayer, now),
        )
      }), 0)
      return () => window.clearTimeout(maintenanceId)
    }

    let cancelled = false
    runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'rooms', roomCode)
      const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
      const snapshot = await transaction.get(roomRef)
      if (!snapshot.exists()) return

      const gameStateSnapshot = await transaction.get(gameStateRef)
      const playerSnapshots = await Promise.all(
        Object.keys(room.players).map((playerId) => (
          transaction.get(doc(db, 'rooms', roomCode, 'players', playerId))
        )),
      )
      const latestPlayers = playersFromDocSnapshots(playerSnapshots)
      const currentRoom = roomFromFirestoreSnapshots(
        snapshot,
        gameStateSnapshot,
        {
          ...room,
          players: {
            ...room.players,
            ...latestPlayers,
          },
        },
        roomCode,
      )
      const now = Date.now()
      const nextMaintenancePatch = createRoomMaintenancePatch(currentRoom, now, {
        keepPlayerId: currentPlayer.id,
        preferredHostId: hostIsAway ? currentPlayer.id : '',
      })
      if (!hasRoomPatch(nextMaintenancePatch)) return
      const maintainedRoom = applyRoomPatch(currentRoom, nextMaintenancePatch)
      writeRoomPatchToAtomicWrite(
        transaction,
        roomCode,
        mergeRoomPatches(
          nextMaintenancePatch,
          currentPlayerPresencePatch(maintainedRoom, currentPlayer, now),
        ),
      )
    }).catch((error) => {
      if (cancelled) return
      setSyncStatus('Offline')
      setSyncError(formatSyncError(error))
    })

    return () => {
      cancelled = true
    }
  }, [
    authReady,
    authUid,
    currentPlayer,
    currentPlayerLockedOut,
    currentPlayerNeedsAdmission,
    hasJoined,
    hostIsAway,
    presenceNow,
    room,
    roomCode,
    updateRoom,
  ])

  function mutateRoom(createPatch, { hostOnly = false, transactional = false } = {}) {
    if (currentPlayerLockedOut) return
    if (hostOnly && !canControlRoom) return
    if (isFirebaseConfigured && (!authReady || !authUid)) {
      setSyncStatus('Signing in')
      return
    }

    const currentRoom = roomRef.current
    const now = currentTimestamp()
    const maintenancePatch = createRoomMaintenancePatch(currentRoom, now, {
      keepPlayerId: currentPlayer.id,
      preferredHostId: hostOnly ? currentPlayer.id : '',
    })
    const maintainedRoom = applyRoomPatch(currentRoom, maintenancePatch)
    if (hostOnly && maintainedRoom.hostId !== currentPlayer.id) return

    const actionPatch = createPatch(maintainedRoom) || {}
    if (!hasRoomPatch(actionPatch) && !hasRoomPatch(maintenancePatch)) return
    const roomPatch = mergeRoomPatches(
      maintenancePatch,
      actionPatch,
      currentPlayerPresencePatch(maintainedRoom, currentPlayer, now),
    )

    if (!isFirebaseConfigured) {
      updateRoom(applyRoomPatch(currentRoom, roomPatch))
      return
    }

    setSyncStatus('Saving')
    if (transactional) {
      const operationId = createEventId()
      optimisticTransactionsRef.current.push({ id: operationId, patch: roomPatch })
      updateRoom(applyRoomPatch(currentRoom, roomPatch))
      commitTransactionalMutation(createPatch, {
        hostOnly,
        operationId,
        optimisticPatch: roomPatch,
      })
      return
    }

    const batch = writeBatch(db)
    writeRoomPatchToAtomicWrite(batch, roomCode, roomPatch)
    commitAtomicWrite(batch)
  }

  function commitTransactionalMutation(createPatch, { hostOnly, operationId, optimisticPatch }) {
    pendingWritesRef.current += 1
    runTransaction(db, async (transaction) => {
      const firestoreRoomRef = doc(db, 'rooms', roomCode)
      const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
      const roomSnapshot = await transaction.get(firestoreRoomRef)
      if (!roomSnapshot.exists()) throw new Error('This room no longer exists.')

      const gameStateSnapshot = await transaction.get(gameStateRef)
      const playerIds = Object.keys(roomRef.current.players)
      const playerSnapshots = await Promise.all(
        playerIds.map((playerId) => (
          transaction.get(doc(db, 'rooms', roomCode, 'players', playerId))
        )),
      )
      const latestPlayers = playersFromDocSnapshots(playerSnapshots)
      const authoritativeRoom = roomFromFirestoreSnapshots(
        roomSnapshot,
        gameStateSnapshot,
        {
          ...roomRef.current,
          players: latestPlayers,
        },
        roomCode,
      )
      const now = currentTimestamp()
      const maintenancePatch = createRoomMaintenancePatch(authoritativeRoom, now, {
        keepPlayerId: currentPlayer.id,
        preferredHostId: hostOnly ? currentPlayer.id : '',
      })
      const maintainedRoom = applyRoomPatch(authoritativeRoom, maintenancePatch)
      if (hostOnly && maintainedRoom.hostId !== currentPlayer.id) return null

      const actionPatch = createPatch(maintainedRoom) || {}
      if (!hasRoomPatch(actionPatch)) return null
      const transactionPatch = preserveOptimisticCreateMetadata(
        mergeRoomPatches(
          maintenancePatch,
          actionPatch,
          currentPlayerPresencePatch(maintainedRoom, currentPlayer, now),
        ),
        optimisticPatch,
      )
      writeRoomPatchToAtomicWrite(transaction, roomCode, transactionPatch)
      return transactionPatch
    })
      .then((committedPatch) => {
        optimisticTransactionsRef.current = optimisticTransactionsRef.current
          .filter((operation) => operation.id !== operationId)
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1)
        if (committedPatch) {
          updateSyncedRoom((currentRoom) => applyRoomPatch(currentRoom, committedPatch))
        } else {
          setReconnectNonce((value) => value + 1)
        }
        if (pendingWritesRef.current === 0) {
          setSyncStatus('Live')
          setSyncError('')
        }
      })
      .catch((error) => {
        optimisticTransactionsRef.current = optimisticTransactionsRef.current
          .filter((operation) => operation.id !== operationId)
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1)
        setReconnectNonce((value) => value + 1)
        setSyncStatus('Offline')
        setSyncError(formatSyncError(error))
      })
  }

  function commitAtomicWrite(batch) {
    pendingWritesRef.current += 1
    batch.commit()
      .then(() => {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1)
        if (pendingWritesRef.current === 0) {
          setSyncStatus('Live')
          setSyncError('')
        }
      })
      .catch((error) => {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1)
        setSyncStatus('Offline')
        setSyncError(formatSyncError(error))
      })
  }

  function joinRoom(event) {
    event.preventDefault()
    const name = joinName.trim().slice(0, 24)
    const code = sanitizeRoomCode(joinCode)
    if (!name || code.length < 4) return
    if (isFirebaseConfigured && !authUid) {
      setSyncStatus('Signing in')
      setSyncError('Signing in anonymously. Try joining again in a moment.')
      return
    }

    const nextPlayer = {
      ...currentPlayer,
      id: authUid || currentPlayer.id,
      uid: authUid || currentPlayer.uid || currentPlayer.id,
      name,
      avatar: joinAvatar,
    }
    savePlayer(nextPlayer)
    setCurrentPlayer(nextPlayer)
    updateRoom(createInitialRoom(code, nextPlayer))
    setPresenceNow(Date.now())
    setRejoinGraceUntil(currentTimestamp() + 5000)
    setJoinCode(code)
    setHasJoined(true)
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    window.history.replaceState(null, '', `/game-room?room=${code}`)
    logAnalyticsEvent('room_joined', {
      page: '/game-room',
      roomCode: code,
      value: isFirebaseConfigured ? 'live' : 'local',
    })
  }

  function startNewRoom() {
    const nextCode = createRoomCode()
    const nextRoom = createInitialRoom(nextCode, currentPlayer)
    updateRoom(nextRoom)
    setJoinCode(nextCode)
    setRejoinGraceUntil(0)
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    window.history.replaceState(null, '', `/game-room?room=${nextCode}`)
    logAnalyticsEvent('room_created', {
      page: '/game-room',
      roomCode: nextCode,
      value: isFirebaseConfigured ? 'live' : 'local',
    })
  }

  function joinRoomByCode(event) {
    event.preventDefault()
    const code = sanitizeRoomCode(roomJoinCode)
    if (code.length < 4) return
    if (code === roomCode) {
      setRoomJoinError('You are already in this room.')
      return
    }
    if (isFirebaseConfigured && !authUid) {
      setSyncStatus('Signing in')
      setSyncError('Signing in anonymously. Try joining again in a moment.')
      return
    }

    const now = currentTimestamp()
    const nextPlayer = {
      ...currentPlayer,
      id: authUid || currentPlayer.id,
      uid: authUid || currentPlayer.uid || currentPlayer.id,
    }
    savePlayer(nextPlayer)
    setCurrentPlayer(nextPlayer)
    updateRoom(createInitialRoom(code, nextPlayer))
    setPresenceNow(now)
    setRejoinGraceUntil(now + 5000)
    setJoinCode(code)
    setRoomJoinCode('')
    setRoomJoinError('')
    setRoomJoinOpen(false)
    setQrOpen(false)
    setQrDataUrl('')
    setShareStatus('')
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    window.history.replaceState(null, '', `/game-room?room=${code}`)
    logAnalyticsEvent('room_joined', {
      page: '/game-room',
      roomCode: code,
      value: isFirebaseConfigured ? 'live' : 'local',
    })
  }

  function rejoinCurrentRoom() {
    updateRoom(createInitialRoom(roomCode, currentPlayer))
    setPresenceNow(Date.now())
    setRejoinGraceUntil(currentTimestamp() + 5000)
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    setHasJoined(true)
    window.history.replaceState(null, '', `/game-room?room=${roomCode}`)
  }

  function requestJoinAccess() {
    if (currentPlayerBlocked || currentJoinRequest?.status === 'pending') return

    mutateRoom((currentRoom) => {
      const kick = normalizeKickRecord(currentRoom.kickedPlayers[currentPlayer.id])
      if (kick?.blocked || currentRoom.players[currentPlayer.id]) return {}

      return {
        joinRequestPatches: {
          [currentPlayer.id]: createJoinRequest(
            currentPlayer,
            currentRoom.joinRequests[currentPlayer.id],
          ),
        },
      }
    })
  }

  function enterApprovedRoom() {
    if (currentJoinRequest?.status !== 'accepted' && currentJoinRequest?.status !== 'joined') return
    setRejoinGraceUntil(currentTimestamp() + 5000)

    mutateRoom((currentRoom) => {
      const request = currentRoom.joinRequests[currentPlayer.id]
      if (!request || !['accepted', 'joined'].includes(request.status)) return {}
      const now = currentTimestamp()

      return {
        joinRequestPatches: {
          [currentPlayer.id]: {
            ...request,
            uid: currentPlayer.uid || currentPlayer.id,
            name: currentPlayer.name,
            avatar: currentPlayer.avatar,
            status: 'joined',
            joinedAt: now,
          },
        },
        playerPatches: {
          [currentPlayer.id]: {
            uid: currentPlayer.uid || currentPlayer.id,
            name: currentPlayer.name,
            avatar: currentPlayer.avatar,
            ready: false,
            points: currentRoom.players[currentPlayer.id]?.points || 0,
            joinedAt: currentRoom.players[currentPlayer.id]?.joinedAt || now,
            lastSeen: now,
          },
        },
      }
    })
  }

  function toggleRoomLock() {
    mutateRoom((currentRoom) => {
      const locked = !currentRoom.locked

      return {
        locked,
        messageCreates: [systemMessage(locked ? 'Room locked. New players must request access.' : 'Room unlocked. Anyone with the code can join.')],
      }
    }, { hostOnly: true })
  }

  function acceptJoinRequest(playerId) {
    mutateRoom((currentRoom) => {
      const request = currentRoom.joinRequests[playerId]
      if (!request || request.status !== 'pending' || currentRoom.kickedPlayers[playerId]?.blocked) return {}

      return {
        joinRequestPatches: {
          [playerId]: {
            ...request,
            status: 'accepted',
            decidedAt: Date.now(),
          },
        },
      }
    }, { hostOnly: true })
  }

  function rejectJoinRequest(playerId) {
    mutateRoom((currentRoom) => {
      const request = currentRoom.joinRequests[playerId]
      if (!request || request.status !== 'pending') return {}

      return {
        joinRequestPatches: {
          [playerId]: {
            ...request,
            status: 'rejected',
            decidedAt: Date.now(),
          },
        },
      }
    }, { hostOnly: true })
  }

  function extendRoomExpiry() {
    const expiresAt = createRoomExpiry()
    mutateRoom(() => ({
      expiresAt,
      messageCreates: [systemMessage('Room cleanup timer extended for another 24 hours.')],
    }), { hostOnly: true })
  }

  function retryRoomSync() {
    setSyncError('')
    setSyncStatus('Connecting')
    setReconnectNonce((value) => value + 1)
    setPresenceNow(Date.now())
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setShareStatus('Link copied')
      window.setTimeout(() => setCopied(false), 1400)
      window.setTimeout(() => setShareStatus(''), 1600)
      logRoomEvent('invite_copied')
    } catch {
      setShareStatus('Copy failed')
      window.setTimeout(() => setShareStatus(''), 1800)
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join room ${roomCode}`,
          text: `Join my Just For Fun room ${roomCode}.`,
          url: inviteUrl,
        })
        setShareStatus('Shared')
        window.setTimeout(() => setShareStatus(''), 1600)
        logRoomEvent('invite_shared')
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }

    await copyInvite()
  }

  async function toggleInviteQr() {
    if (qrOpen) {
      setQrOpen(false)
      return
    }

    try {
      const dataUrl = await QRCode.toDataURL(inviteUrl, {
        margin: 1,
        width: 220,
        color: {
          dark: '#16222a',
          light: '#ffffff',
        },
      })
      setQrDataUrl(dataUrl)
      setQrOpen(true)
      logRoomEvent('qr_opened')
    } catch {
      setShareStatus('QR failed')
      window.setTimeout(() => setShareStatus(''), 1800)
    }
  }

  function changeGame(nextGame) {
    if (session.status === 'playing') return
    setBoardFullscreen(false)

    mutateRoom((currentRoom) => {
      const patch = {
        game: nextGame,
        prompt: promptForGame(nextGame, currentRoom.prompt),
        round: 1,
        reactions: { laughs: 0, chaos: 0, skip: 0 },
        session: createInitialSession(),
        playerPatches: Object.fromEntries(
          Object.keys(currentRoom.players).map((playerId) => [playerId, { ready: false }]),
        ),
      }

      if (nextGame === 'Chess') {
        patch.chess = currentRoom.chess || createChessState(
          currentRoom.players,
          currentRoom.hostId,
        )
      }

      if (nextGame === 'Ludo') {
        patch.ludo = currentRoom.ludo || createLudoState(
          2,
          currentRoom.players,
          currentRoom.hostId,
        )
      }

      return patch
    }, { hostOnly: true })
  }

  function nextRound() {
    if (session.status !== 'playing') return
    mutateRoom((currentRoom) => ({
      prompt: promptForGame(currentRoom.game, currentRoom.prompt),
      round: currentRoom.round + 1,
      reactions: { laughs: 0, chaos: 0, skip: 0 },
    }), { hostOnly: true })
  }

  function addReaction(reaction) {
    if (session.status !== 'playing') return
    if (!isFirebaseConfigured) {
      mutateRoom((currentRoom) => ({
        reactions: {
          ...currentRoom.reactions,
          [reaction]: currentRoom.reactions[reaction] + 1,
        },
      }))
      return
    }
    if (!authReady || !authUid || currentPlayerLockedOut) {
      setSyncStatus('Signing in')
      return
    }

    const now = currentTimestamp()
    const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
    const playerRef = doc(db, 'rooms', roomCode, 'players', currentPlayer.id)
    const ttl = ttlFields(room.expiresAt)
    const batch = writeBatch(db)
    batch.update(gameStateRef, {
      [`reactions.${reaction}`]: increment(1),
      expireAt: ttl.expireAt,
      updatedAt: serverTimestamp(),
    })
    batch.set(playerRef, {
      uid: currentPlayer.uid || currentPlayer.id,
      name: currentPlayer.name,
      avatar: currentPlayer.avatar,
      lastSeen: now,
      lastSeenAt: serverTimestamp(),
      expireAt: ttl.expireAt,
    }, { merge: true })
    setSyncStatus('Saving')
    commitAtomicWrite(batch)
  }

  function claimChessSeat(color) {
    mutateRoom((currentRoom) => {
      const chessState = currentRoom.chess || createChessState(
        currentRoom.players,
        currentRoom.hostId,
      )
      const seatId = chessState.seats[color]
      if (seatId && seatId !== currentPlayer.id) return {}

      return {
        chess: {
          ...chessState,
          seats: {
            ...chessState.seats,
            [color]: seatId === currentPlayer.id ? '' : currentPlayer.id,
          },
        },
      }
    }, { transactional: true })
  }

  function moveChess(from, to) {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const chessState = currentRoom.chess || createChessState(
        currentRoom.players,
        currentRoom.hostId,
      )
      const chess = new Chess(chessState.fen)
      const seatId = chessState.seats[chess.turn()]
      const isSoloHost = Object.keys(currentRoom.players).length === 1
        && currentRoom.hostId === currentPlayer.id
      const canMove = seatId === currentPlayer.id
        || (!seatId && currentRoom.hostId === currentPlayer.id)
        || isSoloHost
      if (!canMove) return {}

      try {
        const move = chess.move({ from, to, promotion: 'q' })
        const patch = {
          chess: {
            ...chessState,
            fen: chess.fen(),
            lastMove: {
              from: move.from,
              to: move.to,
              san: move.san,
            },
          },
        }
        if (chess.isGameOver()) {
          const winnerId = chess.isCheckmate()
            ? chessState.seats[chess.turn() === 'w' ? 'b' : 'w']
            : ''
          return {
            ...patch,
            ...finishMatchPatch(
              currentRoom,
              winnerId ? [winnerId] : [],
              winnerId ? { ...currentRoom.session.scores, [winnerId]: 3 } : currentRoom.session.scores,
            ),
          }
        }
        return patch
      } catch {
        return {}
      }
    }, { transactional: true })
  }

  function resetChess() {
    mutateRoom((currentRoom) => ({
      chess: createChessState(currentRoom.players, currentRoom.hostId),
    }), { hostOnly: true })
  }

  function claimLudoSeat(color) {
    mutateRoom((currentRoom) => {
      const ludoState = currentRoom.ludo || createLudoState(
        2,
        currentRoom.players,
        currentRoom.hostId,
      )
      const seatId = ludoState.seats[color]
      if (seatId && seatId !== currentPlayer.id) return {}

      return {
        ludo: {
          ...ludoState,
          seats: {
            ...ludoState.seats,
            [color]: seatId === currentPlayer.id ? '' : currentPlayer.id,
          },
        },
      }
    }, { transactional: true })
  }

  function rollLudoDice() {
    const rollPatchesByState = new Map()
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const ludoState = currentRoom.ludo || createLudoState(
        2,
        currentRoom.players,
        currentRoom.hostId,
      )
      const seatId = ludoState.seats[ludoState.turn]
      const isSoloHost = Object.keys(currentRoom.players).length === 1
        && currentRoom.hostId === currentPlayer.id
      const canRoll = seatId === currentPlayer.id
        || (!seatId && currentRoom.hostId === currentPlayer.id)
        || isSoloHost
      if (!canRoll || ludoState.gameState !== 'playerHasToRollADice') return {}

      const stateKey = JSON.stringify(ludoState)
      const existingPatch = rollPatchesByState.get(stateKey)
      if (existingPatch) return existingPatch
      const ludo = restoreLudo(ludoState)
      ludo.rollDiceForCurrentPiece()
      const patch = { ludo: serializeLudo(ludo, ludoState.seats) }
      rollPatchesByState.set(stateKey, patch)
      return patch
    }, { transactional: true })
  }

  function moveLudoToken(tokenIndex) {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const ludoState = currentRoom.ludo
      if (!ludoState) return {}

      const seatId = ludoState.seats[ludoState.turn]
      const isSoloHost = Object.keys(currentRoom.players).length === 1
        && currentRoom.hostId === currentPlayer.id
      const canMove = seatId === currentPlayer.id
        || (!seatId && currentRoom.hostId === currentPlayer.id)
        || isSoloHost
      if (!canMove || !ludoState.validTokenIndices.includes(tokenIndex)) return {}

      const ludo = restoreLudo(ludoState)
      ludo.selectToken(tokenIndex)
      const nextLudo = serializeLudo(ludo, ludoState.seats)
      const winnerColor = nextLudo.ranking[0]
      const winnerId = winnerColor ? nextLudo.seats[winnerColor] : ''
      if (winnerId) {
        return {
          ludo: nextLudo,
          ...finishMatchPatch(
            currentRoom,
            [winnerId],
            { ...currentRoom.session.scores, [winnerId]: 3 },
          ),
        }
      }
      return { ludo: nextLudo }
    }, { transactional: true })
  }

  function resetLudo(playerCount) {
    mutateRoom((currentRoom) => ({
      ludo: createLudoState(playerCount, currentRoom.players, currentRoom.hostId),
    }), { hostOnly: true })
  }

  function toggleReady() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'lobby') return {}
      const player = currentRoom.players[currentPlayer.id]
      if (!player || currentPlayer.id === currentRoom.hostId) return {}

      return {
        playerPatches: {
          [currentPlayer.id]: {
            ready: !player.ready,
          },
        },
      }
    })
  }

  function startMatch() {
    const startedAt = currentTimestamp()
    const matchId = createEventId()
    const initialRoom = roomRef.current
    const initialEffectiveRoom = initialRoom.hostId === currentPlayer.id
      ? initialRoom
      : { ...initialRoom, hostId: currentPlayer.id }
    const initialPlayerSignature = Object.keys(initialRoom.players).sort().join('|')
    const initialGamePatch = freshGamePatch(initialEffectiveRoom)
    const startMessage = systemMessage(`${initialEffectiveRoom.game} started. Good luck, allegedly.`)

    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'lobby') return {}
      const effectiveRoom = currentRoom.hostId === currentPlayer.id
        ? currentRoom
        : { ...currentRoom, hostId: currentPlayer.id }
      const activeEntries = Object.entries(currentRoom.players).filter(([, player]) => (
        isPlayerActive(player, startedAt)
      ))
      const waitingPlayers = activeEntries.filter(([playerId, player]) => (
        playerId !== currentPlayer.id && !player.ready
      ))
      if (waitingPlayers.length > 0) return {}

      const scores = Object.fromEntries(activeEntries.map(([playerId]) => [playerId, 0]))
      const playerPatches = Object.fromEntries(
        Object.keys(currentRoom.players).map((playerId) => [playerId, { ready: false }]),
      )
      const playerSignature = Object.keys(currentRoom.players).sort().join('|')
      const gamePatch = effectiveRoom.game === initialEffectiveRoom.game
        && playerSignature === initialPlayerSignature
        ? initialGamePatch
        : freshGamePatch(effectiveRoom)

      return {
        ...gamePatch,
        playerPatches,
        session: {
          status: 'playing',
          matchId,
          game: effectiveRoom.game,
          scores,
          winnerIds: [],
          startedAt,
          endedAt: 0,
        },
        messageCreates: [{
          ...startMessage,
          text: `${effectiveRoom.game} started. Good luck, allegedly.`,
        }],
      }
    }, { hostOnly: true, transactional: true })
  }

  function adjustScore(playerId, amount) {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const currentScore = currentRoom.session.scores[playerId] || 0
      return {
        session: {
          ...currentRoom.session,
          scores: {
            ...currentRoom.session.scores,
            [playerId]: Math.min(99, Math.max(0, currentScore + amount)),
          },
        },
      }
    }, { hostOnly: true })
  }

  function endMatch() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const scores = currentRoom.session.scores || {}
      const highestScore = Math.max(0, ...Object.values(scores))
      const winnerIds = highestScore > 0
        ? Object.keys(scores).filter((playerId) => scores[playerId] === highestScore)
        : []
      return finishMatchPatch(currentRoom, winnerIds, scores)
    }, { hostOnly: true })
  }

  function prepareRematch() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'finished') return {}
      return {
        ...freshGamePatch(currentRoom),
        playerPatches: Object.fromEntries(
          Object.keys(currentRoom.players).map((playerId) => [playerId, { ready: false }]),
        ),
        session: createInitialSession(),
        messageCreates: [systemMessage(`Rematch lobby opened for ${currentRoom.game}.`)],
      }
    }, { hostOnly: true })
  }

  function kickPlayer(playerId) {
    if (!canControlRoom || playerId === currentPlayer.id || playerId === room.hostId) return
    const playerName = players[playerId]?.name || 'this player'
    const nextStrike = Math.min(kickLimit, (room.kickedPlayers[playerId]?.count || 0) + 1)
    const shouldKick = window.confirm(
      nextStrike >= kickLimit
        ? `Remove ${playerName} from this room permanently? This is strike ${nextStrike}/${kickLimit}.`
        : `Remove ${playerName} from this room? This is strike ${nextStrike}/${kickLimit}; they can still rejoin before strike ${kickLimit}.`,
    )
    if (!shouldKick) return

    mutateRoom((currentRoom) => {
      if (!currentRoom.players[playerId] || currentRoom.hostId === playerId) return {}
      return kickPlayerPatch(currentRoom, playerId)
    }, { hostOnly: true })
  }

  function transferHost(playerId) {
    if (!canControlRoom || session.status === 'playing' || playerId === currentPlayer.id) return
    const nextHost = players[playerId]
    if (!nextHost || !isPlayerActive(nextHost, presenceNow)) return
    const shouldTransfer = window.confirm(`Transfer host controls to ${nextHost.name}?`)
    if (!shouldTransfer) return

    mutateRoom((currentRoom) => {
      const targetPlayer = currentRoom.players[playerId]
      if (!targetPlayer || !isPlayerActive(targetPlayer) || currentRoom.hostId === playerId) return {}

      return {
        hostId: playerId,
        messageCreates: [systemMessage(`${targetPlayer.name} is now the room host.`)],
      }
    }, { hostOnly: true })
  }

  function sendChatMessage(text) {
    const cleanText = text.trim().slice(0, 240)
    if (!cleanText) return

    mutateRoom(() => ({
      messageCreates: [{
        id: createEventId(),
        playerId: currentPlayer.id,
        uid: currentPlayer.uid || currentPlayer.id,
        name: currentPlayer.name,
        avatar: currentPlayer.avatar,
        text: cleanText,
        createdAt: Date.now(),
      }],
    }))
  }

  function editPlayer() {
    setJoinName(currentPlayer.name)
    setJoinAvatar(currentPlayer.avatar)
    setJoinCode(roomCode)
    setHasJoined(false)
  }

  async function submitExitReason(event) {
    event.preventDefault()
    setExitSubmitting(true)
    setExitStatus('')
    try {
      await submitFeedback({
        type: 'roomExit',
        message: exitMessage,
        page: '/game-room',
        roomCode,
        source: 'room-exit',
        rating: exitReason,
      })
      logRoomEvent('room_exit_reason', { rating: exitReason })
      setExitPromptOpen(false)
      setHasJoined(false)
      setExitMessage('')
      setExitStatus('')
      window.history.replaceState(null, '', `/game-room?room=${roomCode}`)
    } catch (error) {
      setExitStatus(formatSyncError(error))
    } finally {
      setExitSubmitting(false)
    }
  }

  function skipExitReason() {
    logRoomEvent('room_exit_reason', { rating: 'skipped' })
    setExitPromptOpen(false)
    setHasJoined(false)
    window.history.replaceState(null, '', `/game-room?room=${roomCode}`)
  }

  if (currentPlayerLockedOut) {
    const isPermanent = currentPlayerBlocked
    const strikeLabel = `Strike ${Math.min(currentKickCount, kickLimit)} of ${kickLimit}`

    return (
      <ToolPage>
        <section className="game-room room-lobby">
          <div className="lobby-copy">
            <span className="mini-label">Room access / {strikeLabel}</span>
            <h2>{isPermanent ? 'Permanently removed from this room.' : 'You were removed from this room.'}</h2>
            <p>
              {isPermanent
                ? 'This room used all 3 removal strikes for your profile. You can start a new room or choose another code.'
                : 'The host cleared your seat. You can rejoin this room until strike 3, when removal becomes permanent.'}
            </p>
          </div>
          <div className="join-room-form">
            {!isPermanent && (
              <button type="button" onClick={rejoinCurrentRoom}>
                <RefreshCw size={17} />
                Rejoin Room
              </button>
            )}
            <button type="button" onClick={startNewRoom}>
              <Plus size={17} />
              Start New Room
            </button>
            <button className="secondary-button" type="button" onClick={editPlayer}>
              <ArrowRight size={17} />
              Choose Another Room
            </button>
          </div>
        </section>
      </ToolPage>
    )
  }

  if (currentPlayerNeedsAdmission) {
    const requestStatus = currentJoinRequest?.status || ''
    const pending = requestStatus === 'pending'
    const rejected = requestStatus === 'rejected'
    const accepted = requestStatus === 'accepted' || requestStatus === 'joined'
    const requestTitle = accepted
      ? 'You are approved.'
      : pending
        ? 'Request sent.'
        : rejected
          ? 'Request rejected.'
          : 'Room is locked.'

    return (
      <ToolPage>
        <section className="game-room room-lobby">
          <div className="lobby-copy">
            <span className="mini-label">Private room / {roomCode}</span>
            <h2>{requestTitle}</h2>
            <p>
              {accepted
                ? 'The host approved you. Enter the room and try to behave like a responsible chaos citizen.'
                : pending
                  ? 'Waiting for the host to accept your request. This is the digital version of standing outside the door.'
                  : rejected
                    ? 'The host rejected this request. You can try again later, unless you hit strike 3.'
                    : 'Ask the host for permission before entering this room.'}
            </p>
            {syncError && <p className="sync-error">{syncError}</p>}
          </div>
          <div className="join-room-form">
            {accepted && (
              <button type="button" onClick={enterApprovedRoom}>
                <ArrowRight size={17} />
                Enter Room
              </button>
            )}
            {!accepted && (
              <button type="button" disabled={pending} onClick={requestJoinAccess}>
                <LockKeyhole size={17} />
                {pending ? 'Request Pending' : rejected ? 'Request Again' : 'Request to Join'}
              </button>
            )}
            <button type="button" className="secondary-button" onClick={startNewRoom}>
              <Plus size={17} />
              Start New Room
            </button>
            <button className="secondary-button" type="button" onClick={editPlayer}>
              <ArrowRight size={17} />
              Choose Another Room
            </button>
          </div>
        </section>
      </ToolPage>
    )
  }

  if (!hasJoined) {
    return (
      <ToolPage>
        <section className="game-room room-lobby">
          <div className="lobby-copy">
            <span className="mini-label">Multiplayer lobby</span>
            <h2>Enter the chaos.</h2>
            <p>Pick a name and join with a room code. Each friend should open the invite on their own phone.</p>
            <div className="lobby-note">
              <strong>No account needed</strong>
              <span>Your name is remembered only in this browser.</span>
            </div>
            <RoomStartChecklist
              items={[
                { step: '1', label: 'Pick name', done: Boolean(joinName.trim()) },
                { step: '2', label: 'Share code', done: joinCode.length >= 4 },
                { step: '3', label: 'Invite friends', done: false },
              ]}
            />
            {syncError && <p className="sync-error">{syncError}</p>}
          </div>
          <form className="join-room-form" onSubmit={joinRoom}>
            <label>
              Your name
              <input
                autoFocus
                maxLength="24"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="Kushal"
              />
            </label>
            <AvatarPicker value={joinAvatar} onChange={setJoinAvatar} />
            <label>
              Room code
              <input
                inputMode="text"
                maxLength="6"
                value={joinCode}
                onChange={(event) => setJoinCode(sanitizeRoomCode(event.target.value))}
                placeholder="ABC123"
              />
            </label>
            <button type="submit" disabled={!joinName.trim() || joinCode.length < 4}>
              <ArrowRight size={17} />
              Join Room
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setJoinCode(createRoomCode())}
            >
              <RefreshCw size={17} />
              Generate New Code
            </button>
          </form>
        </section>
      </ToolPage>
    )
  }

  function scrollToRoomSection(section) {
    setMobileSection(section)
    document.getElementById(`room-${section}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  let mobileAction = {
    eyebrow: 'Party lobby',
    detail: `${readyLabel} ready`,
    label: canControlRoom ? 'Start match' : currentPlayerReady ? 'Cancel' : 'Mark ready',
    icon: canControlRoom ? Play : currentPlayerReady ? X : Check,
    disabled: canControlRoom && !allReady,
    danger: !canControlRoom && currentPlayerReady,
  }

  if (session.status === 'playing' && game === 'Ludo' && room.ludo) {
    const shouldRoll = canPlayLudoTurn && room.ludo.gameState === 'playerHasToRollADice'
    const shouldChooseToken = canPlayLudoTurn && room.ludo.gameState === 'playerHasToSelectAPosition'
    mobileAction = {
      eyebrow: shouldRoll || shouldChooseToken ? 'Your turn' : `${room.ludo.turn} turn`,
      detail: shouldChooseToken
        ? 'Choose a glowing token'
        : shouldRoll ? 'Roll to make your move' : `Waiting for ${players[ludoTurnSeat]?.name || room.ludo.turn}`,
      label: shouldRoll ? 'Roll dice' : shouldChooseToken ? 'Choose token' : 'View board',
      icon: shouldRoll ? Dice5 : Gamepad2,
      disabled: false,
      danger: false,
    }
  } else if (session.status === 'playing' && game === 'Chess' && room.chess) {
    mobileAction = {
      eyebrow: canPlayChessTurn ? 'Your turn' : `${chessTurn === 'w' ? 'White' : 'Black'} to move`,
      detail: canPlayChessTurn ? 'Select a piece to move' : `Waiting for ${players[chessTurnSeat]?.name || 'a player'}`,
      label: canPlayChessTurn ? 'Your move' : 'View board',
      icon: Gamepad2,
      disabled: false,
      danger: false,
    }
  } else if (session.status === 'playing') {
    mobileAction = {
      eyebrow: `${game} · Round ${round}`,
      detail: canControlRoom ? 'Keep the party moving' : 'The host controls rounds',
      label: canControlRoom ? 'Next round' : 'View game',
      icon: canControlRoom ? ArrowRight : Gamepad2,
      disabled: false,
      danger: false,
    }
  } else if (session.status === 'finished') {
    mobileAction = {
      eyebrow: 'Match finished',
      detail: winnerNames.length ? `${winnerNames.join(', ')} won` : 'See the final scores',
      label: canControlRoom ? 'Prepare rematch' : 'View results',
      icon: canControlRoom ? RefreshCw : Gamepad2,
      disabled: false,
      danger: false,
    }
  }

  function handleMobileAction() {
    if (session.status === 'lobby') {
      if (canControlRoom) startMatch()
      else toggleReady()
      return
    }

    if (session.status === 'finished') {
      if (canControlRoom) prepareRematch()
      else scrollToRoomSection('players')
      return
    }

    if (game === 'Ludo' && canPlayLudoTurn && room.ludo?.gameState === 'playerHasToRollADice') {
      rollLudoDice()
      return
    }

    if (promptRoomGames.includes(game) && canControlRoom) {
      nextRound()
      return
    }

    scrollToRoomSection('game')
  }

  const MobileActionIcon = mobileAction.icon

  return (
    <ToolPage>
      <section className="game-room">
        <button
          className="mobile-room-info-toggle"
          type="button"
          aria-expanded={mobileRoomInfoOpen}
          aria-controls="room-info-details"
          onClick={() => setMobileRoomInfoOpen((open) => !open)}
        >
          <span>
            <small>Room details</small>
            <strong>{roomCode} · {livePlayerLabel} · {modeLabel}</strong>
          </span>
          {mobileRoomInfoOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
        </button>

        <div
          id="room-info-details"
          className={`room-info-details ${mobileRoomInfoOpen ? 'open' : ''}`}
        >
          <div className="room-hero">
          <div>
            <span className="mini-label">Common room</span>
            <h2>The Party Board</h2>
            <p>Ready up, chat live, keep score, and run party prompts or proper board games together.</p>
            <div className={`sync-panel ${syncTone}`}>
              <span className="sync-signal">
                <SyncIcon size={15} />
              </span>
              <div>
                <strong>{syncTitle}</strong>
                <small>{syncDetail}</small>
              </div>
              {canRetrySync && (
                <button type="button" onClick={retryRoomSync}>
                  <RefreshCw size={14} />
                  Retry
                </button>
              )}
            </div>
          </div>
          <div className="room-code-card">
            <span>Room Code</span>
            <strong>{roomCode}</strong>
            <div className={`room-expiry-row ${roomExpired ? 'expired' : ''}`}>
              <span>{roomExpired ? 'Expired room' : 'Cleanup timer'}</span>
              <b>{expiryLabel}</b>
              {canControlRoom && (
                <button className="mini-action-button" type="button" onClick={extendRoomExpiry}>
                  <RefreshCw size={14} />
                  Extend
                </button>
              )}
            </div>
            <div className={`room-lock-row ${room.locked ? 'locked' : ''}`}>
              <span>{room.locked ? 'Locked room' : 'Open room'}</span>
              <b>
                {pendingRequests.length
                  ? `${pendingRequests.length} pending`
                  : room.locked ? 'Requests required' : 'Code can join'}
              </b>
              {canControlRoom && (
                <button className="mini-action-button" type="button" onClick={toggleRoomLock}>
                  <LockKeyhole size={14} />
                  {room.locked ? 'Unlock' : 'Lock'}
                </button>
              )}
            </div>
            <div className="button-row">
              <button type="button" onClick={copyInvite}>
                <Copy size={17} />
                {copied ? 'Copied Link' : 'Copy Invite'}
              </button>
              <button type="button" onClick={shareInvite}>
                <Share2 size={17} />
                Share
              </button>
              <button className={qrOpen ? 'secondary-button active' : 'secondary-button'} type="button" onClick={toggleInviteQr}>
                <QrCode size={17} />
                QR
              </button>
              <button
                className={roomJoinOpen ? 'secondary-button active' : 'secondary-button'}
                type="button"
                aria-expanded={roomJoinOpen}
                aria-controls="room-code-join-form"
                onClick={() => {
                  setRoomJoinOpen((open) => !open)
                  setRoomJoinError('')
                }}
              >
                <ArrowRight size={17} />
                Join Room
              </button>
              <button className="secondary-button" type="button" onClick={startNewRoom}>
                <Plus size={17} />
                New Room
              </button>
              <button className="secondary-button" type="button" onClick={() => setExitPromptOpen(true)}>
                <DoorOpen size={17} />
                Leave
              </button>
            </div>
            {roomJoinOpen && (
              <form id="room-code-join-form" className="room-code-join-form" onSubmit={joinRoomByCode}>
                <label htmlFor="room-code-join-input">Join another room</label>
                <div className="room-code-join-controls">
                  <input
                    id="room-code-join-input"
                    autoFocus
                    inputMode="text"
                    maxLength="6"
                    value={roomJoinCode}
                    onChange={(event) => {
                      setRoomJoinCode(sanitizeRoomCode(event.target.value))
                      setRoomJoinError('')
                    }}
                    placeholder="ABC123"
                    aria-invalid={Boolean(roomJoinError)}
                    aria-describedby="room-code-join-help"
                  />
                  <button type="submit" disabled={roomJoinCode.length < 4 || syncStatus === 'Saving'}>
                    <ArrowRight size={16} />
                    Join
                  </button>
                </div>
                <small id="room-code-join-help" className={roomJoinError ? 'error' : ''}>
                  {roomJoinError || 'Enter the 4–6 character code shared by the host.'}
                </small>
              </form>
            )}
            {(shareStatus || qrOpen) && (
              <div className="invite-share-panel">
                {shareStatus && <small>{shareStatus}</small>}
                {qrOpen && qrDataUrl && (
                  <img src={qrDataUrl} alt={`Invite QR for room ${roomCode}`} />
                )}
              </div>
            )}
          </div>
          </div>

          <div className="room-overview-strip" aria-label="Room status">
            <div className="room-overview-item">
              <span>Host</span>
              <strong>{hostLabel}</strong>
            </div>
            <div className="room-overview-item">
              <span>Players</span>
              <strong>{livePlayerLabel}</strong>
            </div>
            <div className="room-overview-item">
              <span>Ready</span>
              <strong>{readyLabel}</strong>
            </div>
            <div className="room-overview-item">
              <span>Access</span>
              <strong>{accessLabel}</strong>
            </div>
            <div className="room-overview-item accent">
              <span>Game</span>
              <strong>{modeLabel}</strong>
            </div>
          </div>

          <RoomStartChecklist items={roomGuideItems} />
        </div>

        {exitPromptOpen && (
          <RoomExitSheet
            exitMessage={exitMessage}
            exitReason={exitReason}
            exitStatus={exitStatus}
            exitSubmitting={exitSubmitting}
            onClose={() => setExitPromptOpen(false)}
            onMessageChange={setExitMessage}
            onReasonChange={setExitReason}
            onSkip={skipExitReason}
            onSubmit={submitExitReason}
          />
        )}

        <nav className="mobile-room-nav" aria-label="Room sections">
          <a
            className={mobileSection === 'game' ? 'active' : ''}
            href="#room-game"
            aria-current={mobileSection === 'game' ? 'page' : undefined}
            onClick={() => setMobileSection('game')}
          >
            <Gamepad2 size={15} />
            Game
          </a>
          <a
            className={mobileSection === 'players' ? 'active' : ''}
            href="#room-players"
            aria-current={mobileSection === 'players' ? 'page' : undefined}
            onClick={() => setMobileSection('players')}
          >
            <UserRound size={15} />
            Players
          </a>
          <a
            className={mobileSection === 'chat' ? 'active' : ''}
            href="#room-chat"
            aria-current={mobileSection === 'chat' ? 'page' : undefined}
            onClick={() => setMobileSection('chat')}
          >
            <MessageCircle size={15} />
            Chat
          </a>
        </nav>

        <SessionControls
          allReady={allReady}
          currentPlayer={players[currentPlayer.id]}
          isHost={canControlRoom}
          playerCount={activePlayerEntries.length}
          readyCount={readyCount}
          session={session}
          winnerNames={winnerNames}
          onEnd={endMatch}
          onRematch={prepareRematch}
          onStart={startMatch}
          onToggleReady={toggleReady}
        />

        <VoiceChannel
          authUser={authUser}
          currentPlayer={currentPlayer}
          roomCode={roomCode}
        />

        <div className="room-layout">
          <PlayerRoster
            currentPlayerId={currentPlayer.id}
            hostId={room.hostId}
            isHost={canControlRoom}
            panelId="room-players"
            playerEntries={playerEntries}
            presenceNow={presenceNow}
            presenceTimeoutMs={playerPresenceTimeoutMs}
            pendingRequests={pendingRequests}
            session={session}
            onAdjustScore={adjustScore}
            onAcceptRequest={acceptJoinRequest}
            onEditProfile={editPlayer}
            onKickPlayer={kickPlayer}
            onRejectRequest={rejectJoinRequest}
            onTransferHost={transferHost}
          />

          <section className={`round-board ${boardFullscreen ? 'board-fullscreen' : ''}`} id="room-game">
            {(game === 'Chess' || game === 'Ludo') && (
              <div className="mobile-board-tools">
                <button
                  type="button"
                  aria-pressed={boardFullscreen}
                  onClick={() => setBoardFullscreen((open) => !open)}
                >
                  {boardFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                  {boardFullscreen ? 'Exit full screen' : 'Full-screen board'}
                </button>
              </div>
            )}
            <div className="room-tabs" aria-label="Game room games">
              {roomGames.map((option) => (
                <button
                  className={game === option ? 'active' : ''}
                  type="button"
                  key={option}
                  disabled={!canControlRoom || session.status === 'playing'}
                  onClick={() => changeGame(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {game === 'Chess' && room.chess && (
              <ChessGame
                chessState={room.chess}
                currentPlayerId={currentPlayer.id}
                hostId={room.hostId}
                players={players}
                canReset={canControlRoom && session.status !== 'playing'}
                matchActive={session.status === 'playing'}
                onClaimSeat={claimChessSeat}
                onMove={moveChess}
                onReset={resetChess}
              />
            )}
            {game === 'Ludo' && room.ludo && (
              <LudoGame
                currentPlayerId={currentPlayer.id}
                hostId={room.hostId}
                ludoState={room.ludo}
                players={players}
                canReset={canControlRoom && session.status !== 'playing'}
                matchActive={session.status === 'playing'}
                onClaimSeat={claimLudoSeat}
                onMoveToken={moveLudoToken}
                onReset={resetLudo}
                onRoll={rollLudoDice}
              />
            )}
            {promptRoomGames.includes(game) && (
              <div className="round-card">
                <div className="date-topline">
                  <span className="mini-label">Round {round}</span>
                  <strong>{game}</strong>
                </div>
                <h3>{prompt}</h3>
                <p>Read this out loud. Everyone answers, votes, argues, laughs, then the host hits next round.</p>
                <div className="reaction-row">
                  <button type="button" disabled={session.status !== 'playing'} onClick={() => addReaction('laughs')}>
                    <Laugh size={16} />
                    Laughs {reactions.laughs}
                  </button>
                  <button type="button" disabled={session.status !== 'playing'} onClick={() => addReaction('chaos')}>
                    <Zap size={16} />
                    Chaos {reactions.chaos}
                  </button>
                  <button type="button" disabled={session.status !== 'playing'} onClick={() => addReaction('skip')}>
                    Skip {reactions.skip}
                  </button>
                </div>
                <button type="button" disabled={!canControlRoom || session.status !== 'playing'} onClick={nextRound}>
                  <ArrowRight size={17} />
                  {session.status !== 'playing' ? 'Start match to play' : canControlRoom ? 'Next Round' : 'Waiting for Host'}
                </button>
              </div>
            )}
          </section>

          <RoomSocialPanel
            currentPlayerId={currentPlayer.id}
            history={history}
            messages={messages}
            panelId="room-chat"
            players={players}
            onSendMessage={sendChatMessage}
          />
        </div>

        <div
          className={`mobile-game-action ${boardFullscreen ? 'board-open' : ''}`}
          role="region"
          aria-label="Current game action"
        >
          <div>
            <small>{mobileAction.eyebrow}</small>
            <strong>{mobileAction.detail}</strong>
          </div>
          <button
            className={mobileAction.danger ? 'danger' : ''}
            type="button"
            disabled={mobileAction.disabled}
            onClick={handleMobileAction}
          >
            <MobileActionIcon size={17} />
            {mobileAction.label}
          </button>
        </div>
      </section>
    </ToolPage>
  )
}

export default GameRoom

