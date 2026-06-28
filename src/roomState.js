export const playerPresenceTimeoutMs = 2 * 60 * 1000

const fallbackAvatarId = 'spark'

export function createInitialSession() {
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

export function normalizeTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value?.toMillis) return value.toMillis()
  return Number(value) || 0
}

export function normalizePlayer(player = {}) {
  return {
    uid: player.uid || '',
    name: player.name || 'Player',
    avatar: player.avatar || fallbackAvatarId,
    ready: Boolean(player.ready),
    points: Number(player.points) || 0,
    joinedAt: normalizeTime(player.joinedAt),
    lastSeen: normalizeTime(player.lastSeen),
    lastSeenAt: normalizeTime(player.lastSeenAt),
  }
}

export function normalizePlayers(players) {
  if (Array.isArray(players) || !players || typeof players !== 'object') return {}

  return Object.fromEntries(
    Object.entries(players).map(([playerId, player]) => [playerId, normalizePlayer(player)]),
  )
}

export function normalizePlayerPatch(playerPatch = {}) {
  const nextPatch = {}

  if ('name' in playerPatch) nextPatch.name = playerPatch.name || 'Player'
  if ('uid' in playerPatch) nextPatch.uid = playerPatch.uid || ''
  if ('avatar' in playerPatch) nextPatch.avatar = playerPatch.avatar || fallbackAvatarId
  if ('ready' in playerPatch) nextPatch.ready = Boolean(playerPatch.ready)
  if ('points' in playerPatch) nextPatch.points = Number(playerPatch.points) || 0
  if ('joinedAt' in playerPatch) nextPatch.joinedAt = normalizeTime(playerPatch.joinedAt)
  if ('lastSeen' in playerPatch) nextPatch.lastSeen = normalizeTime(playerPatch.lastSeen)
  if ('lastSeenAt' in playerPatch) nextPatch.lastSeenAt = normalizeTime(playerPatch.lastSeenAt)

  return nextPatch
}

export function isPlayerActive(player, now = Date.now()) {
  return Boolean(player?.lastSeen) && now - (player.lastSeen || 0) < playerPresenceTimeoutMs
}

function isPlayerActiveForMaintenance(playerId, player, now, keepPlayerId = '') {
  return playerId === keepPlayerId || isPlayerActive(player, now)
}

export function chooseNextHostId(
  players,
  currentHostId = '',
  now = Date.now(),
  keepPlayerId = '',
  preferredHostId = '',
) {
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

export function removePlayerFromSeats(seats, playerId) {
  return Object.fromEntries(
    Object.entries(seats || {}).map(([seat, seatPlayerId]) => [
      seat,
      seatPlayerId === playerId ? '' : seatPlayerId,
    ]),
  )
}

export function removePlayerFromScores(scores, playerId) {
  const nextScores = { ...(scores || {}) }
  delete nextScores[playerId]
  return nextScores
}

export function removePlayersFromRoomPatch(room, playerIds) {
  const uniquePlayerIds = [...new Set(playerIds.filter(Boolean))]
  if (uniquePlayerIds.length === 0) return {}

  const session = room.session || createInitialSession()
  const nextScores = uniquePlayerIds.reduce(
    (scores, playerId) => removePlayerFromScores(scores, playerId),
    session.scores,
  )
  const patch = {
    playerDeletes: uniquePlayerIds,
    session: {
      ...session,
      scores: nextScores,
      winnerIds: (session.winnerIds || []).filter((winnerId) => !uniquePlayerIds.includes(winnerId)),
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

export function createRoomMaintenancePatch(room, now = Date.now(), options = {}) {
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
