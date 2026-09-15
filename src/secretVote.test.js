import { describe, expect, it } from 'vitest'
import {
  cleanSecretAnswer,
  createSecretVoteRound,
  finishSecretVoteRound,
  revealSecretAnswers,
  submitSecretAnswer,
  submitSecretVote,
} from './secretVote'

describe('Secret Vote game engine', () => {
  it('cleans and limits player answers', () => {
    expect(cleanSecretAnswer('  very   funny  ')).toBe('very funny')
    expect(cleanSecretAnswer('x'.repeat(120))).toHaveLength(100)
  })

  it('collects answers and reveals them in a stable anonymous order', () => {
    let state = createSecretVoteRound('', 2, 1_000)
    state = submitSecretAnswer(state, 'player-a', 'Answer A')
    state = submitSecretAnswer(state, 'player-b', 'Answer B')

    const firstReveal = revealSecretAnswers(state, ['player-a', 'player-b'], 2_000)
    const secondReveal = revealSecretAnswers(state, ['player-a', 'player-b'], 2_000)

    expect(firstReveal.phase).toBe('voting')
    expect(firstReveal.revealOrder).toEqual(secondReveal.revealOrder)
    expect(firstReveal.revealOrder).toHaveLength(2)
  })

  it('prevents self-votes and awards one point per valid vote', () => {
    let state = createSecretVoteRound('', 1, 1_000)
    state = submitSecretAnswer(state, 'a', 'Alpha')
    state = submitSecretAnswer(state, 'b', 'Bravo')
    state = submitSecretAnswer(state, 'c', 'Charlie')
    state = revealSecretAnswers(state, ['a', 'b', 'c'], 2_000)
    state = submitSecretVote(state, 'a', 'a')
    expect(state.votes.a).toBeUndefined()

    state = submitSecretVote(state, 'a', 'b')
    state = submitSecretVote(state, 'b', 'a')
    state = submitSecretVote(state, 'c', 'b')
    const result = finishSecretVoteRound(state, { a: 2, b: 0, c: 0 }, ['a', 'b', 'c'])

    expect(result.secretVote.voteCounts).toEqual({
      [state.revealOrder[0]]: state.revealOrder[0] === 'a' ? 1 : state.revealOrder[0] === 'b' ? 2 : 0,
      [state.revealOrder[1]]: state.revealOrder[1] === 'a' ? 1 : state.revealOrder[1] === 'b' ? 2 : 0,
      [state.revealOrder[2]]: state.revealOrder[2] === 'a' ? 1 : state.revealOrder[2] === 'b' ? 2 : 0,
    })
    expect(result.scores).toMatchObject({ a: 3, b: 2, c: 0 })
    expect(result.winnerIds).toEqual(['b'])
  })
})
