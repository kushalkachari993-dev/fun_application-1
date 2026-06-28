import { describe, expect, it } from 'vitest'
import {
  chooseNextHostId,
  createInitialSession,
  createRoomMaintenancePatch,
  normalizeTime,
  playerPresenceTimeoutMs,
} from './roomState'

const now = 1_800_000

function makePlayer(id, overrides = {}) {
  const lastSeen = overrides.lastSeen ?? now

  return {
    uid: id,
    name: id,
    avatar: 'spark',
    ready: false,
    points: 0,
    joinedAt: overrides.joinedAt ?? lastSeen,
    lastSeen,
    lastSeenAt: lastSeen,
    ...overrides,
  }
}

function makeRoom(overrides = {}) {
  return {
    roomCode: 'TEST01',
    hostId: 'host',
    players: {
      host: makePlayer('host', { joinedAt: now - 30_000 }),
    },
    session: createInitialSession(),
    ...overrides,
  }
}

describe('room maintenance', () => {
  it('prunes stale players from players, scores, winners, and board seats', () => {
    const staleSeen = now - playerPresenceTimeoutMs - 1
    const room = makeRoom({
      players: {
        host: makePlayer('host', { joinedAt: now - 60_000 }),
        stale: makePlayer('stale', { joinedAt: now - 50_000, lastSeen: staleSeen }),
      },
      session: {
        ...createInitialSession(),
        scores: { host: 5, stale: 3 },
        winnerIds: ['stale', 'host'],
      },
      chess: {
        fen: 'start',
        seats: { white: 'stale', black: 'host' },
      },
      ludo: {
        players: 2,
        seats: { red: 'stale', blue: 'host' },
      },
    })

    const patch = createRoomMaintenancePatch(room, now)

    expect(patch.playerDeletes).toEqual(['stale'])
    expect(patch.session.scores).toEqual({ host: 5 })
    expect(patch.session.winnerIds).toEqual(['host'])
    expect(patch.chess.seats).toEqual({ white: '', black: 'host' })
    expect(patch.ludo.seats).toEqual({ red: '', blue: 'host' })
    expect(patch).not.toHaveProperty('hostId')
  })

  it('reassigns host to the preferred active player when the old host goes stale', () => {
    const staleSeen = now - playerPresenceTimeoutMs - 1
    const room = makeRoom({
      hostId: 'host',
      players: {
        host: makePlayer('host', { joinedAt: now - 60_000, lastSeen: staleSeen }),
        early: makePlayer('early', { joinedAt: now - 50_000 }),
        preferred: makePlayer('preferred', { joinedAt: now - 10_000 }),
      },
    })

    const patch = createRoomMaintenancePatch(room, now, { preferredHostId: 'preferred' })

    expect(patch.playerDeletes).toEqual(['host'])
    expect(patch.hostId).toBe('preferred')
  })

  it('keeps the reconnecting player during maintenance and can make them host', () => {
    const staleSeen = now - playerPresenceTimeoutMs - 1
    const room = makeRoom({
      hostId: 'host',
      players: {
        host: makePlayer('host', { joinedAt: now - 60_000, lastSeen: staleSeen }),
        reconnecting: makePlayer('reconnecting', { joinedAt: now - 40_000, lastSeen: staleSeen }),
        active: makePlayer('active', { joinedAt: now - 20_000 }),
      },
    })

    const patch = createRoomMaintenancePatch(room, now, {
      keepPlayerId: 'reconnecting',
      preferredHostId: 'reconnecting',
    })

    expect(patch.playerDeletes).toEqual(['host'])
    expect(patch.hostId).toBe('reconnecting')
  })

  it('chooses the earliest joined active player when there is no preferred host', () => {
    const staleSeen = now - playerPresenceTimeoutMs - 1
    const players = {
      host: makePlayer('host', { joinedAt: now - 70_000, lastSeen: staleSeen }),
      early: makePlayer('early', { joinedAt: now - 50_000 }),
      late: makePlayer('late', { joinedAt: now - 10_000 }),
    }

    expect(chooseNextHostId(players, 'host', now)).toBe('early')
  })

  it('clears the host when an abandoned room has no active players left', () => {
    const staleSeen = now - playerPresenceTimeoutMs - 1
    const room = makeRoom({
      hostId: 'solo',
      players: {
        solo: makePlayer('solo', { joinedAt: now - 60_000, lastSeen: staleSeen }),
      },
      session: {
        ...createInitialSession(),
        scores: { solo: 9 },
        winnerIds: ['solo'],
      },
    })

    const patch = createRoomMaintenancePatch(room, now)

    expect(patch.playerDeletes).toEqual(['solo'])
    expect(patch.hostId).toBe('')
    expect(patch.session.scores).toEqual({})
    expect(patch.session.winnerIds).toEqual([])
  })

  it('returns an empty patch when the room is already healthy', () => {
    const room = makeRoom({
      players: {
        host: makePlayer('host', { joinedAt: now - 30_000 }),
        guest: makePlayer('guest', { joinedAt: now - 20_000 }),
      },
    })

    expect(createRoomMaintenancePatch(room, now)).toEqual({})
  })

  it('normalizes Firestore timestamp-like values before presence checks', () => {
    expect(normalizeTime({ toMillis: () => 1234 })).toBe(1234)
  })
})
