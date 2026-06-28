import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Check,
  Circle,
  Crown,
  Gamepad2,
  History,
  MessageCircle,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trophy,
  UserCheck,
  UserMinus,
  UserRound,
  X,
} from 'lucide-react'
import { avatarPresets } from './avatars'

function avatarPreset(id) {
  return avatarPresets.find((preset) => preset.id === id) || avatarPresets[0]
}

export function PlayerAvatar({ avatar, name, size = 'medium' }) {
  const preset = avatarPreset(avatar)
  const Icon = preset.Icon

  return (
    <span
      className={`player-avatar ${size}`}
      style={{ '--avatar-color': preset.color, '--avatar-soft': preset.soft }}
      title={name}
    >
      <Icon size={size === 'small' ? 14 : size === 'large' ? 24 : 18} />
    </span>
  )
}

export function AvatarPicker({ value, onChange }) {
  return (
    <fieldset className="avatar-picker">
      <legend>Choose an avatar</legend>
      <div>
        {avatarPresets.map((preset) => {
          const Icon = preset.Icon
          return (
            <button
              className={value === preset.id ? 'active' : ''}
              style={{ '--avatar-color': preset.color, '--avatar-soft': preset.soft }}
              type="button"
              key={preset.id}
              aria-label={preset.label}
              title={preset.label}
              onClick={() => onChange(preset.id)}
            >
              <Icon size={19} />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function SessionControls({
  allReady,
  currentPlayer,
  isHost,
  playerCount,
  readyCount,
  session,
  winnerNames,
  onEnd,
  onRematch,
  onStart,
  onToggleReady,
}) {
  const status = session.status || 'lobby'

  return (
    <section className={`session-controls ${status}`}>
      <div className="session-state">
        <span className={`session-state-icon ${status}`}>
          {status === 'playing' ? <Gamepad2 size={18} /> : status === 'finished' ? <Trophy size={18} /> : <Circle size={17} />}
        </span>
        <div>
          <span className="mini-label">
            {status === 'playing' ? 'Match in progress' : status === 'finished' ? 'Match complete' : 'Party lobby'}
          </span>
          <strong>
            {status === 'playing'
              ? session.game
              : status === 'finished'
                ? winnerNames.length
                  ? `${winnerNames.join(' & ')} won`
                  : 'Match ended'
                : `${readyCount} of ${playerCount} ready`}
          </strong>
        </div>
      </div>

      <div className="session-actions">
        {status === 'lobby' && !isHost && (
          <button className={currentPlayer?.ready ? 'ready-button active' : 'ready-button'} type="button" onClick={onToggleReady}>
            <Check size={17} />
            {currentPlayer?.ready ? 'Ready' : 'Mark ready'}
          </button>
        )}
        {status === 'lobby' && isHost && (
          <button type="button" disabled={!allReady} onClick={onStart}>
            <Play size={17} />
            Start match
          </button>
        )}
        {status === 'playing' && isHost && (
          <button className="danger-button" type="button" onClick={onEnd}>
            <Trophy size={17} />
            Finish match
          </button>
        )}
        {status === 'finished' && isHost && (
          <button type="button" onClick={onRematch}>
            <RotateCcw size={17} />
            Prepare rematch
          </button>
        )}
        {status === 'lobby' && isHost && !allReady && (
          <small>Waiting for everyone else to mark ready.</small>
        )}
        {status === 'lobby' && !isHost && (
          <small>The host starts when the room is ready.</small>
        )}
      </div>
    </section>
  )
}

export function PlayerRoster({
  currentPlayerId,
  hostId,
  isHost,
  panelId,
  playerEntries,
  pendingRequests = [],
  presenceNow,
  session,
  onAdjustScore,
  onAcceptRequest,
  onEditProfile,
  onKickPlayer,
  onRejectRequest,
  onTransferHost,
  presenceTimeoutMs = 120000,
}) {
  return (
    <aside className="players-panel" id={panelId}>
      <div className="panel-heading">
        <div>
          <span className="mini-label">Party members</span>
          <strong>{playerEntries.length} players</strong>
        </div>
        <UserRound size={18} />
      </div>

      <div className="player-list">
        {playerEntries.map(([playerId, player]) => {
          const isOnline = presenceNow - (player.lastSeen || 0) < presenceTimeoutMs
          const score = session.scores?.[playerId] || 0
          const canKick = isHost && playerId !== currentPlayerId && playerId !== hostId
          const canTransferHost = isHost
            && isOnline
            && session.status !== 'playing'
            && playerId !== currentPlayerId
            && playerId !== hostId
          return (
            <div className={`session-player ${player.ready ? 'ready' : ''}`} key={playerId}>
              <PlayerAvatar avatar={player.avatar} name={player.name} />
              <div className="session-player-copy">
                <div>
                  <strong>{player.name}</strong>
                  {playerId === hostId && <Crown size={12} aria-label="Host" />}
                </div>
                <small className={isOnline ? 'online' : ''}>
                  {playerId === currentPlayerId ? 'You' : isOnline ? 'Online' : 'Away'}
                  {session.status === 'lobby' && ` / ${playerId === hostId ? 'Host' : player.ready ? 'Ready' : 'Not ready'}`}
                  {session.status === 'finished' && ` / ${player.points || 0} total XP`}
                </small>
              </div>
              <div className="session-player-actions">
                {session.status === 'playing' && (
                  <div className="score-stepper">
                    {isHost && (
                      <button type="button" aria-label={`Remove point from ${player.name}`} disabled={score <= 0} onClick={() => onAdjustScore(playerId, -1)}>
                        <Minus size={13} />
                      </button>
                    )}
                    <strong>{score}</strong>
                    {isHost && (
                      <button type="button" aria-label={`Add point to ${player.name}`} onClick={() => onAdjustScore(playerId, 1)}>
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                )}
                {session.status === 'lobby' && playerId !== hostId && (
                  <span className={`ready-indicator ${player.ready ? 'ready' : ''}`} title={player.ready ? 'Ready' : 'Not ready'}>
                    {player.ready ? <Check size={13} /> : <Circle size={10} />}
                  </span>
                )}
                {canTransferHost && (
                  <button
                    className="transfer-host-button"
                    type="button"
                    aria-label={`Transfer host to ${player.name}`}
                    title={`Transfer host to ${player.name}`}
                    onClick={() => onTransferHost(playerId)}
                  >
                    <UserCheck size={13} />
                  </button>
                )}
                {canKick && (
                  <button
                    className="kick-player-button"
                    type="button"
                    aria-label={`Remove ${player.name} from room`}
                    title={`Remove ${player.name}`}
                    onClick={() => onKickPlayer(playerId)}
                  >
                    <UserMinus size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isHost && pendingRequests.length > 0 && (
        <div className="join-requests-list">
          <div className="join-requests-heading">
            <span className="mini-label">Join requests</span>
            <strong>{pendingRequests.length}</strong>
          </div>
          {pendingRequests.map(([playerId, request]) => (
            <div className="join-request-item" key={playerId}>
              <PlayerAvatar avatar={request.avatar} name={request.name} size="small" />
              <div>
                <strong>{request.name}</strong>
                <small>Attempt {request.attempts || 1}</small>
              </div>
              <button type="button" aria-label={`Accept ${request.name}`} title={`Accept ${request.name}`} onClick={() => onAcceptRequest(playerId)}>
                <Check size={13} />
              </button>
              <button className="reject" type="button" aria-label={`Reject ${request.name}`} title={`Reject ${request.name}`} onClick={() => onRejectRequest(playerId)}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="secondary-button switch-room-button" type="button" onClick={onEditProfile}>
        <UserRound size={16} />
        Edit profile or room
      </button>
    </aside>
  )
}

function formatMessageTime(timestamp) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function RoomSocialPanel({ currentPlayerId, history, messages, players, panelId, onSendMessage }) {
  const [tab, setTab] = useState('chat')
  const [message, setMessage] = useState('')
  const messageListRef = useRef(null)

  useEffect(() => {
    if (tab === 'chat' && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [messages, tab])

  function sendMessage(event) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setMessage('')
  }

  return (
    <aside className="social-panel" id={panelId}>
      <div className="social-tabs" aria-label="Room social views">
        <button className={tab === 'chat' ? 'active' : ''} type="button" onClick={() => setTab('chat')}>
          <MessageCircle size={16} />
          Chat
        </button>
        <button className={tab === 'history' ? 'active' : ''} type="button" onClick={() => setTab('history')}>
          <History size={16} />
          History
        </button>
      </div>

      {tab === 'chat' && (
        <>
          <div className="chat-messages" aria-live="polite" ref={messageListRef}>
            {messages.length === 0 && (
              <div className="chat-empty">
                <MessageCircle size={24} />
                <strong>Room chat is quiet</strong>
                <span>Say hello or begin the pre-game accusations.</span>
              </div>
            )}
            {messages.map((chatMessage) => {
              if (chatMessage.system) {
                return (
                  <div className="system-message" key={chatMessage.id}>
                    <Bot size={14} />
                    <span>{chatMessage.text}</span>
                  </div>
                )
              }

              const sender = players[chatMessage.playerId]
              const own = chatMessage.playerId === currentPlayerId
              return (
                <div className={`chat-message ${own ? 'own' : ''}`} key={chatMessage.id}>
                  {!own && <PlayerAvatar avatar={sender?.avatar || chatMessage.avatar} name={sender?.name || chatMessage.name} size="small" />}
                  <div>
                    <span>
                      {own ? 'You' : sender?.name || chatMessage.name}
                      <time>{formatMessageTime(chatMessage.createdAt)}</time>
                    </span>
                    <p>{chatMessage.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <input
              aria-label="Chat message"
              maxLength="240"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message the room"
            />
            <button type="submit" aria-label="Send message" disabled={!message.trim()}>
              <Send size={17} />
            </button>
          </form>
        </>
      )}

      {tab === 'history' && (
        <div className="match-history">
          {history.length === 0 && (
            <div className="chat-empty">
              <History size={24} />
              <strong>No matches yet</strong>
              <span>Finished games and winners will appear here.</span>
            </div>
          )}
          {history.map((match, index) => (
            <article key={match.id}>
              <span className="history-rank">{history.length - index}</span>
              <div>
                <strong>{match.game}</strong>
                <span>
                  {match.winnerIds?.length
                    ? `${match.winnerIds.map((id) => match.playerNames?.[id] || 'Player').join(' & ')} won`
                    : 'No winner declared'}
                </span>
              </div>
              <Trophy size={17} />
            </article>
          ))}
        </div>
      )}
    </aside>
  )
}
