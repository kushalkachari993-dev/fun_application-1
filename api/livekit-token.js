import { AccessToken, TrackSource } from 'livekit-server-sdk'
import {
  createHttpError,
  getBearerToken,
  verifyFirebaseIdToken,
} from './firebase-id-token.js'
import { consumeRateLimit } from './rate-limit.js'

const maxBodyBytes = 2_000

function sendJson(res, status, body) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.json(body)
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {}

  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBodyBytes) {
      throw createHttpError(413, 'payload-too-large', 'Voice request is too large.')
    }
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? JSON.parse(rawBody) : {}
}

function normalizeRoomCode(value) {
  if (typeof value !== 'string') return ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function firestoreString(document, field) {
  return document?.fields?.[field]?.stringValue || ''
}

async function getRoomMember(projectId, roomCode, uid, idToken) {
  const documentUrl = [
    'https://firestore.googleapis.com/v1/projects',
    encodeURIComponent(projectId),
    'databases/(default)/documents/rooms',
    encodeURIComponent(roomCode),
    'players',
    encodeURIComponent(uid),
  ].join('/')
  const response = await fetch(documentUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  })

  if (response.status === 404) {
    throw createHttpError(403, 'voice-membership-required', 'Join the game room before joining its voice channel.')
  }
  if (!response.ok) {
    throw createHttpError(503, 'voice-membership-check-failed', 'Could not confirm room membership. Try again.')
  }

  const member = await response.json()
  if (firestoreString(member, 'uid') !== uid) {
    throw createHttpError(403, 'voice-membership-required', 'Join the game room before joining its voice channel.')
  }
  return member
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { code: 'method-not-allowed', error: 'Use POST to join voice.' })
    return
  }

  try {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const serverUrl = process.env.LIVEKIT_URL
    if (!apiKey || !apiSecret || !serverUrl) {
      throw createHttpError(
        503,
        'voice-not-configured',
        'Voice is not configured yet. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in Vercel.',
      )
    }
    if (!/^wss?:\/\//i.test(serverUrl)) {
      throw createHttpError(500, 'invalid-livekit-url', 'LIVEKIT_URL must start with wss:// or ws://.')
    }

    const idToken = getBearerToken(req)
    const user = await verifyFirebaseIdToken(idToken)
    const rateLimit = consumeRateLimit(`voice:${user.sub}`, { limit: 30 })
    res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining))
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      throw createHttpError(429, 'rate-limited', 'Too many voice join attempts. Wait a few minutes and try again.')
    }

    const body = await readRequestBody(req)
    const roomCode = normalizeRoomCode(body.roomCode)
    if (roomCode.length < 4) {
      throw createHttpError(400, 'invalid-room-code', 'A valid room code is required for voice.')
    }

    const member = await getRoomMember(user.aud, roomCode, user.sub, idToken)
    const participantName = firestoreString(member, 'name').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Player'
    const avatar = firestoreString(member, 'avatar').slice(0, 32)
    const voiceRoomName = `party-${roomCode}`
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: user.sub,
      name: participantName,
      metadata: JSON.stringify({ avatar, gameRoom: roomCode }),
      ttl: '10m',
    })
    accessToken.addGrant({
      roomJoin: true,
      room: voiceRoomName,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
    })

    sendJson(res, 200, {
      participantToken: await accessToken.toJwt(),
      serverUrl,
    })
  } catch (error) {
    const status = error.status || 500
    sendJson(res, status, {
      code: error.code || 'voice-token-failed',
      error: error.message || 'Could not join voice. Try again.',
    })
  }
}
