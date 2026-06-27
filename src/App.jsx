import { useEffect, useState } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { Chess } from 'chess.js'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import {
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Dice5,
  Gamepad2,
  HeartPulse,
  Home as HomeIcon,
  Laugh,
  LockKeyhole,
  Menu,
  MessageCircleHeart,
  PartyPopper,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import './App.css'
import './polish.css'
import { avatarPresets } from './avatars'
import { ChessGame, LudoGame } from './BoardGames'
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

const girlfriendStatuses = [
  {
    label: 'Stable',
    value: 84,
    note: 'Safe zone. Random compliments still recommended.',
    action: 'Send a cute selfie and keep the peace treaty active.',
  },
  {
    label: 'Needs snacks',
    value: 58,
    note: 'Deploy chocolate, fries, or emotional support momos.',
    action: 'Ask what she wants to eat. Do not guess with confidence.',
  },
  {
    label: 'Suspiciously quiet',
    value: 34,
    note: 'Proceed gently. Ask what happened, then actually listen.',
    action: 'Reduce jokes by 70 percent and increase attention immediately.',
  },
  {
    label: 'Send compliment immediately',
    value: 18,
    note: 'Critical. Use sweet words before making jokes.',
    action: 'Compliment first, explanation later. This is not a drill.',
  },
]

const friends = [
  {
    name: 'Best Friend',
    title: 'Certified chaos partner',
    stats: [
      ['Loyalty', 92],
      ['Roast Power', 88],
      ['Borrowed Money Risk', 47],
      ['Will Reply on Time', 3],
    ],
  },
  {
    name: 'College Friend',
    title: 'Assignment survivor',
    stats: [
      ['Loyalty', 79],
      ['Roast Power', 95],
      ['Borrowed Money Risk', 62],
      ['Will Reply on Time', 18],
    ],
  },
  {
    name: 'Gaming Friend',
    title: 'Online but unavailable',
    stats: [
      ['Loyalty', 86],
      ['Roast Power', 74],
      ['Borrowed Money Risk', 29],
      ['Will Reply on Time', 7],
    ],
  },
]

const apologies = [
  'Sorry, my brain was buffering. I will now behave like a premium boyfriend.',
  'I apologize with full battery, strong network, and zero attitude.',
  'My mistake has been reported to management. Management is me, and I am sorry.',
  'I was wrong, you were right, and my ego has left the chat.',
  'Sorry for acting like a beta version. I am ready for the stable release.',
]

const compliments = [
  'You are the main character, and somehow you still make everyone else look good.',
  'Your smile has better uptime than my internet.',
  'You look like peace, drama, and cuteness signed one partnership deal.',
  'You are my favorite notification.',
  'You have premium-person energy with lifetime validity.',
]

const friendCompliments = [
  'You are annoying, but in a limited edition way.',
  'Your bad ideas somehow create the best memories.',
  'You are the reason simple plans become legendary stories.',
  'Your confidence is inspiring for someone with that playlist.',
  'You are basically family, but with better roast material.',
]

const datePlans = [
  {
    title: 'Street Food Mission',
    budget: 'Medium',
    vibe: 'Laughing while standing near a crowded stall',
    steps: ['Pick one snack each', 'Share one drink', 'Rate everything like serious judges'],
  },
  {
    title: 'Movie Night Treaty',
    budget: 'Low',
    vibe: 'Blanket, snacks, and no judging the movie choice',
    steps: ['Choose comfort movie', 'Overbuy snacks', 'Pause only for important commentary'],
  },
  {
    title: 'Walk + Ice Cream',
    budget: 'Low',
    vibe: 'Soft, simple, secretly perfect',
    steps: ['Take the long route', 'Buy ice cream', 'Pretend the walk was fitness'],
  },
  {
    title: 'Do Nothing Professionally',
    budget: 'Free',
    vibe: 'High quality laziness with emotional benefits',
    steps: ['Sit together', 'Scroll reels', 'Call it bonding research'],
  },
  {
    title: 'Photo Booth Challenge',
    budget: 'Medium',
    vibe: 'Cute photos, questionable poses, permanent evidence',
    steps: ['Find good light', 'Take ten photos', 'Keep the blurry funny one'],
  },
]

const emergencyPlans = {
  Angry: {
    danger: 91,
    opener: 'I understand. I am listening properly now.',
    steps: ['Say sorry without adding a lecture', 'Ask what hurt her', 'Fix one small thing immediately'],
  },
  Sad: {
    danger: 42,
    opener: 'I am here. You do not have to explain everything right now.',
    steps: ['Be soft', 'Offer food or a call', 'Send reassurance twice, not advice ten times'],
  },
  Nothing: {
    danger: 78,
    opener: 'Nothing sounds like something. I am ready when you are.',
    steps: ['Do not celebrate too early', 'Stay available', 'Avoid detective mode unless invited'],
  },
  Food: {
    danger: 64,
    opener: 'Food department is active. Send cravings.',
    steps: ['Ask sweet or spicy', 'Offer two choices', 'Do not say "anything is fine"'],
  },
}

const funBursts = [
  'Snack protocol activated',
  'Drama shield overloaded',
  'Compliment cannon misfired beautifully',
  'Friendship server boosted beyond warranty',
  'Date night probability is now unreasonable',
  'Emergency cuteness detected',
  'Reply speed entered mystery mode',
  'Apology generator requesting emotional backup',
]

const chaosAlerts = [
  'Warning: girlfriend happiness meter has started judging your playlist.',
  'System notice: one friend is online and still not replying.',
  'Alert: snacks are below legally acceptable levels.',
  'Romance engine found 3 unsent compliments in drafts.',
  'Friendship tracker reports suspicious roasting activity.',
]

const missions = [
  {
    title: 'Send a no-context compliment',
    target: 'Girlfriend',
    reward: '+18 happiness points',
    detail: 'Make it specific enough that it cannot be mistaken for a copied line.',
  },
  {
    title: 'Plan a five-minute call',
    target: 'Girlfriend',
    reward: '+1 peace treaty',
    detail: 'The mission succeeds if both people smile before ending the call.',
  },
  {
    title: 'Roast a friend gently',
    target: 'Friends',
    reward: '+12 loyalty damage',
    detail: 'Keep it funny, not personal. Friendship law is watching.',
  },
  {
    title: 'Send the funniest old photo',
    target: 'Friends',
    reward: '+30 memory points',
    detail: 'Bonus points if everyone denies that phase ever happened.',
  },
  {
    title: 'Make a tiny date plan',
    target: 'Girlfriend',
    reward: '+22 romance XP',
    detail: 'One food item, one place, one backup plan. Very official.',
  },
]

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
const playerPresenceTimeoutMs = 2 * 60 * 1000
const roomLifetimeMs = 24 * 60 * 60 * 1000
const roomSchemaVersion = 2
const gameStateDocId = 'current'
const gameStateKeys = ['game', 'prompt', 'round', 'reactions', 'session', 'chess', 'ludo']
const roomMetadataKeys = ['roomCode', 'hostId', 'expiresAt', 'resetAt', 'kickedPlayers', 'locked']

const pages = [
  {
    path: '/girlfriend-meter',
    title: 'Girlfriend Happiness Meter',
    description: 'A very official mood detector with zero scientific backing.',
    accent: 'meter',
    icon: HeartPulse,
  },
  {
    path: '/friendship-tracker',
    title: 'Friendship Level Tracker',
    description: 'Fake stats for real friends with suspicious reply times.',
    accent: 'friends',
    icon: BarChart3,
  },
  {
    path: '/apology-generator',
    title: 'Apology Generator',
    description: 'Emergency sorry messages for emotional damage control.',
    accent: 'apology',
    icon: MessageCircleHeart,
  },
  {
    path: '/compliment-generator',
    title: 'Compliment Generator',
    description: 'Sweet lines for girlfriend mode and friendship mode.',
    accent: 'compliment',
    icon: Sparkles,
  },
  {
    path: '/date-spinner',
    title: 'Date Plan Spinner',
    description: 'Random cute plans for when both of you say "you decide."',
    accent: 'date',
    icon: Dice5,
  },
  {
    path: '/emergency-kit',
    title: 'Girlfriend Emergency Kit',
    description: 'Fake survival plans for very real relationship weather.',
    accent: 'emergency',
    icon: ShieldAlert,
  },
  {
    path: '/secret',
    title: 'Secret Page',
    description: 'A tiny hidden corner for one cute message.',
    accent: 'secret',
    icon: LockKeyhole,
  },
  {
    path: '/mission-wheel',
    title: 'Mission Wheel',
    description: 'Spin for one tiny chaotic task to complete today.',
    accent: 'mission',
    icon: Target,
  },
  {
    path: '/play-room',
    title: 'Play Room',
    description: 'Three quick party games for friends on one screen.',
    accent: 'play',
    icon: PartyPopper,
  },
  {
    path: '/game-room',
    title: 'Game Room',
    description: 'Create a live party room with chat, scores, Chess, and Ludo.',
    accent: 'room',
    icon: Gamepad2,
  },
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
  if (code === 'permission-denied' || message.toLowerCase().includes('missing or insufficient permissions')) {
    return 'Firebase rules are blocking this room. Open Firebase Console > Firestore Database > Rules and publish the rules from firestore.rules.'
  }
  if (message.toLowerCase().includes('client is offline')) {
    return 'Firestore is unreachable. Check that the database exists and your Firebase .env values match this project.'
  }
  return message
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

function createInitialSession() {
  return {
    status: 'lobby',
    matchId: '',
    game: '',
    scores: {},
    winnerIds: [],
    startedAt: 0,
    endedAt: 0,
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
  return [...(messages || []), ...nextMessages.map(normalizeMessage)].slice(-chatMessageLimit)
}

function appendHistory(history, ...nextMatches) {
  return [...(history || []), ...nextMatches.map(normalizeMatch)].slice(-matchHistoryLimit)
}

function normalizeTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value?.toMillis) return value.toMillis()
  return Number(value) || 0
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

function normalizePlayer(player = {}) {
  return {
    uid: player.uid || '',
    name: player.name || 'Player',
    avatar: player.avatar || avatarPresets[0].id,
    ready: Boolean(player.ready),
    points: Number(player.points) || 0,
    joinedAt: normalizeTime(player.joinedAt),
    lastSeen: normalizeTime(player.lastSeen),
    lastSeenAt: normalizeTime(player.lastSeenAt),
  }
}

function normalizePlayers(players) {
  if (Array.isArray(players) || !players || typeof players !== 'object') return {}

  return Object.fromEntries(
    Object.entries(players).map(([playerId, player]) => [playerId, normalizePlayer(player)]),
  )
}

function normalizePlayerPatch(playerPatch = {}) {
  const nextPatch = {}

  if ('name' in playerPatch) nextPatch.name = playerPatch.name || 'Player'
  if ('uid' in playerPatch) nextPatch.uid = playerPatch.uid || ''
  if ('avatar' in playerPatch) nextPatch.avatar = playerPatch.avatar || avatarPresets[0].id
  if ('ready' in playerPatch) nextPatch.ready = Boolean(playerPatch.ready)
  if ('points' in playerPatch) nextPatch.points = Number(playerPatch.points) || 0
  if ('joinedAt' in playerPatch) nextPatch.joinedAt = normalizeTime(playerPatch.joinedAt)
  if ('lastSeen' in playerPatch) nextPatch.lastSeen = normalizeTime(playerPatch.lastSeen)
  if ('lastSeenAt' in playerPatch) nextPatch.lastSeenAt = normalizeTime(playerPatch.lastSeenAt)

  return nextPatch
}

function isPlayerActive(player, now = Date.now()) {
  return Boolean(player?.lastSeen) && now - (player.lastSeen || 0) < playerPresenceTimeoutMs
}

function isPlayerActiveForMaintenance(playerId, player, now, keepPlayerId = '') {
  return playerId === keepPlayerId || isPlayerActive(player, now)
}

function chooseNextHostId(players, currentHostId = '', now = Date.now(), keepPlayerId = '', preferredHostId = '') {
  if (
    currentHostId
    && players[currentHostId]
    && isPlayerActiveForMaintenance(currentHostId, players[currentHostId], now, keepPlayerId)
  ) {
    return currentHostId
  }

  if (
    preferredHostId
    && players[preferredHostId]
    && isPlayerActiveForMaintenance(preferredHostId, players[preferredHostId], now, keepPlayerId)
  ) {
    return preferredHostId
  }

  return Object.entries(players)
    .filter(([playerId, player]) => isPlayerActiveForMaintenance(playerId, player, now, keepPlayerId))
    .sort(([, firstPlayer], [, secondPlayer]) => (
      (firstPlayer.joinedAt || firstPlayer.lastSeen || 0)
      - (secondPlayer.joinedAt || secondPlayer.lastSeen || 0)
    ))[0]?.[0] || ''
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
    playerDeletes.forEach((playerId) => {
      delete nextRoom.players[playerId]
    })
  }
  if (playerPatches) nextRoom.players = mergePlayerPatches(nextRoom.players, playerPatches)
  if (roomPatch.joinRequests) nextRoom.joinRequests = normalizeJoinRequests(roomPatch.joinRequests)
  if (joinRequestDeletes.length) {
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

function writeRoomPatchToTransaction(transaction, roomCode, patch) {
  const roomRef = doc(db, 'rooms', roomCode)
  const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
  const roomPatch = pickFields(patch, roomMetadataKeys)
  const gameStatePatch = pickFields(patch, gameStateKeys)
  const nextExpiresAt = normalizeTime(patch.expiresAt) || createRoomExpiry()
  const ttl = ttlFields(nextExpiresAt)

  if (Object.keys(roomPatch).length > 0) {
    transaction.set(roomRef, {
      ...roomPatch,
      ...ttl,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  if (Object.keys(gameStatePatch).length > 0) {
    transaction.set(gameStateRef, {
      ...gameStatePatch,
      expireAt: ttl.expireAt,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  if (patch.players) {
    Object.entries(normalizePlayers(patch.players)).forEach(([playerId, player]) => {
      transaction.set(doc(db, 'rooms', roomCode, 'players', playerId), {
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
        transaction.set(doc(db, 'rooms', roomCode, 'players', playerId), {
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
      transaction.set(doc(db, 'rooms', roomCode, 'joinRequests', playerId), {
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
      transaction.set(doc(db, 'rooms', roomCode, 'joinRequests', playerId), {
        ...request,
        uid: request.uid || playerId,
        expireAt: ttl.expireAt,
      }, { merge: true })
    })
  }

  if (patch.joinRequestDeletes?.length) {
    patch.joinRequestDeletes.forEach((playerId) => {
      transaction.delete(doc(db, 'rooms', roomCode, 'joinRequests', playerId))
    })
  }

  if (patch.playerDeletes?.length) {
    patch.playerDeletes.forEach((playerId) => {
      transaction.delete(doc(db, 'rooms', roomCode, 'players', playerId))
    })
  }

  if (patch.messageCreates?.length) {
    patch.messageCreates.map(normalizeMessage).forEach((message) => {
      transaction.set(doc(db, 'rooms', roomCode, 'messages', message.id), {
        ...message,
        ...(!message.system ? { uid: message.uid || message.playerId } : {}),
        expireAt: ttl.expireAt,
      })
    })
  }

  if (patch.historyCreates?.length) {
    patch.historyCreates.map(normalizeMatch).forEach((match) => {
      transaction.set(doc(db, 'rooms', roomCode, 'history', match.id), {
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

function removePlayerFromSeats(seats, playerId) {
  return Object.fromEntries(
    Object.entries(seats || {}).map(([seat, seatPlayerId]) => [
      seat,
      seatPlayerId === playerId ? '' : seatPlayerId,
    ]),
  )
}

function removePlayerFromScores(scores, playerId) {
  const nextScores = { ...(scores || {}) }
  delete nextScores[playerId]
  return nextScores
}

function removePlayersFromRoomPatch(room, playerIds) {
  const uniquePlayerIds = [...new Set(playerIds.filter(Boolean))]
  if (uniquePlayerIds.length === 0) return {}

  const nextScores = uniquePlayerIds.reduce(
    (scores, playerId) => removePlayerFromScores(scores, playerId),
    room.session.scores,
  )
  const patch = {
    playerDeletes: uniquePlayerIds,
    session: {
      ...room.session,
      scores: nextScores,
      winnerIds: room.session.winnerIds.filter((winnerId) => !uniquePlayerIds.includes(winnerId)),
    },
  }

  if (room.chess) {
    patch.chess = {
      ...room.chess,
      seats: uniquePlayerIds.reduce(
        (seats, playerId) => removePlayerFromSeats(seats, playerId),
        room.chess.seats,
      ),
    }
  }

  if (room.ludo) {
    patch.ludo = {
      ...room.ludo,
      seats: uniquePlayerIds.reduce(
        (seats, playerId) => removePlayerFromSeats(seats, playerId),
        room.ludo.seats,
      ),
    }
  }

  return patch
}

function createRoomMaintenancePatch(room, now = Date.now(), options = {}) {
  const {
    keepPlayerId = '',
    preferredHostId = '',
  } = options
  const players = normalizePlayers(room.players)
  const stalePlayerIds = Object.entries(players)
    .filter(([playerId, player]) => playerId !== keepPlayerId && !isPlayerActive(player, now))
    .map(([playerId]) => playerId)
  const remainingPlayers = { ...players }
  stalePlayerIds.forEach((playerId) => {
    delete remainingPlayers[playerId]
  })
  const nextHostId = chooseNextHostId(
    remainingPlayers,
    room.hostId,
    now,
    keepPlayerId,
    preferredHostId,
  )
  const patch = removePlayersFromRoomPatch(room, stalePlayerIds)

  if (nextHostId !== room.hostId) {
    patch.hostId = nextHostId
  }

  return patch
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="girlfriend-meter" element={<GirlfriendMeter />} />
        <Route path="friendship-tracker" element={<FriendshipTracker />} />
        <Route path="apology-generator" element={<ApologyGenerator />} />
        <Route path="compliment-generator" element={<ComplimentGenerator />} />
        <Route path="date-spinner" element={<DateSpinner />} />
        <Route path="emergency-kit" element={<EmergencyKit />} />
        <Route path="secret" element={<SecretPage />} />
        <Route path="mission-wheel" element={<MissionWheel />} />
        <Route path="play-room" element={<PlayRoom />} />
        <Route path="game-room" element={<GameRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [funMode, setFunMode] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [burst, setBurst] = useState(funBursts[0])
  const [alert, setAlert] = useState(chaosAlerts[0])
  const currentPage = pages.find((page) => page.path === location.pathname)
  const relationshipPages = pages.slice(0, 8)
  const playPages = pages.slice(8)

  function toggleFunMode() {
    setFunMode(!funMode)
    setBurst(randomItem(funBursts, burst))
    setAlert(randomItem(chaosAlerts, alert))
  }

  return (
    <main className={`app-shell ${funMode ? 'fun-mode' : ''}`}>
      <FloatingStickers />
      <button
        className={`sidebar-scrim ${navOpen ? 'visible' : ''}`}
        type="button"
        aria-label="Close navigation"
        onClick={() => setNavOpen(false)}
      />
      <aside className={`app-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link className="brand" to="/" onClick={() => setNavOpen(false)}>
            <span className="brand-mark"><Sparkles size={19} /></span>
            <span>
              <strong>Just For Fun</strong>
              <small>Relationship HQ</small>
            </span>
          </Link>
          <button className="icon-button sidebar-close" type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)}>
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main pages">
          <NavLink end to="/" onClick={() => setNavOpen(false)}>
            <HomeIcon size={18} />
            <span>Overview</span>
          </NavLink>
          <span className="nav-section-label">Relationship tools</span>
          {relationshipPages.map((page) => {
            const Icon = page.icon
            return (
              <NavLink key={page.path} to={page.path} onClick={() => setNavOpen(false)}>
                <Icon size={18} />
                <span>{page.title.replace(' Generator', '').replace(' Tracker', '')}</span>
              </NavLink>
            )
          })}
          <span className="nav-section-label">Play together</span>
          {playPages.map((page) => {
            const Icon = page.icon
            return (
              <NavLink key={page.path} to={page.path} onClick={() => setNavOpen(false)}>
                <Icon size={18} />
                <span>{page.title}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot" />
            <div>
              <strong>HQ operational</strong>
              <small>All systems unserious</small>
            </div>
          </div>
          <button className={`chaos-control ${funMode ? 'active' : ''}`} type="button" onClick={toggleFunMode}>
            <Zap size={17} />
            <span>{funMode ? 'Chaos enabled' : 'Enable chaos'}</span>
          </button>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="workspace-bar">
          <div className="workspace-context">
            <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <span>{isHome ? 'Workspace' : currentPage?.accent === 'play' || currentPage?.accent === 'room' ? 'Play together' : 'Relationship tools'}</span>
              <strong>{isHome ? 'Overview' : currentPageTitle(location.pathname)}</strong>
            </div>
          </div>
          <button className={`header-chaos ${funMode ? 'active' : ''}`} type="button" onClick={toggleFunMode}>
            <Zap size={16} />
            <span>{funMode ? 'Chaos on' : 'Chaos mode'}</span>
          </button>
        </header>

        {funMode && (
          <div className="chaos-alert" aria-live="polite">
            <Zap size={17} />
            <span>{alert}</span>
          </div>
        )}
        <button
          className="burst-badge"
          type="button"
          onClick={() => {
            setBurst(randomItem(funBursts, burst))
            setAlert(randomItem(chaosAlerts, alert))
          }}
        >
          <Sparkles size={15} />
          <span>{burst}</span>
        </button>

        <section className={isHome ? 'hero home-hero' : 'hero compact-hero'}>
          <div>
            <p className="eyebrow">{isHome ? 'Relationship control room' : currentPage?.title}</p>
            <h1>{isHome ? 'Your shared fun dashboard' : currentPageTitle(location.pathname)}</h1>
            <p>
              {isHome
                ? 'Quick tools, group games, and delightfully unnecessary relationship analytics in one place.'
                : currentPageDescription(location.pathname)}
            </p>
          </div>
          {isHome && <HeroPreview />}
        </section>
        {isHome && <ChaosConsole active={funMode} />}

        <Outlet />
      </div>
    </main>
  )
}

function FloatingStickers() {
  return (
    <div className="floating-stickers" aria-hidden="true">
      <span>LOL</span>
      <span>BRB</span>
      <span>VIP</span>
      <span>100%</span>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="quick-stats" aria-label="Fake dashboard stats">
        <div>
          <span className="stat-icon danger"><Activity size={18} /></span>
          <span>Drama risk</span>
          <strong>12%</strong>
        </div>
        <div>
          <span className="stat-icon success"><Check size={18} /></span>
          <span>Snack readiness</span>
          <strong>98%</strong>
        </div>
        <div>
          <span className="stat-icon info"><Zap size={18} /></span>
          <span>Reply speed</span>
          <strong>Maybe</strong>
        </div>
      </section>

      <div className="page-grid">
        {pages.map((page) => {
          const Icon = page.icon
          return (
          <Link className={`feature-card ${page.accent}`} key={page.path} to={page.path}>
            <div className="feature-topline">
              <span className="feature-number"><Icon size={20} /></span>
              <ChevronRight size={19} />
            </div>
            <span>{page.title}</span>
            <p>{page.description}</p>
          </Link>
          )
        })}
      </div>
    </>
  )
}

function ChaosConsole({ active }) {
  const consoleItems = active
    ? ['Compliment cannon: unstable', 'Snack radar: screaming', 'Friend reply estimate: fictional']
    : ['Compliment cannon: ready', 'Snack radar: calm', 'Friend reply estimate: optimistic']

  return (
    <section className={`chaos-console ${active ? 'active' : ''}`} aria-label="Chaos console">
      <div>
        <span className="mini-label">{active ? 'Chaos console live' : 'Chaos console idle'}</span>
        <h2>{active ? 'Everything is under absolutely fake control' : 'Press Chaos Mode when life is too peaceful'}</h2>
      </div>
      <div className="console-list">
        {consoleItems.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  )
}

function HeroPreview() {
  return (
    <aside className="hero-preview" aria-label="Dashboard preview">
      <div className="preview-header">
        <span>Live snapshot</span>
        <strong><span className="status-dot" /> HQ online</strong>
      </div>
      <div className="preview-meter">
        <div />
      </div>
      <div className="preview-grid">
        <div>
          <span><Sparkles size={14} /> Compliments</span>
          <strong>Ready</strong>
        </div>
        <div>
          <span><MessageCircleHeart size={14} /> Apology</span>
          <strong>Armed</strong>
        </div>
      </div>
      <p>Official status: snacks advised, jokes approved, drama contained.</p>
    </aside>
  )
}

function GirlfriendMeter() {
  const [statusIndex, setStatusIndex] = useState(0)
  const status = girlfriendStatuses[statusIndex]

  return (
    <ToolPage>
      <div className="meter-panel">
        <div className="meter-shell" aria-label={`Happiness level ${status.value} percent`}>
          <div className="meter-fill" style={{ width: `${status.value}%` }} />
        </div>
        <div className="status-row">
          <div>
            <span className="mini-label">Current status</span>
            <h2>{status.label}</h2>
          </div>
          <strong>{status.value}%</strong>
        </div>
        <p>{status.note}</p>
        <div className="next-action">
          <span className="mini-label">Recommended move</span>
          <p>{status.action}</p>
        </div>
        <div className="button-row">
          <button type="button" onClick={() => setStatusIndex((statusIndex + 1) % girlfriendStatuses.length)}>
            <RefreshCw size={17} />
            Scan again
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setStatusIndex(Math.floor(Math.random() * girlfriendStatuses.length))}
          >
            <Dice5 size={17} />
            Random mood
          </button>
        </div>
      </div>
    </ToolPage>
  )
}

function FriendshipTracker() {
  const [boostedFriend, setBoostedFriend] = useState('')

  return (
    <ToolPage>
      <div className="friend-list">
        {friends.map((friend) => (
          <article className={`friend-card ${boostedFriend === friend.name ? 'boosted' : ''}`} key={friend.name}>
            <div>
              <h2>{friend.name}</h2>
              <p>{friend.title}</p>
            </div>
            <div className="stat-list">
              {friend.stats.map(([label, value]) => (
                <div className="stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}%</strong>
                  <div className="stat-track">
                    <div style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setBoostedFriend(friend.name)}>
              <Zap size={17} />
              Boost loyalty
            </button>
          </article>
        ))}
      </div>
    </ToolPage>
  )
}

function ApologyGenerator() {
  const [apology, setApology] = useState(apologies[0])

  return (
    <GeneratorPage
      label="Emergency message"
      text={apology}
      buttonText="Generate Sorry"
      onGenerate={() => setApology(randomItem(apologies, apology))}
    />
  )
}

function DateSpinner() {
  const [plan, setPlan] = useState(datePlans[0])

  return (
    <ToolPage>
      <section className="date-card">
        <div className="date-topline">
          <span className="mini-label">Tonight's official plan</span>
          <strong>{plan.budget} budget</strong>
        </div>
        <h2>{plan.title}</h2>
        <p>{plan.vibe}</p>
        <ol>
          {plan.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button type="button" onClick={() => setPlan(randomItem(datePlans, plan))}>
          <Dice5 size={17} />
          Spin plan
        </button>
      </section>
    </ToolPage>
  )
}

function EmergencyKit() {
  const [selected, setSelected] = useState('Angry')
  const plan = emergencyPlans[selected]

  return (
    <ToolPage>
      <div className="emergency-grid">
        <div className="emergency-options" aria-label="Emergency type">
          {Object.keys(emergencyPlans).map((option) => (
            <button
              className={selected === option ? 'active' : ''}
              type="button"
              key={option}
              onClick={() => setSelected(option)}
            >
              {option === 'Nothing' ? 'She said nothing' : `She is ${option.toLowerCase()}`}
            </button>
          ))}
        </div>
        <section className="emergency-card">
          <div className="status-row">
            <div>
              <span className="mini-label">Risk level</span>
              <h2>{selected}</h2>
            </div>
            <strong>{plan.danger}%</strong>
          </div>
          <p className="opener">"{plan.opener}"</p>
          <div className="meter-shell" aria-label={`Risk level ${plan.danger} percent`}>
            <div className="meter-fill danger-fill" style={{ width: `${plan.danger}%` }} />
          </div>
          <ol>
            {plan.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </ToolPage>
  )
}

function SecretPage() {
  const [unlocked, setUnlocked] = useState(false)

  return (
    <ToolPage>
      <section className={`secret-card ${unlocked ? 'unlocked' : ''}`}>
        <span className="mini-label">Secret corner</span>
        <h2>{unlocked ? 'You found the soft launch of my heart' : 'Locked for VIP only'}</h2>
        <p>
          {unlocked
            ? 'This website is silly, but the smile it is trying to create is very serious.'
            : 'Press the button if you are girlfriend, best friend, or officially allowed to know too much.'}
        </p>
        <button type="button" onClick={() => setUnlocked(!unlocked)}>
          {unlocked ? <RotateCcw size={17} /> : <LockKeyhole size={17} />}
          {unlocked ? 'Lock again' : 'Unlock secret'}
        </button>
      </section>
    </ToolPage>
  )
}

function MissionWheel() {
  const [mission, setMission] = useState(missions[0])
  const [completed, setCompleted] = useState(false)

  function spinMission() {
    setMission(randomItem(missions, mission))
    setCompleted(false)
  }

  return (
    <ToolPage>
      <section className={`mission-card ${completed ? 'completed' : ''}`}>
        <div className="date-topline">
          <span className="mini-label">Tiny mission</span>
          <strong>{mission.target}</strong>
        </div>
        <h2>{mission.title}</h2>
        <p>{mission.detail}</p>
        <div className="reward-box">
          <span className="mini-label">Reward</span>
          <p>{completed ? 'Mission logged. You are now officially productive.' : mission.reward}</p>
        </div>
        <div className="button-row">
          <button type="button" onClick={spinMission}>
            <RefreshCw size={17} />
            Spin mission
          </button>
          <button className="secondary-button" type="button" onClick={() => setCompleted(!completed)}>
            {completed ? <RotateCcw size={17} /> : <Check size={17} />}
            {completed ? 'Undo done' : 'Mark done'}
          </button>
        </div>
      </section>
    </ToolPage>
  )
}

function PlayRoom() {
  const games = ['Truth or Dare', "Who's Most Likely To", 'Would You Rather']
  const [game, setGame] = useState(games[0])
  const [truthMode, setTruthMode] = useState('Truth')
  const [truthPrompt, setTruthPrompt] = useState(truthPrompts[0])
  const [darePrompt, setDarePrompt] = useState(darePrompts[0])
  const [likelyPrompt, setLikelyPrompt] = useState(likelyPrompts[0])
  const [ratherPrompt, setRatherPrompt] = useState(wouldYouRatherPrompts[0])
  const [score, setScore] = useState({ chaos: 0, laughs: 0 })

  function addLaugh() {
    setScore((score) => ({ ...score, laughs: score.laughs + 1 }))
  }

  function addChaos() {
    setScore((score) => ({ ...score, chaos: score.chaos + 1 }))
  }

  return (
    <ToolPage>
      <section className="play-room">
        <div className="play-header">
          <div>
            <span className="mini-label">Group game zone</span>
            <h2>Play Room</h2>
            <p>Pass the phone, read the prompt, argue loudly, repeat responsibly.</p>
          </div>
          <div className="play-scoreboard" aria-label="Play room scoreboard">
            <div>
              <span>Laughs</span>
              <strong>{score.laughs}</strong>
            </div>
            <div>
              <span>Chaos</span>
              <strong>{score.chaos}</strong>
            </div>
          </div>
        </div>

        <div className="play-tabs" aria-label="Play room games">
          {games.map((option) => (
            <button className={game === option ? 'active' : ''} type="button" key={option} onClick={() => setGame(option)}>
              {option}
            </button>
          ))}
        </div>

        {game === 'Truth or Dare' && (
          <GamePanel
            label={truthMode}
            title={truthMode === 'Truth' ? truthPrompt : darePrompt}
            description="Choose truth or dare, then let the group judge the bravery level."
            onPrimary={() => {
              if (truthMode === 'Truth') {
                setTruthPrompt(randomItem(truthPrompts, truthPrompt))
              } else {
                setDarePrompt(randomItem(darePrompts, darePrompt))
              }
              addChaos()
            }}
            primaryText="New Prompt"
            extra={
              <div className="segmented-control play-switch" aria-label="Truth or dare mode">
                {['Truth', 'Dare'].map((option) => (
                  <button className={truthMode === option ? 'active' : ''} type="button" key={option} onClick={() => setTruthMode(option)}>
                    {option}
                  </button>
                ))}
              </div>
            }
          />
        )}

        {game === "Who's Most Likely To" && (
          <GamePanel
            label="Vote loudly"
            title={likelyPrompt}
            description="Everyone points at the guilty person. The accused may defend themselves badly."
            onPrimary={() => {
              setLikelyPrompt(randomItem(likelyPrompts, likelyPrompt))
              addLaugh()
            }}
            primaryText="Next Question"
          />
        )}

        {game === 'Would You Rather' && (
          <GamePanel
            label="Pick one"
            title={`${ratherPrompt[0]} or ${ratherPrompt[1]}?`}
            description="No middle option. This is a democracy with unnecessary pressure."
            onPrimary={() => {
              setRatherPrompt(randomItem(wouldYouRatherPrompts, ratherPrompt))
              addChaos()
            }}
            primaryText="Next Choice"
            extra={
              <div className="rather-options">
                <button type="button" onClick={addLaugh}>{ratherPrompt[0]}</button>
                <button type="button" onClick={addLaugh}>{ratherPrompt[1]}</button>
              </div>
            }
          />
        )}
      </section>
    </ToolPage>
  )
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
  const allReady = nonHostPlayers.every(([, player]) => player.ready)
  const readyCount = activePlayerEntries.filter(([playerId, player]) => (
    playerId === room.hostId || player.ready
  )).length
  const winnerNames = session.winnerIds
    .map((playerId) => players[playerId]?.name)
    .filter(Boolean)

  useEffect(() => {
    if (!hasJoined) return undefined
    const presenceTimer = window.setInterval(() => setPresenceNow(Date.now()), 30000)
    return () => window.clearInterval(presenceTimer)
  }, [hasJoined])

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
    const joinRequestsRef = collection(db, 'rooms', roomCode, 'joinRequests')
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
          writeRoomPatchToTransaction(transaction, roomCode, maintenancePatch)
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
      setSyncStatus(snapshot.metadata.fromCache ? 'Reconnecting' : 'Live')
      setSyncError('')
    }

    const unsubscribers = [
      onSnapshot(
      roomRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.exists()) {
          return
        }
        setRoom((currentRoom) => normalizeRoom({
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
          setRoom((currentRoom) => normalizeRoom({
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
          setRoom((currentRoom) => normalizeRoom({
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
        joinRequestsRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          const nextJoinRequests = Object.fromEntries(
            snapshot.docs.map((requestSnapshot) => [
              requestSnapshot.id,
              joinRequestFromDoc(requestSnapshot),
            ]),
          )
          setRoom((currentRoom) => normalizeRoom({
            ...currentRoom,
            joinRequests: Object.fromEntries(
              Object.entries(nextJoinRequests).filter(([, request]) => (
                request.requestedAt >= currentRoom.resetAt
              )),
            ),
          }, roomCode))
          markSnapshot(snapshot)
        },
        (error) => {
          setSyncStatus('Offline')
          setSyncError(formatSyncError(error))
        },
      ),
      onSnapshot(
        messagesQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          const nextMessages = snapshot.docs.map(messageFromDoc).reverse()
          setRoom((currentRoom) => normalizeRoom({
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
          setRoom((currentRoom) => normalizeRoom({
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
    ]

    return () => {
      cancelled = true
      unsubscribers.forEach((unsubscribe) => unsubscribe())
      window.clearInterval(heartbeatId)
    }
  }, [authReady, authUid, currentPlayer, currentPlayerLockedOut, hasJoined, roomCode])

  useEffect(() => {
    if (!hasJoined || currentPlayerLockedOut || currentPlayerNeedsAdmission) return undefined
    if (isFirebaseConfigured && (!authReady || !authUid)) return undefined

    const maintenancePatch = createRoomMaintenancePatch(room, presenceNow, {
      keepPlayerId: currentPlayer.id,
      preferredHostId: hostIsAway ? currentPlayer.id : '',
    })
    if (!hasRoomPatch(maintenancePatch)) return undefined

    if (!isFirebaseConfigured) {
      const maintenanceId = window.setTimeout(() => setRoom((currentRoom) => {
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
      writeRoomPatchToTransaction(
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
  ])

  function mutateRoom(createPatch, { hostOnly = false } = {}) {
    if (currentPlayerLockedOut) return
    if (hostOnly && !canControlRoom) return
    if (isFirebaseConfigured && (!authReady || !authUid)) {
      setSyncStatus('Signing in')
      return
    }

    if (!isFirebaseConfigured) {
      setRoom((currentRoom) => {
        const now = Date.now()
        const maintenancePatch = createRoomMaintenancePatch(currentRoom, now, {
          keepPlayerId: currentPlayer.id,
          preferredHostId: hostOnly ? currentPlayer.id : '',
        })
        const maintainedRoom = applyRoomPatch(currentRoom, maintenancePatch)
        if (hostOnly && maintainedRoom.hostId !== currentPlayer.id) return currentRoom

        return applyRoomPatch(
          maintainedRoom,
          mergeRoomPatches(
            createPatch(maintainedRoom) || {},
            currentPlayerPresencePatch(maintainedRoom, currentPlayer, now),
          ),
        )
      })
      return
    }

    setSyncStatus('Saving')
    runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'rooms', roomCode)
      const gameStateRef = doc(db, 'rooms', roomCode, 'gameState', gameStateDocId)
      const snapshot = await transaction.get(roomRef)
      if (!snapshot.exists()) throw new Error('This room no longer exists.')

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
      const maintenancePatch = createRoomMaintenancePatch(currentRoom, now, {
        keepPlayerId: currentPlayer.id,
        preferredHostId: hostOnly ? currentPlayer.id : '',
      })
      const maintainedRoom = applyRoomPatch(currentRoom, maintenancePatch)
      if (hostOnly && maintainedRoom.hostId !== currentPlayer.id) return

      writeRoomPatchToTransaction(
        transaction,
        roomCode,
        mergeRoomPatches(
          maintenancePatch,
          createPatch(maintainedRoom) || {},
          currentPlayerPresencePatch(maintainedRoom, currentPlayer, now),
        ),
      )
    }).catch((error) => {
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
    setRoom(createInitialRoom(code, nextPlayer))
    setPresenceNow(Date.now())
    setRejoinGraceUntil(Date.now() + 5000)
    setJoinCode(code)
    setHasJoined(true)
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    window.history.replaceState(null, '', `/game-room?room=${code}`)
  }

  function startNewRoom() {
    const nextCode = createRoomCode()
    const nextRoom = createInitialRoom(nextCode, currentPlayer)
    setRoom(nextRoom)
    setJoinCode(nextCode)
    setRejoinGraceUntil(0)
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    window.history.replaceState(null, '', `/game-room?room=${nextCode}`)
  }

  function rejoinCurrentRoom() {
    setRoom(createInitialRoom(roomCode, currentPlayer))
    setPresenceNow(Date.now())
    setRejoinGraceUntil(Date.now() + 5000)
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
    setRejoinGraceUntil(Date.now() + 5000)

    mutateRoom((currentRoom) => {
      const request = currentRoom.joinRequests[currentPlayer.id]
      if (!request || !['accepted', 'joined'].includes(request.status)) return {}
      const now = Date.now()

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

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}/game-room?room=${roomCode}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setSyncError('Could not copy the link. Copy it from the browser address bar.')
    }
  }

  function changeGame(nextGame) {
    if (session.status === 'playing') return

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
    mutateRoom((currentRoom) => ({
      reactions: {
        ...currentRoom.reactions,
        [reaction]: currentRoom.reactions[reaction] + 1,
      },
    }))
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
    })
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
    })
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
    })
  }

  function rollLudoDice() {
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

      const ludo = restoreLudo(ludoState)
      ludo.rollDiceForCurrentPiece()
      return { ludo: serializeLudo(ludo, ludoState.seats) }
    })
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
    })
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
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'lobby') return {}
      const now = Date.now()
      const effectiveRoom = currentRoom.hostId === currentPlayer.id
        ? currentRoom
        : { ...currentRoom, hostId: currentPlayer.id }
      const activeEntries = Object.entries(currentRoom.players).filter(([, player]) => (
        isPlayerActive(player, now)
      ))
      const waitingPlayers = activeEntries.filter(([playerId, player]) => (
        playerId !== currentPlayer.id && !player.ready
      ))
      if (waitingPlayers.length > 0) return {}

      const scores = Object.fromEntries(activeEntries.map(([playerId]) => [playerId, 0]))
      const playerPatches = Object.fromEntries(
        Object.keys(currentRoom.players).map((playerId) => [playerId, { ready: false }]),
      )

      return {
        ...freshGamePatch(effectiveRoom),
        playerPatches,
        session: {
          status: 'playing',
          matchId: createEventId(),
          game: effectiveRoom.game,
          scores,
          winnerIds: [],
          startedAt: now,
          endedAt: 0,
        },
        messageCreates: [systemMessage(`${effectiveRoom.game} started. Good luck, allegedly.`)],
      }
    }, { hostOnly: true })
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

  return (
    <ToolPage>
      <section className="game-room">
        <div className="room-hero">
          <div>
            <span className="mini-label">Common room</span>
            <h2>The Party Board</h2>
            <p>Ready up, chat live, keep score, and run party prompts or proper board games together.</p>
            <span className={`sync-pill ${syncStatus.toLowerCase().replace(' ', '-')}`}>
              {syncStatus === 'Live' ? 'Firebase live sync' : syncStatus}
            </span>
            {syncError && <p className="sync-error">{syncError}</p>}
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
              <button className="secondary-button" type="button" onClick={startNewRoom}>
                <Plus size={17} />
                New Room
              </button>
            </div>
          </div>
        </div>

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

        <div className="room-layout">
          <PlayerRoster
            currentPlayerId={currentPlayer.id}
            hostId={room.hostId}
            isHost={canControlRoom}
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
          />

          <section className="round-board">
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
            players={players}
            onSendMessage={sendChatMessage}
          />
        </div>
      </section>
    </ToolPage>
  )
}

function GamePanel({ label, title, description, onPrimary, primaryText, extra }) {
  return (
    <article className="game-panel">
      {extra}
      <span className="mini-label">{label}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" onClick={onPrimary}>
        <WandSparkles size={17} />
        {primaryText}
      </button>
    </article>
  )
}

function ComplimentGenerator() {
  const [mode, setMode] = useState('Girlfriend')
  const [compliment, setCompliment] = useState(compliments[0])
  const [luckyNumber, setLuckyNumber] = useState(97)

  function generateCompliment() {
    const list = mode === 'Girlfriend' ? compliments : friendCompliments
    setCompliment(randomItem(list, compliment))
    setLuckyNumber(Math.floor(Math.random() * 90) + 10)
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setCompliment(nextMode === 'Girlfriend' ? compliments[0] : friendCompliments[0])
    setLuckyNumber(97)
  }

  return (
    <ToolPage>
      <div className="segmented-control" aria-label="Compliment mode">
        {['Girlfriend', 'Friends'].map((option) => (
          <button
            className={mode === option ? 'active' : ''}
            type="button"
            key={option}
            onClick={() => changeMode(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <GeneratorPage
        label={`Compliment quality: ${luckyNumber}%`}
        text={compliment}
        buttonText="Generate Compliment"
        onGenerate={generateCompliment}
        embedded
      />
    </ToolPage>
  )
}

function GeneratorPage({ label, text, buttonText, onGenerate, embedded = false }) {
  const [copied, setCopied] = useState(false)

  function copyText() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const content = (
    <section className="generator-box">
      <span className="mini-label">{label}</span>
      <blockquote>{text}</blockquote>
      <div className="button-row">
        <button type="button" onClick={onGenerate}>
          <WandSparkles size={17} />
          {buttonText}
        </button>
        <button className="secondary-button" type="button" onClick={copyText}>
          <Copy size={17} />
          {copied ? 'Copied' : 'Copy Text'}
        </button>
      </div>
    </section>
  )

  if (embedded) return content

  return (
    <ToolPage>
      {content}
    </ToolPage>
  )
}

function ToolPage({ children }) {
  return <div className="tool-page">{children}</div>
}

function currentPageTitle(pathname) {
  return pages.find((page) => page.path === pathname)?.title ?? 'Just For Fun HQ'
}

function currentPageDescription(pathname) {
  return pages.find((page) => page.path === pathname)?.description ?? ''
}

export default App
