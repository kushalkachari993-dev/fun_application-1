import { afterEach, describe, expect, it } from 'vitest'
import { consumeRateLimit, resetRateLimits } from './rate-limit'

afterEach(resetRateLimits)

describe('AI rate limiting', () => {
  it('allows requests up to the configured limit', () => {
    expect(consumeRateLimit('user-1', { limit: 2, now: 1000, windowMs: 5000 })).toMatchObject({
      allowed: true,
      remaining: 1,
    })
    expect(consumeRateLimit('user-1', { limit: 2, now: 1100, windowMs: 5000 })).toMatchObject({
      allowed: true,
      remaining: 0,
    })
  })

  it('blocks excess requests and reports when to retry', () => {
    consumeRateLimit('user-1', { limit: 1, now: 1000, windowMs: 5000 })
    expect(consumeRateLimit('user-1', { limit: 1, now: 2000, windowMs: 5000 })).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 4,
    })
  })

  it('starts a fresh bucket after the window expires', () => {
    consumeRateLimit('user-1', { limit: 1, now: 1000, windowMs: 5000 })
    expect(consumeRateLimit('user-1', { limit: 1, now: 6000, windowMs: 5000 })).toMatchObject({
      allowed: true,
      remaining: 0,
    })
  })
})
