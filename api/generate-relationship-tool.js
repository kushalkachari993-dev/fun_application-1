import { createVerify } from 'node:crypto'
import { consumeRateLimit } from './rate-limit.js'

const firebaseCertsUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions'
const groqModel = 'llama-3.3-70b-versatile'
const maxBodyBytes = 10_000
const groqTimeoutMs = 12_000

let cachedCerts = null
let cachedCertsExpiresAt = 0

const baseSystemPrompt = [
  'You write playful, warm relationship and friendship content for a small party web app.',
  'Return JSON only, exactly matching the requested shape.',
  'Keep it kind, respectful, and age-appropriate.',
  'Do not pretend to diagnose emotions, read minds, manipulate someone, or give medical/legal advice.',
  'Avoid explicit sexual content, harassment, threats, and cruel insults.',
].join(' ')

function createHttpError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function sendJson(res, status, body) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json')
  res.json(body)
}

function text(value, max = 240) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function textList(value, maxItems = 3, maxLength = 120) {
  if (!Array.isArray(value)) return []
  return value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems)
}

function parseJsonContent(content) {
  const cleaned = text(content, 4000)
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw error
  }
}

function decodeBase64Url(value) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function decodeJsonSegment(value) {
  return JSON.parse(decodeBase64Url(value).toString('utf8'))
}

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
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

async function verifyFirebaseIdToken(idToken) {
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
    throw createHttpError(401, 'unauthenticated', 'Sign in anonymously before using AI tools.')
  }

  let header
  let payload
  try {
    header = decodeJsonSegment(parts[0])
    payload = decodeJsonSegment(parts[1])
  } catch {
    throw createHttpError(401, 'unauthenticated', 'Sign in anonymously before using AI tools.')
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

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {}
  }

  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBodyBytes) {
      throw createHttpError(413, 'payload-too-large', 'AI request is too large.')
    }
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? JSON.parse(rawBody) : {}
}

const tools = {
  apology: {
    maxTokens: 220,
    prompt: (answers) => [
      'Create one apology message.',
      'JSON shape: {"text":"message"}',
      `Recipient: ${text(answers.recipient, 40) || 'girlfriend'}.`,
      `Tone: ${text(answers.tone, 40) || 'soft and sincere'}.`,
      `Situation: ${text(answers.situation, 500) || 'I made a mistake and want to make things better'}.`,
      'Make it specific, accountable, and not dramatic.',
    ].join('\n'),
    normalize: (data) => ({
      text: text(data.text, 420) || 'I am sorry. I understand I hurt you, and I will do better with actions, not just words.',
    }),
  },
  compliment: {
    maxTokens: 180,
    prompt: (answers) => [
      'Create one compliment.',
      'JSON shape: {"text":"compliment"}',
      `For: ${text(answers.recipient, 40) || 'girlfriend'}.`,
      `Tone: ${text(answers.tone, 40) || 'sweet and playful'}.`,
      `Details to include: ${text(answers.details, 500) || 'make it feel personal and cute'}.`,
      'Make it natural enough to send as a message.',
    ].join('\n'),
    normalize: (data) => ({
      text: text(data.text, 300) || 'You have this tiny superpower of making ordinary moments feel lighter.',
    }),
  },
  datePlan: {
    maxTokens: 320,
    prompt: (answers) => [
      'Create one simple date plan.',
      'JSON shape: {"title":"short title","budget":"low/medium/high","vibe":"one sentence","steps":["step 1","step 2","step 3"]}',
      `Budget: ${text(answers.budget, 40) || 'medium'}.`,
      `Mood: ${text(answers.mood, 60) || 'cozy and fun'}.`,
      `Place or context: ${text(answers.context, 500) || 'nearby, easy to do today'}.`,
      'Keep it realistic, specific, and easy to execute.',
    ].join('\n'),
    normalize: (data) => {
      const steps = textList(data.steps, 3, 130)
      return {
        title: text(data.title, 80) || 'Tiny Perfect Plan',
        budget: text(data.budget, 20) || 'medium',
        vibe: text(data.vibe, 180) || 'Simple, thoughtful, and easy to pull off.',
        steps: steps.length ? steps : ['Pick one nearby place', 'Add one small surprise', 'End with a relaxed walk or dessert'],
      }
    },
  },
}

async function callGroq(tool, answers) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw createHttpError(500, 'missing-groq-key', 'GROQ_API_KEY is not configured in Vercel Environment Variables.')
  }

  let response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), groqTimeoutMs)
  try {
    response = await fetch(groqEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: tool.prompt(answers) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.85,
        max_completion_tokens: tool.maxTokens,
      }),
      signal: controller.signal,
    })
  } catch {
    throw createHttpError(503, 'groq-unavailable', 'Could not reach Groq. Try again in a moment.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw createHttpError(503, 'groq-request-failed', 'The AI provider could not complete this request. Try again in a moment.')
  }

  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw createHttpError(502, 'empty-groq-response', 'Groq returned an empty response.')
  }

  try {
    return tool.normalize(parseJsonContent(content))
  } catch {
    throw createHttpError(502, 'invalid-groq-response', 'Groq returned a response the app could not read.')
  }
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { code: 'method-not-allowed', error: 'Use POST for AI generation.' })
    return
  }

  try {
    const user = await verifyFirebaseIdToken(getBearerToken(req))
    const rateLimit = consumeRateLimit(user.sub)
    res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining))
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      throw createHttpError(429, 'rate-limited', 'Too many AI requests. Wait a few minutes and try again.')
    }

    const body = await readRequestBody(req)
    const toolName = text(body.tool, 40)
    const tool = tools[toolName]
    if (!tool) {
      throw createHttpError(400, 'unknown-tool', 'Unknown AI tool.')
    }

    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {}
    const result = await callGroq(tool, answers)
    sendJson(res, 200, result)
  } catch (error) {
    const status = error.status || 500
    sendJson(res, status, {
      code: error.code || 'ai-generation-failed',
      error: error.message || 'AI generation failed. Try again in a moment.',
    })
  }
}
