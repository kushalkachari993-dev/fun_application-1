import { createVerify } from 'node:crypto'

const firebaseCertsUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'

let cachedCerts = null
let cachedCertsExpiresAt = 0

export function createHttpError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

export function getBearerToken(req) {
  const header = req.headers.authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

function decodeBase64Url(value) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function decodeJsonSegment(value) {
  return JSON.parse(decodeBase64Url(value).toString('utf8'))
}

async function getFirebaseCerts() {
  if (cachedCerts && cachedCertsExpiresAt > Date.now()) return cachedCerts

  const response = await fetch(firebaseCertsUrl)
  if (!response.ok) {
    throw createHttpError(503, 'auth-certificates-unavailable', 'Could not verify Firebase sign-in right now.')
  }

  const cacheControl = response.headers.get('cache-control') || ''
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 300)
  cachedCerts = await response.json()
  cachedCertsExpiresAt = Date.now() + maxAge * 1000
  return cachedCerts
}

export async function verifyFirebaseIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
  if (!projectId) {
    throw createHttpError(
      500,
      'missing-firebase-project',
      'Set FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID in Vercel Environment Variables.',
    )
  }

  const parts = idToken.split('.')
  if (parts.length !== 3) {
    throw createHttpError(401, 'unauthenticated', 'Sign in anonymously before using this feature.')
  }

  let header
  let payload
  try {
    header = decodeJsonSegment(parts[0])
    payload = decodeJsonSegment(parts[1])
  } catch {
    throw createHttpError(401, 'unauthenticated', 'Firebase sign-in token is not valid.')
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw createHttpError(401, 'unauthenticated', 'Firebase sign-in token is not valid.')
  }

  const certs = await getFirebaseCerts()
  const cert = certs[header.kid]
  if (!cert) {
    throw createHttpError(401, 'unauthenticated', 'Firebase sign-in token is not current. Try again.')
  }

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${parts[0]}.${parts[1]}`)
  verifier.end()

  if (!verifier.verify(cert, decodeBase64Url(parts[2]))) {
    throw createHttpError(401, 'unauthenticated', 'Firebase sign-in token is not valid.')
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now || payload.iat > now + 60) {
    throw createHttpError(401, 'unauthenticated', 'Firebase sign-in expired. Try again.')
  }

  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}` || !payload.sub) {
    throw createHttpError(401, 'unauthenticated', 'Firebase sign-in token does not match this project.')
  }

  return payload
}
