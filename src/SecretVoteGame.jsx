import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Eye,
  Send,
  Sparkles,
  Trophy,
  Vote,
} from 'lucide-react'
import {
  SECRET_ANSWER_DURATION_MS,
  SECRET_VOTE_DURATION_MS,
} from './secretVote'

function timerLabel(deadlineAt, now) {
  const seconds = Math.max(0, Math.ceil((deadlineAt - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function answerLabel(index) {
  return `Answer ${String.fromCharCode(65 + index)}`
}

export default function SecretVoteGame({
  currentPlayerId,
  isHost,
  matchActive,
  onAdvance,
  onSubmitAnswer,
  onVote,
  players,
  scores,
  state,
}) {
  const [answer, setAnswer] = useState(() => state?.submissions?.[currentPlayerId] || '')
  const [now, setNow] = useState(0)
  const advanceRef = useRef(onAdvance)

  const phase = matchActive ? state?.phase || 'answering' : 'lobby'
  const submissions = state?.submissions || {}
  const votes = state?.votes || {}
  const revealOrder = state?.revealOrder || []
  const playerIds = Object.keys(players)
  const submittedAnswer = submissions[currentPlayerId] || ''
  const selectedVote = votes[currentPlayerId] || ''
  const eligibleVoterIds = playerIds.filter((playerId) => (
    revealOrder.some((answerPlayerId) => answerPlayerId !== playerId)
  ))
  const everyoneAnswered = playerIds.length > 0
    && playerIds.every((playerId) => submissions[playerId])
  const everyoneVoted = eligibleVoterIds.length > 0
    && eligibleVoterIds.every((playerId) => votes[playerId])
  const completedPhase = phase === 'answering'
    ? everyoneAnswered
    : phase === 'voting'
      ? everyoneVoted || revealOrder.length <= 1
      : false

  const rankedScores = useMemo(() => (
    Object.entries(scores || {}).sort(([, first], [, second]) => second - first)
  ), [scores])

  useEffect(() => {
    advanceRef.current = onAdvance
  }, [onAdvance])

  useEffect(() => {
    if (!matchActive || !['answering', 'voting'].includes(phase)) return undefined
    const updateClock = () => setNow(Date.now())
    const starter = window.setTimeout(updateClock, 0)
    const ticker = window.setInterval(updateClock, 250)
    return () => {
      window.clearTimeout(starter)
      window.clearInterval(ticker)
    }
  }, [matchActive, phase, state?.deadlineAt])

  useEffect(() => {
    if (
      !isHost
      || !matchActive
      || !['answering', 'voting'].includes(phase)
      || !state?.deadlineAt
    ) return undefined

    const delay = completedPhase
      ? 900
      : Math.max(0, state.deadlineAt - Date.now())
    const timer = window.setTimeout(() => advanceRef.current(), delay)
    return () => window.clearTimeout(timer)
  }, [completedPhase, isHost, matchActive, phase, state?.deadlineAt])

  function submitAnswer(event) {
    event.preventDefault()
    const cleanAnswer = answer.replace(/\s+/g, ' ').trim()
    if (cleanAnswer) onSubmitAnswer(cleanAnswer)
  }

  const actionLabel = phase === 'answering'
    ? 'Reveal answers'
    : phase === 'voting'
      ? 'Show results'
      : 'Next round'
  const ActionIcon = phase === 'answering' ? Eye : phase === 'voting' ? Trophy : Sparkles
  const actionDisabled = phase === 'answering' && Object.keys(submissions).length === 0
  const initialClock = Math.max(
    0,
    (state?.deadlineAt || 0) - (phase === 'answering' ? SECRET_ANSWER_DURATION_MS : SECRET_VOTE_DURATION_MS),
  )

  return (
    <div className={`secret-vote-game phase-${phase}`}>
      <div className="secret-vote-topline">
        <div>
          <span className="mini-label">Secret Vote · Round {state?.round || 1}</span>
          <strong>
            {phase === 'lobby'
              ? 'Ready for anonymous answers?'
              : phase === 'answering'
                ? 'Write in secret'
                : phase === 'voting'
                  ? 'Vote anonymously'
                  : state?.winners?.length > 1
                    ? 'Tie round!'
                    : 'The room has spoken'}
          </strong>
        </div>
        {matchActive && ['answering', 'voting'].includes(phase) && (
          <span className="secret-vote-timer" aria-label={`${timerLabel(state.deadlineAt, now || initialClock)} remaining`}>
            <Clock3 size={16} />
            {completedPhase ? 'Ready' : timerLabel(state.deadlineAt, now || initialClock)}
          </span>
        )}
      </div>

      <div className="secret-vote-steps" aria-label="Secret Vote round progress">
        {[
          ['answering', 'Answer'],
          ['voting', 'Vote'],
          ['results', 'Results'],
        ].map(([step, label], index) => (
          <span
            className={phase === step ? 'active' : ['voting', 'results'].indexOf(phase) > index ? 'done' : ''}
            key={step}
          >
            {index + 1}. {label}
          </span>
        ))}
      </div>

      <h3>{state?.prompt || 'Submit something funny, then vote for the answer that wins the room.'}</h3>

      {phase === 'lobby' && (
        <div className="secret-vote-intro">
          <Sparkles size={24} />
          <p>Everyone writes privately. Answers appear without names, the room votes, and authors are revealed with the results.</p>
        </div>
      )}

      {phase === 'answering' && (
        <>
          <form className="secret-answer-form" onSubmit={submitAnswer}>
            <label htmlFor="secret-answer">Your answer</label>
            <textarea
              id="secret-answer"
              maxLength="100"
              placeholder="Make the room laugh…"
              rows="3"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
            <div>
              <small>{answer.length}/100</small>
              <button type="submit" disabled={!answer.trim()}>
                {submittedAnswer ? <CheckCircle2 size={17} /> : <Send size={17} />}
                {submittedAnswer ? 'Update answer' : 'Lock answer'}
              </button>
            </div>
          </form>
          <div className="secret-vote-progress" aria-live="polite">
            <span><CheckCircle2 size={16} /> {Object.keys(submissions).length}/{playerIds.length} answers locked</span>
            <small>Answers stay hidden until the reveal.</small>
          </div>
        </>
      )}

      {phase === 'voting' && (
        <div className="secret-answer-grid">
          {revealOrder.length === 0 && <p className="secret-vote-empty">No answers were submitted this round.</p>}
          {revealOrder.map((playerId, index) => {
            const isOwnAnswer = playerId === currentPlayerId
            const selected = selectedVote === playerId
            return (
              <button
                className={`secret-answer-card ${selected ? 'selected' : ''}`}
                type="button"
                key={playerId}
                aria-pressed={selected}
                disabled={isOwnAnswer}
                onClick={() => onVote(playerId)}
              >
                <span>{answerLabel(index)} {isOwnAnswer && '· Yours'}</span>
                <strong>{submissions[playerId]}</strong>
                <small>{isOwnAnswer ? 'You cannot vote for yourself' : selected ? 'Your vote' : 'Tap to vote'}</small>
              </button>
            )
          })}
          <div className="secret-vote-progress wide" aria-live="polite">
            <span><Vote size={16} /> {Object.keys(votes).length}/{eligibleVoterIds.length} votes cast</span>
            <small>You can change your vote until results appear.</small>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <>
          <div className="secret-answer-grid results">
            {revealOrder.map((playerId, index) => {
              const voteCount = state.voteCounts?.[playerId] || 0
              const winner = state.winners?.includes(playerId)
              return (
                <article className={`secret-answer-card ${winner ? 'winner' : ''}`} key={playerId}>
                  <span>{winner ? '🏆 Round winner' : answerLabel(index)}</span>
                  <strong>{submissions[playerId]}</strong>
                  <small>By {players[playerId]?.name || 'Player'} · {voteCount} {voteCount === 1 ? 'vote' : 'votes'}</small>
                </article>
              )
            })}
            {revealOrder.length === 0 && <p className="secret-vote-empty">No answers this round. Try a fresh prompt.</p>}
          </div>
          <div className="secret-score-strip" aria-label="Secret Vote scores">
            {rankedScores.map(([playerId, score], index) => (
              <span key={playerId}>
                <small>#{index + 1}</small>
                <strong>{players[playerId]?.name || 'Player'}</strong>
                <b>{score}</b>
              </span>
            ))}
          </div>
        </>
      )}

      {matchActive && (
        <div className="secret-vote-host-action">
          {isHost ? (
            <button type="button" disabled={actionDisabled} onClick={onAdvance}>
              <ActionIcon size={17} />
              {actionLabel}
            </button>
          ) : (
            <small>
              {phase === 'results' ? 'Waiting for the host to start the next round.' : 'The round advances automatically when everyone is done.'}
            </small>
          )}
        </div>
      )}
    </div>
  )
}
