export const SECRET_VOTE_GAME = 'Secret Vote'
export const SECRET_ANSWER_DURATION_MS = 45_000
export const SECRET_VOTE_DURATION_MS = 30_000

export const secretVotePrompts = [
  'What is the worst thing to say on a first date?',
  'What would be a terrible name for a group chat?',
  'What is the most suspicious thing to keep in a backpack?',
  'What would instantly ruin a superhero\'s reputation?',
  'What is the funniest excuse for being late?',
  'What should never be announced over an airplane speaker?',
  'What is a terrible slogan for a dating app?',
  'What would make the world\'s worst motivational poster?',
  'What is the least impressive secret talent?',
  'What would your group be banned from doing together?',
  'What is the worst possible wedding gift?',
  'What should you never say while cutting someone\'s hair?',
]

export function cleanSecretAnswer(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 100)
}

export function nextSecretVotePrompt(currentPrompt = '', random = Math.random) {
  if (secretVotePrompts.length === 1) return secretVotePrompts[0]
  let nextPrompt = currentPrompt
  while (nextPrompt === currentPrompt) {
    nextPrompt = secretVotePrompts[Math.floor(random() * secretVotePrompts.length)]
  }
  return nextPrompt
}

export function createSecretVoteLobby(currentPrompt = '') {
  return {
    phase: 'lobby',
    prompt: nextSecretVotePrompt(currentPrompt),
    round: 1,
    deadlineAt: 0,
    submissions: {},
    votes: {},
    revealOrder: [],
    voteCounts: {},
    winners: [],
  }
}

export function createSecretVoteRound(currentPrompt = '', round = 1, now = Date.now()) {
  return {
    ...createSecretVoteLobby(currentPrompt),
    phase: 'answering',
    round,
    deadlineAt: now + SECRET_ANSWER_DURATION_MS,
  }
}

function normalizeStringRecord(value, cleanValue) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => Boolean(key))
      .map(([key, recordValue]) => [key, cleanValue(recordValue)])
      .filter(([, recordValue]) => Boolean(recordValue)),
  )
}

export function normalizeSecretVote(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const submissions = normalizeStringRecord(value.submissions, cleanSecretAnswer)
  const votes = normalizeStringRecord(value.votes, (vote) => String(vote || '').slice(0, 128))
  const voteCounts = normalizeStringRecord(value.voteCounts, (count) => (
    String(Math.max(0, Math.floor(Number(count) || 0)))
  ))
  const validPhases = new Set(['lobby', 'answering', 'voting', 'results'])
  const revealOrder = Array.isArray(value.revealOrder)
    ? [...new Set(value.revealOrder.filter((playerId) => submissions[playerId]))]
    : []

  return {
    phase: validPhases.has(value.phase) ? value.phase : 'lobby',
    prompt: String(value.prompt || '').slice(0, 180),
    round: Math.max(1, Math.floor(Number(value.round) || 1)),
    deadlineAt: Math.max(0, Number(value.deadlineAt) || 0),
    submissions,
    votes,
    revealOrder,
    voteCounts: Object.fromEntries(
      Object.entries(voteCounts).map(([playerId, count]) => [playerId, Number(count)]),
    ),
    winners: Array.isArray(value.winners)
      ? [...new Set(value.winners.filter((playerId) => submissions[playerId]))]
      : [],
  }
}

export function submitSecretAnswer(state, playerId, answer) {
  const normalized = normalizeSecretVote(state)
  const cleanAnswer = cleanSecretAnswer(answer)
  if (!normalized || normalized.phase !== 'answering' || !playerId || !cleanAnswer) return normalized
  return {
    ...normalized,
    submissions: {
      ...normalized.submissions,
      [playerId]: cleanAnswer,
    },
  }
}

function hashText(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function shuffledPlayerIds(playerIds, seedText) {
  const shuffled = [...playerIds].sort()
  let seed = hashText(seedText) || 1
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    const swapIndex = (seed >>> 0) % (index + 1)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function revealSecretAnswers(state, activePlayerIds, now = Date.now()) {
  const normalized = normalizeSecretVote(state)
  if (!normalized || normalized.phase !== 'answering') return normalized
  const activeSet = new Set(activePlayerIds)
  const submittedPlayerIds = Object.keys(normalized.submissions)
    .filter((playerId) => activeSet.has(playerId))
  return {
    ...normalized,
    phase: 'voting',
    deadlineAt: now + SECRET_VOTE_DURATION_MS,
    votes: {},
    revealOrder: shuffledPlayerIds(
      submittedPlayerIds,
      `${normalized.prompt}|${normalized.round}|${submittedPlayerIds.sort().join('|')}`,
    ),
    voteCounts: {},
    winners: [],
  }
}

export function submitSecretVote(state, voterId, answerPlayerId) {
  const normalized = normalizeSecretVote(state)
  if (
    !normalized
    || normalized.phase !== 'voting'
    || !voterId
    || voterId === answerPlayerId
    || !normalized.revealOrder.includes(answerPlayerId)
  ) return normalized

  return {
    ...normalized,
    votes: {
      ...normalized.votes,
      [voterId]: answerPlayerId,
    },
  }
}

export function finishSecretVoteRound(state, currentScores, activePlayerIds) {
  const normalized = normalizeSecretVote(state)
  if (!normalized || normalized.phase !== 'voting') {
    return { secretVote: normalized, scores: currentScores || {}, winnerIds: [] }
  }

  const activeSet = new Set(activePlayerIds)
  const answerSet = new Set(normalized.revealOrder)
  const voteCounts = Object.fromEntries(normalized.revealOrder.map((playerId) => [playerId, 0]))
  Object.entries(normalized.votes).forEach(([voterId, answerPlayerId]) => {
    if (
      activeSet.has(voterId)
      && answerSet.has(answerPlayerId)
      && voterId !== answerPlayerId
    ) voteCounts[answerPlayerId] += 1
  })

  const highestVotes = Math.max(0, ...Object.values(voteCounts))
  const winnerIds = highestVotes > 0
    ? Object.keys(voteCounts).filter((playerId) => voteCounts[playerId] === highestVotes)
    : []
  const scores = { ...(currentScores || {}) }
  Object.entries(voteCounts).forEach(([playerId, count]) => {
    scores[playerId] = (scores[playerId] || 0) + count
  })

  return {
    secretVote: {
      ...normalized,
      phase: 'results',
      deadlineAt: 0,
      voteCounts,
      winners: winnerIds,
    },
    scores,
    winnerIds,
  }
}
