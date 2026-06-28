const { defineSecret } = require('firebase-functions/params')
const { HttpsError, onCall } = require('firebase-functions/v2/https')

const groqApiKey = defineSecret('GROQ_API_KEY')
const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions'
const groqModel = 'llama-3.3-70b-versatile'

const baseSystemPrompt = [
  'You write playful, warm relationship and friendship content for a small party web app.',
  'Return JSON only, exactly matching the requested shape.',
  'Keep it kind, respectful, and age-appropriate.',
  'Do not pretend to diagnose emotions, read minds, manipulate someone, or give medical/legal advice.',
  'Avoid explicit sexual content, harassment, threats, and cruel insults.',
].join(' ')

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

exports.generateRelationshipTool = onCall({
  region: 'us-central1',
  secrets: [groqApiKey],
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 5,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in anonymously before using AI tools.')
  }

  const toolName = text(request.data?.tool, 40)
  const tool = tools[toolName]
  if (!tool) {
    throw new HttpsError('invalid-argument', 'Unknown AI tool.')
  }

  const apiKey = groqApiKey.value()
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'GROQ_API_KEY is not configured.')
  }

  const answers = request.data?.answers && typeof request.data.answers === 'object'
    ? request.data.answers
    : {}

  let response
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
    })
  } catch {
    throw new HttpsError('unavailable', 'Could not reach Groq. Try again in a moment.')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new HttpsError(
      'unavailable',
      `Groq request failed: ${text(errorText, 240) || response.statusText}`,
    )
  }

  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw new HttpsError('internal', 'Groq returned an empty response.')
  }

  try {
    return tool.normalize(parseJsonContent(content))
  } catch {
    throw new HttpsError('internal', 'Groq returned a response the app could not read.')
  }
})
