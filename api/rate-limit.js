const defaultWindowMs = 10 * 60 * 1000
const defaultLimit = 12
const buckets = new Map()

function pruneExpiredBuckets(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function consumeRateLimit(
  key,
  { limit = defaultLimit, now = Date.now(), windowMs = defaultWindowMs } = {},
) {
  if (!key) return { allowed: false, remaining: 0, retryAfterSeconds: 1 }

  if (buckets.size > 500) pruneExpiredBuckets(now)

  const current = buckets.get(key)
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current

  bucket.count += 1
  buckets.set(key, bucket)

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

export function resetRateLimits() {
  buckets.clear()
}
