import { useEffect, useRef, useState } from 'react'
import {
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
} from 'lucide-react'

function participantSnapshot(participant, local = false) {
  return {
    identity: participant.identity,
    local,
    muted: !participant.isMicrophoneEnabled,
    name: participant.name || (local ? 'You' : 'Player'),
    speaking: participant.isSpeaking,
  }
}

function formatVoiceError(error) {
  const name = error?.name || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Microphone access was blocked. Allow microphone access in your browser and try again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone was found on this device.'
  }
  return error?.message || 'Could not connect to voice. Try again.'
}

export default function VoiceChannel({ authUser, currentPlayer, roomCode }) {
  const roomRef = useRef(null)
  const audioContainerRef = useRef(null)
  const [connectionState, setConnectionState] = useState('idle')
  const [participants, setParticipants] = useState([])
  const [muted, setMuted] = useState(true)
  const [needsAudioStart, setNeedsAudioStart] = useState(false)
  const [error, setError] = useState('')

  const connected = connectionState === 'connected' || connectionState === 'reconnecting'

  function clearAudioElements() {
    audioContainerRef.current?.replaceChildren()
  }

  function refreshParticipants(livekitRoom) {
    const nextParticipants = [
      participantSnapshot(livekitRoom.localParticipant, true),
      ...Array.from(livekitRoom.remoteParticipants.values()).map((participant) => (
        participantSnapshot(participant)
      )),
    ]
    setParticipants(nextParticipants)
    setMuted(!livekitRoom.localParticipant.isMicrophoneEnabled)
  }

  useEffect(() => {
    const audioContainer = audioContainerRef.current
    return () => {
      const livekitRoom = roomRef.current
      roomRef.current = null
      livekitRoom?.removeAllListeners()
      livekitRoom?.disconnect()
      audioContainer?.replaceChildren()
    }
  }, [currentPlayer.id, roomCode])

  async function joinVoice() {
    if (connectionState !== 'idle') return
    if (!authUser) {
      setError('Room sign-in is still connecting. Try joining voice in a moment.')
      return
    }

    setConnectionState('connecting')
    setError('')
    setNeedsAudioStart(false)

    try {
      const idToken = await authUser.getIdToken()
      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode }),
      })
      const payload = await response.json().catch(() => ({
        error: 'The voice token endpoint is unavailable. Run through Vercel locally or deploy the API.',
      }))
      if (!response.ok || !payload.participantToken || !payload.serverUrl) {
        throw new Error(payload.error || 'Could not create a voice session.')
      }

      const { Room, RoomEvent, Track } = await import('livekit-client')
      const livekitRoom = new Room({
        adaptiveStream: true,
        disconnectOnPageLeave: true,
        dynacast: true,
        publishDefaults: {
          dtx: true,
          stopMicTrackOnMute: true,
        },
      })

      const refresh = () => refreshParticipants(livekitRoom)
      livekitRoom
        .on(RoomEvent.ParticipantConnected, refresh)
        .on(RoomEvent.ParticipantDisconnected, refresh)
        .on(RoomEvent.ActiveSpeakersChanged, refresh)
        .on(RoomEvent.TrackMuted, refresh)
        .on(RoomEvent.TrackUnmuted, refresh)
        .on(RoomEvent.LocalTrackPublished, refresh)
        .on(RoomEvent.LocalTrackUnpublished, refresh)
        .on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            const audioElement = track.attach()
            audioElement.autoplay = true
            audioContainerRef.current?.append(audioElement)
          }
          refresh()
        })
        .on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((element) => element.remove())
          refresh()
        })
        .on(RoomEvent.AudioPlaybackStatusChanged, () => {
          setNeedsAudioStart(!livekitRoom.canPlaybackAudio)
        })
        .on(RoomEvent.Reconnecting, () => setConnectionState('reconnecting'))
        .on(RoomEvent.Reconnected, () => setConnectionState('connected'))
        .on(RoomEvent.Disconnected, () => {
          if (roomRef.current !== livekitRoom) return
          roomRef.current = null
          setConnectionState('idle')
          setParticipants([])
          setMuted(true)
          clearAudioElements()
        })

      roomRef.current = livekitRoom
      await livekitRoom.connect(payload.serverUrl, payload.participantToken)
      await livekitRoom.startAudio().catch(() => setNeedsAudioStart(true))

      // The room is already usable for listening while the browser waits for a
      // microphone permission decision. Keep Leave available during that prompt.
      setConnectionState('connected')
      refreshParticipants(livekitRoom)

      try {
        await livekitRoom.localParticipant.setMicrophoneEnabled(true)
      } catch (microphoneError) {
        setError(formatVoiceError(microphoneError))
      }

      refreshParticipants(livekitRoom)
    } catch (joinError) {
      const livekitRoom = roomRef.current
      roomRef.current = null
      livekitRoom?.removeAllListeners()
      await livekitRoom?.disconnect()
      clearAudioElements()
      setConnectionState('idle')
      setParticipants([])
      setMuted(true)
      setError(formatVoiceError(joinError))
    }
  }

  async function toggleMute() {
    const livekitRoom = roomRef.current
    if (!livekitRoom) return

    setError('')
    try {
      await livekitRoom.localParticipant.setMicrophoneEnabled(muted)
      refreshParticipants(livekitRoom)
    } catch (microphoneError) {
      setError(formatVoiceError(microphoneError))
    }
  }

  async function enableAudio() {
    const livekitRoom = roomRef.current
    if (!livekitRoom) return
    try {
      await livekitRoom.startAudio()
      setNeedsAudioStart(!livekitRoom.canPlaybackAudio)
    } catch (audioError) {
      setError(formatVoiceError(audioError))
    }
  }

  async function leaveVoice() {
    const livekitRoom = roomRef.current
    roomRef.current = null
    livekitRoom?.removeAllListeners()
    await livekitRoom?.disconnect()
    clearAudioElements()
    setConnectionState('idle')
    setParticipants([])
    setMuted(true)
    setNeedsAudioStart(false)
    setError('')
  }

  return (
    <section className={`voice-channel ${connected ? 'connected' : ''}`} aria-label="Room voice channel">
      <div className="voice-channel-heading">
        <span className="voice-channel-icon">
          <Headphones size={18} />
        </span>
        <div>
          <span className="mini-label">Voice channel</span>
          <strong>
            {connectionState === 'connecting'
              ? 'Joining voice…'
              : connectionState === 'reconnecting'
                ? 'Reconnecting…'
                : connected
                  ? `${participants.length} connected`
                  : 'Talk while you play'}
          </strong>
        </div>
      </div>

      {connected && (
        <div className="voice-participants" aria-live="polite">
          {participants.map((participant) => (
            <span
              className={`voice-participant ${participant.speaking ? 'speaking' : ''} ${participant.muted ? 'muted' : ''}`}
              key={participant.identity}
              title={`${participant.name}${participant.muted ? ' · Muted' : participant.speaking ? ' · Speaking' : ''}`}
            >
              <span className="voice-avatar">{participant.name.slice(0, 1).toUpperCase()}</span>
              <span>{participant.local ? 'You' : participant.name}</span>
              {participant.muted ? <MicOff size={12} /> : <Mic size={12} />}
            </span>
          ))}
        </div>
      )}

      <div className="voice-channel-actions">
        {connectionState === 'idle' && (
          <button type="button" onClick={joinVoice}>
            <PhoneCall size={17} />
            Join voice
          </button>
        )}
        {connectionState === 'connecting' && (
          <button type="button" disabled>
            <LoaderCircle className="spin" size={17} />
            Connecting
          </button>
        )}
        {connected && (
          <>
            {needsAudioStart && (
              <button className="secondary-button" type="button" onClick={enableAudio}>
                <Volume2 size={17} />
                Enable sound
              </button>
            )}
            <button className={muted ? 'voice-mute muted' : 'voice-mute'} type="button" aria-pressed={muted} onClick={toggleMute}>
              {muted ? <MicOff size={17} /> : <Mic size={17} />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button className="voice-leave" type="button" onClick={leaveVoice}>
              <PhoneOff size={17} />
              Leave
            </button>
          </>
        )}
      </div>

      {error && <p className="voice-channel-error" role="alert">{error}</p>}
      <small className="voice-channel-note">Audio uses LiveKit and is never stored in Firebase.</small>
      <div className="voice-audio-output" aria-hidden="true" ref={audioContainerRef} />
    </section>
  )
}
