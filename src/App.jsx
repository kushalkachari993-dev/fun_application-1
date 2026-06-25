import { useEffect, useState } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { Chess } from 'chess.js'
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Dice5,
  Gamepad2,
  HeartPulse,
  Home as HomeIcon,
  Laugh,
  LockKeyhole,
  Menu,
  MessageCircleHeart,
  PartyPopper,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import './App.css'
import './polish.css'
import { avatarPresets } from './avatars'
import { ChessGame, LudoGame } from './BoardGames'
import { db, isFirebaseConfigured } from './firebase'
import {
  AvatarPicker,
  PlayerRoster,
  RoomSocialPanel,
  SessionControls,
} from './PartySession'
import {
  createChessState,
  createLudoState,
  restoreLudo,
  serializeLudo,
} from './roomGameEngines'

const girlfriendStatuses = [
  {
    label: 'Stable',
    value: 84,
    note: 'Safe zone. Random compliments still recommended.',
    action: 'Send a cute selfie and keep the peace treaty active.',
  },
  {
    label: 'Needs snacks',
    value: 58,
    note: 'Deploy chocolate, fries, or emotional support momos.',
    action: 'Ask what she wants to eat. Do not guess with confidence.',
  },
  {
    label: 'Suspiciously quiet',
    value: 34,
    note: 'Proceed gently. Ask what happened, then actually listen.',
    action: 'Reduce jokes by 70 percent and increase attention immediately.',
  },
  {
    label: 'Send compliment immediately',
    value: 18,
    note: 'Critical. Use sweet words before making jokes.',
    action: 'Compliment first, explanation later. This is not a drill.',
  },
]

const friends = [
  {
    name: 'Best Friend',
    title: 'Certified chaos partner',
    stats: [
      ['Loyalty', 92],
      ['Roast Power', 88],
      ['Borrowed Money Risk', 47],
      ['Will Reply on Time', 3],
    ],
  },
  {
    name: 'College Friend',
    title: 'Assignment survivor',
    stats: [
      ['Loyalty', 79],
      ['Roast Power', 95],
      ['Borrowed Money Risk', 62],
      ['Will Reply on Time', 18],
    ],
  },
  {
    name: 'Gaming Friend',
    title: 'Online but unavailable',
    stats: [
      ['Loyalty', 86],
      ['Roast Power', 74],
      ['Borrowed Money Risk', 29],
      ['Will Reply on Time', 7],
    ],
  },
]

const apologies = [
  'Sorry, my brain was buffering. I will now behave like a premium boyfriend.',
  'I apologize with full battery, strong network, and zero attitude.',
  'My mistake has been reported to management. Management is me, and I am sorry.',
  'I was wrong, you were right, and my ego has left the chat.',
  'Sorry for acting like a beta version. I am ready for the stable release.',
]

const compliments = [
  'You are the main character, and somehow you still make everyone else look good.',
  'Your smile has better uptime than my internet.',
  'You look like peace, drama, and cuteness signed one partnership deal.',
  'You are my favorite notification.',
  'You have premium-person energy with lifetime validity.',
]

const friendCompliments = [
  'You are annoying, but in a limited edition way.',
  'Your bad ideas somehow create the best memories.',
  'You are the reason simple plans become legendary stories.',
  'Your confidence is inspiring for someone with that playlist.',
  'You are basically family, but with better roast material.',
]

const datePlans = [
  {
    title: 'Street Food Mission',
    budget: 'Medium',
    vibe: 'Laughing while standing near a crowded stall',
    steps: ['Pick one snack each', 'Share one drink', 'Rate everything like serious judges'],
  },
  {
    title: 'Movie Night Treaty',
    budget: 'Low',
    vibe: 'Blanket, snacks, and no judging the movie choice',
    steps: ['Choose comfort movie', 'Overbuy snacks', 'Pause only for important commentary'],
  },
  {
    title: 'Walk + Ice Cream',
    budget: 'Low',
    vibe: 'Soft, simple, secretly perfect',
    steps: ['Take the long route', 'Buy ice cream', 'Pretend the walk was fitness'],
  },
  {
    title: 'Do Nothing Professionally',
    budget: 'Free',
    vibe: 'High quality laziness with emotional benefits',
    steps: ['Sit together', 'Scroll reels', 'Call it bonding research'],
  },
  {
    title: 'Photo Booth Challenge',
    budget: 'Medium',
    vibe: 'Cute photos, questionable poses, permanent evidence',
    steps: ['Find good light', 'Take ten photos', 'Keep the blurry funny one'],
  },
]

const emergencyPlans = {
  Angry: {
    danger: 91,
    opener: 'I understand. I am listening properly now.',
    steps: ['Say sorry without adding a lecture', 'Ask what hurt her', 'Fix one small thing immediately'],
  },
  Sad: {
    danger: 42,
    opener: 'I am here. You do not have to explain everything right now.',
    steps: ['Be soft', 'Offer food or a call', 'Send reassurance twice, not advice ten times'],
  },
  Nothing: {
    danger: 78,
    opener: 'Nothing sounds like something. I am ready when you are.',
    steps: ['Do not celebrate too early', 'Stay available', 'Avoid detective mode unless invited'],
  },
  Food: {
    danger: 64,
    opener: 'Food department is active. Send cravings.',
    steps: ['Ask sweet or spicy', 'Offer two choices', 'Do not say "anything is fine"'],
  },
}

const funBursts = [
  'Snack protocol activated',
  'Drama shield overloaded',
  'Compliment cannon misfired beautifully',
  'Friendship server boosted beyond warranty',
  'Date night probability is now unreasonable',
  'Emergency cuteness detected',
  'Reply speed entered mystery mode',
  'Apology generator requesting emotional backup',
]

const chaosAlerts = [
  'Warning: girlfriend happiness meter has started judging your playlist.',
  'System notice: one friend is online and still not replying.',
  'Alert: snacks are below legally acceptable levels.',
  'Romance engine found 3 unsent compliments in drafts.',
  'Friendship tracker reports suspicious roasting activity.',
]

const missions = [
  {
    title: 'Send a no-context compliment',
    target: 'Girlfriend',
    reward: '+18 happiness points',
    detail: 'Make it specific enough that it cannot be mistaken for a copied line.',
  },
  {
    title: 'Plan a five-minute call',
    target: 'Girlfriend',
    reward: '+1 peace treaty',
    detail: 'The mission succeeds if both people smile before ending the call.',
  },
  {
    title: 'Roast a friend gently',
    target: 'Friends',
    reward: '+12 loyalty damage',
    detail: 'Keep it funny, not personal. Friendship law is watching.',
  },
  {
    title: 'Send the funniest old photo',
    target: 'Friends',
    reward: '+30 memory points',
    detail: 'Bonus points if everyone denies that phase ever happened.',
  },
  {
    title: 'Make a tiny date plan',
    target: 'Girlfriend',
    reward: '+22 romance XP',
    detail: 'One food item, one place, one backup plan. Very official.',
  },
]

const truthPrompts = [
  'What is the funniest thing you have searched online recently?',
  'Who in this group has the most dramatic reaction to small problems?',
  'What is one message you typed but never sent?',
  'What is your most unserious habit?',
  'Who was your first silly crush?',
]

const darePrompts = [
  'Send the third photo in your gallery to the group, no explanation.',
  'Talk like a news reporter for the next two minutes.',
  'Let the group choose your next profile picture for 10 minutes.',
  'Do your best celebrity introduction for yourself.',
  'Text someone "important meeting, call you later" and refuse context.',
]

const likelyPrompts = [
  'Who is most likely to say "I am coming" while still at home?',
  'Who is most likely to laugh at the wrong moment?',
  'Who is most likely to forget why they opened their phone?',
  'Who is most likely to become famous for something random?',
  'Who is most likely to start a plan and then cancel it?',
]

const wouldYouRatherPrompts = [
  ['Only reply with voice notes for a week', 'Only receive voice notes for a week'],
  ['Lose your playlist', 'Lose your chat stickers'],
  ['Always be 10 minutes late', 'Always arrive awkwardly early'],
  ['Have your search history read aloud', 'Have your drafts read aloud'],
  ['Never eat fries again', 'Never drink cold coffee again'],
]

const roomGames = ['Truth or Dare', "Who's Most Likely To", 'Would You Rather', 'Chess', 'Ludo']
const promptRoomGames = roomGames.slice(0, 3)
const playerStorageKey = 'just-for-fun-player'
const chatMessageLimit = 60
const matchHistoryLimit = 12

const pages = [
  {
    path: '/girlfriend-meter',
    title: 'Girlfriend Happiness Meter',
    description: 'A very official mood detector with zero scientific backing.',
    accent: 'meter',
    icon: HeartPulse,
  },
  {
    path: '/friendship-tracker',
    title: 'Friendship Level Tracker',
    description: 'Fake stats for real friends with suspicious reply times.',
    accent: 'friends',
    icon: BarChart3,
  },
  {
    path: '/apology-generator',
    title: 'Apology Generator',
    description: 'Emergency sorry messages for emotional damage control.',
    accent: 'apology',
    icon: MessageCircleHeart,
  },
  {
    path: '/compliment-generator',
    title: 'Compliment Generator',
    description: 'Sweet lines for girlfriend mode and friendship mode.',
    accent: 'compliment',
    icon: Sparkles,
  },
  {
    path: '/date-spinner',
    title: 'Date Plan Spinner',
    description: 'Random cute plans for when both of you say "you decide."',
    accent: 'date',
    icon: Dice5,
  },
  {
    path: '/emergency-kit',
    title: 'Girlfriend Emergency Kit',
    description: 'Fake survival plans for very real relationship weather.',
    accent: 'emergency',
    icon: ShieldAlert,
  },
  {
    path: '/secret',
    title: 'Secret Page',
    description: 'A tiny hidden corner for one cute message.',
    accent: 'secret',
    icon: LockKeyhole,
  },
  {
    path: '/mission-wheel',
    title: 'Mission Wheel',
    description: 'Spin for one tiny chaotic task to complete today.',
    accent: 'mission',
    icon: Target,
  },
  {
    path: '/play-room',
    title: 'Play Room',
    description: 'Three quick party games for friends on one screen.',
    accent: 'play',
    icon: PartyPopper,
  },
  {
    path: '/game-room',
    title: 'Game Room',
    description: 'Create a live party room with chat, scores, Chess, and Ludo.',
    accent: 'room',
    icon: Gamepad2,
  },
]

function randomItem(items, current) {
  if (items.length === 1) return items[0]
  let next = current
  while (next === current) {
    next = items[Math.floor(Math.random() * items.length)]
  }
  return next
}

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function sanitizeRoomCode(value) {
  return value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()
}

function getInitialRoomCode() {
  const params = new URLSearchParams(window.location.search)
  return sanitizeRoomCode(params.get('room') || '') || createRoomCode()
}

function getStoredPlayer() {
  try {
    const storedPlayer = JSON.parse(window.localStorage.getItem(playerStorageKey))
    if (storedPlayer?.id) {
      return {
        id: storedPlayer.id,
        name: typeof storedPlayer.name === 'string' ? storedPlayer.name : '',
        avatar: storedPlayer.avatar || avatarPresets[0].id,
      }
    }
  } catch {
    // A fresh local identity is enough if saved data is unavailable.
  }

  const id = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return {
    id,
    name: '',
    avatar: avatarPresets[Math.abs(id.charCodeAt(0) || 0) % avatarPresets.length].id,
  }
}

function savePlayer(player) {
  window.localStorage.setItem(playerStorageKey, JSON.stringify(player))
}

function createInitialRoom(roomCode, player = null) {
  const game = roomGames[0]
  const now = Date.now()

  return {
    roomCode,
    hostId: player?.id || '',
    players: player
      ? {
          [player.id]: {
            name: player.name,
            avatar: player.avatar || avatarPresets[0].id,
            ready: false,
            points: 0,
            joinedAt: now,
            lastSeen: now,
          },
        }
      : {},
    game,
    prompt: promptForGame(game, ''),
    round: 1,
    reactions: { laughs: 0, chaos: 0, skip: 0 },
    session: createInitialSession(),
    messages: [],
    history: [],
  }
}

function createInitialSession() {
  return {
    status: 'lobby',
    matchId: '',
    game: '',
    scores: {},
    winnerIds: [],
    startedAt: 0,
    endedAt: 0,
  }
}

function createEventId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function systemMessage(text) {
  return {
    id: createEventId(),
    system: true,
    text,
    createdAt: Date.now(),
  }
}

function appendMessages(messages, ...nextMessages) {
  return [...(messages || []), ...nextMessages].slice(-chatMessageLimit)
}

function normalizeRoom(data, roomCode) {
  const fallback = createInitialRoom(roomCode)
  let players = {}

  if (!Array.isArray(data?.players) && data?.players && typeof data.players === 'object') {
    players = Object.fromEntries(
      Object.entries(data.players).map(([playerId, player]) => [
        playerId,
        {
          name: player.name || 'Player',
          avatar: player.avatar || avatarPresets[0].id,
          ready: Boolean(player.ready),
          points: Number(player.points) || 0,
          joinedAt: player.joinedAt || 0,
          lastSeen: player.lastSeen || 0,
        },
      ]),
    )
  }

  return {
    ...fallback,
    ...data,
    roomCode,
    players,
    hostId: data?.hostId || Object.keys(players)[0] || '',
    reactions: {
      ...fallback.reactions,
      ...data?.reactions,
    },
    session: {
      ...fallback.session,
      ...data?.session,
      scores: data?.session?.scores || {},
      winnerIds: data?.session?.winnerIds || [],
    },
    messages: Array.isArray(data?.messages) ? data.messages.slice(-chatMessageLimit) : [],
    history: Array.isArray(data?.history) ? data.history.slice(-matchHistoryLimit) : [],
  }
}

function promptForGame(game, currentPrompt) {
  if (game === "Who's Most Likely To") return randomItem(likelyPrompts, currentPrompt)
  if (game === 'Would You Rather') {
    const next = randomItem(wouldYouRatherPrompts, currentPrompt)
    return `${next[0]} or ${next[1]}?`
  }
  if (!promptRoomGames.includes(game)) return currentPrompt
  return randomItem([...truthPrompts, ...darePrompts], currentPrompt)
}

function freshGamePatch(room) {
  if (room.game === 'Chess') {
    return {
      chess: createChessState(room.players, room.hostId),
    }
  }

  if (room.game === 'Ludo') {
    return {
      ludo: createLudoState(
        room.ludo?.players?.length || Math.min(4, Math.max(2, Object.keys(room.players).length)),
        room.players,
        room.hostId,
      ),
    }
  }

  return {
    prompt: promptForGame(room.game, room.prompt),
    round: 1,
    reactions: { laughs: 0, chaos: 0, skip: 0 },
  }
}

function finishMatchPatch(room, winnerIds, scores = room.session.scores) {
  const endedAt = Date.now()
  const uniqueWinnerIds = [...new Set(winnerIds.filter(Boolean))]
  const playerNames = Object.fromEntries(
    Object.entries(room.players).map(([playerId, player]) => [playerId, player.name]),
  )
  const nextPlayers = Object.fromEntries(
    Object.entries(room.players).map(([playerId, player]) => [
      playerId,
      {
        ...player,
        points: (player.points || 0)
          + (scores[playerId] || 0)
          + (uniqueWinnerIds.includes(playerId) ? 3 : 0),
        ready: false,
      },
    ]),
  )
  const winnerText = uniqueWinnerIds.length
    ? `${uniqueWinnerIds.map((playerId) => playerNames[playerId]).join(' & ')} won ${room.session.game || room.game}.`
    : `${room.session.game || room.game} ended without a declared winner.`
  const match = {
    id: room.session.matchId || createEventId(),
    game: room.session.game || room.game,
    scores,
    winnerIds: uniqueWinnerIds,
    playerNames,
    startedAt: room.session.startedAt || endedAt,
    endedAt,
  }

  return {
    players: nextPlayers,
    session: {
      ...room.session,
      status: 'finished',
      scores,
      winnerIds: uniqueWinnerIds,
      endedAt,
    },
    history: [...(room.history || []), match].slice(-matchHistoryLimit),
    messages: appendMessages(room.messages, systemMessage(winnerText)),
  }
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="girlfriend-meter" element={<GirlfriendMeter />} />
        <Route path="friendship-tracker" element={<FriendshipTracker />} />
        <Route path="apology-generator" element={<ApologyGenerator />} />
        <Route path="compliment-generator" element={<ComplimentGenerator />} />
        <Route path="date-spinner" element={<DateSpinner />} />
        <Route path="emergency-kit" element={<EmergencyKit />} />
        <Route path="secret" element={<SecretPage />} />
        <Route path="mission-wheel" element={<MissionWheel />} />
        <Route path="play-room" element={<PlayRoom />} />
        <Route path="game-room" element={<GameRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [funMode, setFunMode] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [burst, setBurst] = useState(funBursts[0])
  const [alert, setAlert] = useState(chaosAlerts[0])
  const currentPage = pages.find((page) => page.path === location.pathname)
  const relationshipPages = pages.slice(0, 8)
  const playPages = pages.slice(8)

  function toggleFunMode() {
    setFunMode(!funMode)
    setBurst(randomItem(funBursts, burst))
    setAlert(randomItem(chaosAlerts, alert))
  }

  return (
    <main className={`app-shell ${funMode ? 'fun-mode' : ''}`}>
      <FloatingStickers />
      <button
        className={`sidebar-scrim ${navOpen ? 'visible' : ''}`}
        type="button"
        aria-label="Close navigation"
        onClick={() => setNavOpen(false)}
      />
      <aside className={`app-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link className="brand" to="/" onClick={() => setNavOpen(false)}>
            <span className="brand-mark"><Sparkles size={19} /></span>
            <span>
              <strong>Just For Fun</strong>
              <small>Relationship HQ</small>
            </span>
          </Link>
          <button className="icon-button sidebar-close" type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)}>
            <X size={19} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main pages">
          <NavLink end to="/" onClick={() => setNavOpen(false)}>
            <HomeIcon size={18} />
            <span>Overview</span>
          </NavLink>
          <span className="nav-section-label">Relationship tools</span>
          {relationshipPages.map((page) => {
            const Icon = page.icon
            return (
              <NavLink key={page.path} to={page.path} onClick={() => setNavOpen(false)}>
                <Icon size={18} />
                <span>{page.title.replace(' Generator', '').replace(' Tracker', '')}</span>
              </NavLink>
            )
          })}
          <span className="nav-section-label">Play together</span>
          {playPages.map((page) => {
            const Icon = page.icon
            return (
              <NavLink key={page.path} to={page.path} onClick={() => setNavOpen(false)}>
                <Icon size={18} />
                <span>{page.title}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status">
            <span className="status-dot" />
            <div>
              <strong>HQ operational</strong>
              <small>All systems unserious</small>
            </div>
          </div>
          <button className={`chaos-control ${funMode ? 'active' : ''}`} type="button" onClick={toggleFunMode}>
            <Zap size={17} />
            <span>{funMode ? 'Chaos enabled' : 'Enable chaos'}</span>
          </button>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="workspace-bar">
          <div className="workspace-context">
            <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <span>{isHome ? 'Workspace' : currentPage?.accent === 'play' || currentPage?.accent === 'room' ? 'Play together' : 'Relationship tools'}</span>
              <strong>{isHome ? 'Overview' : currentPageTitle(location.pathname)}</strong>
            </div>
          </div>
          <button className={`header-chaos ${funMode ? 'active' : ''}`} type="button" onClick={toggleFunMode}>
            <Zap size={16} />
            <span>{funMode ? 'Chaos on' : 'Chaos mode'}</span>
          </button>
        </header>

        {funMode && (
          <div className="chaos-alert" aria-live="polite">
            <Zap size={17} />
            <span>{alert}</span>
          </div>
        )}
        <button
          className="burst-badge"
          type="button"
          onClick={() => {
            setBurst(randomItem(funBursts, burst))
            setAlert(randomItem(chaosAlerts, alert))
          }}
        >
          <Sparkles size={15} />
          <span>{burst}</span>
        </button>

        <section className={isHome ? 'hero home-hero' : 'hero compact-hero'}>
          <div>
            <p className="eyebrow">{isHome ? 'Relationship control room' : currentPage?.title}</p>
            <h1>{isHome ? 'Your shared fun dashboard' : currentPageTitle(location.pathname)}</h1>
            <p>
              {isHome
                ? 'Quick tools, group games, and delightfully unnecessary relationship analytics in one place.'
                : currentPageDescription(location.pathname)}
            </p>
          </div>
          {isHome && <HeroPreview />}
        </section>
        {isHome && <ChaosConsole active={funMode} />}

        <Outlet />
      </div>
    </main>
  )
}

function FloatingStickers() {
  return (
    <div className="floating-stickers" aria-hidden="true">
      <span>LOL</span>
      <span>BRB</span>
      <span>VIP</span>
      <span>100%</span>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="quick-stats" aria-label="Fake dashboard stats">
        <div>
          <span className="stat-icon danger"><Activity size={18} /></span>
          <span>Drama risk</span>
          <strong>12%</strong>
        </div>
        <div>
          <span className="stat-icon success"><Check size={18} /></span>
          <span>Snack readiness</span>
          <strong>98%</strong>
        </div>
        <div>
          <span className="stat-icon info"><Zap size={18} /></span>
          <span>Reply speed</span>
          <strong>Maybe</strong>
        </div>
      </section>

      <div className="page-grid">
        {pages.map((page) => {
          const Icon = page.icon
          return (
          <Link className={`feature-card ${page.accent}`} key={page.path} to={page.path}>
            <div className="feature-topline">
              <span className="feature-number"><Icon size={20} /></span>
              <ChevronRight size={19} />
            </div>
            <span>{page.title}</span>
            <p>{page.description}</p>
          </Link>
          )
        })}
      </div>
    </>
  )
}

function ChaosConsole({ active }) {
  const consoleItems = active
    ? ['Compliment cannon: unstable', 'Snack radar: screaming', 'Friend reply estimate: fictional']
    : ['Compliment cannon: ready', 'Snack radar: calm', 'Friend reply estimate: optimistic']

  return (
    <section className={`chaos-console ${active ? 'active' : ''}`} aria-label="Chaos console">
      <div>
        <span className="mini-label">{active ? 'Chaos console live' : 'Chaos console idle'}</span>
        <h2>{active ? 'Everything is under absolutely fake control' : 'Press Chaos Mode when life is too peaceful'}</h2>
      </div>
      <div className="console-list">
        {consoleItems.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  )
}

function HeroPreview() {
  return (
    <aside className="hero-preview" aria-label="Dashboard preview">
      <div className="preview-header">
        <span>Live snapshot</span>
        <strong><span className="status-dot" /> HQ online</strong>
      </div>
      <div className="preview-meter">
        <div />
      </div>
      <div className="preview-grid">
        <div>
          <span><Sparkles size={14} /> Compliments</span>
          <strong>Ready</strong>
        </div>
        <div>
          <span><MessageCircleHeart size={14} /> Apology</span>
          <strong>Armed</strong>
        </div>
      </div>
      <p>Official status: snacks advised, jokes approved, drama contained.</p>
    </aside>
  )
}

function GirlfriendMeter() {
  const [statusIndex, setStatusIndex] = useState(0)
  const status = girlfriendStatuses[statusIndex]

  return (
    <ToolPage>
      <div className="meter-panel">
        <div className="meter-shell" aria-label={`Happiness level ${status.value} percent`}>
          <div className="meter-fill" style={{ width: `${status.value}%` }} />
        </div>
        <div className="status-row">
          <div>
            <span className="mini-label">Current status</span>
            <h2>{status.label}</h2>
          </div>
          <strong>{status.value}%</strong>
        </div>
        <p>{status.note}</p>
        <div className="next-action">
          <span className="mini-label">Recommended move</span>
          <p>{status.action}</p>
        </div>
        <div className="button-row">
          <button type="button" onClick={() => setStatusIndex((statusIndex + 1) % girlfriendStatuses.length)}>
            <RefreshCw size={17} />
            Scan again
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setStatusIndex(Math.floor(Math.random() * girlfriendStatuses.length))}
          >
            <Dice5 size={17} />
            Random mood
          </button>
        </div>
      </div>
    </ToolPage>
  )
}

function FriendshipTracker() {
  const [boostedFriend, setBoostedFriend] = useState('')

  return (
    <ToolPage>
      <div className="friend-list">
        {friends.map((friend) => (
          <article className={`friend-card ${boostedFriend === friend.name ? 'boosted' : ''}`} key={friend.name}>
            <div>
              <h2>{friend.name}</h2>
              <p>{friend.title}</p>
            </div>
            <div className="stat-list">
              {friend.stats.map(([label, value]) => (
                <div className="stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}%</strong>
                  <div className="stat-track">
                    <div style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setBoostedFriend(friend.name)}>
              <Zap size={17} />
              Boost loyalty
            </button>
          </article>
        ))}
      </div>
    </ToolPage>
  )
}

function ApologyGenerator() {
  const [apology, setApology] = useState(apologies[0])

  return (
    <GeneratorPage
      label="Emergency message"
      text={apology}
      buttonText="Generate Sorry"
      onGenerate={() => setApology(randomItem(apologies, apology))}
    />
  )
}

function DateSpinner() {
  const [plan, setPlan] = useState(datePlans[0])

  return (
    <ToolPage>
      <section className="date-card">
        <div className="date-topline">
          <span className="mini-label">Tonight's official plan</span>
          <strong>{plan.budget} budget</strong>
        </div>
        <h2>{plan.title}</h2>
        <p>{plan.vibe}</p>
        <ol>
          {plan.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button type="button" onClick={() => setPlan(randomItem(datePlans, plan))}>
          <Dice5 size={17} />
          Spin plan
        </button>
      </section>
    </ToolPage>
  )
}

function EmergencyKit() {
  const [selected, setSelected] = useState('Angry')
  const plan = emergencyPlans[selected]

  return (
    <ToolPage>
      <div className="emergency-grid">
        <div className="emergency-options" aria-label="Emergency type">
          {Object.keys(emergencyPlans).map((option) => (
            <button
              className={selected === option ? 'active' : ''}
              type="button"
              key={option}
              onClick={() => setSelected(option)}
            >
              {option === 'Nothing' ? 'She said nothing' : `She is ${option.toLowerCase()}`}
            </button>
          ))}
        </div>
        <section className="emergency-card">
          <div className="status-row">
            <div>
              <span className="mini-label">Risk level</span>
              <h2>{selected}</h2>
            </div>
            <strong>{plan.danger}%</strong>
          </div>
          <p className="opener">"{plan.opener}"</p>
          <div className="meter-shell" aria-label={`Risk level ${plan.danger} percent`}>
            <div className="meter-fill danger-fill" style={{ width: `${plan.danger}%` }} />
          </div>
          <ol>
            {plan.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
    </ToolPage>
  )
}

function SecretPage() {
  const [unlocked, setUnlocked] = useState(false)

  return (
    <ToolPage>
      <section className={`secret-card ${unlocked ? 'unlocked' : ''}`}>
        <span className="mini-label">Secret corner</span>
        <h2>{unlocked ? 'You found the soft launch of my heart' : 'Locked for VIP only'}</h2>
        <p>
          {unlocked
            ? 'This website is silly, but the smile it is trying to create is very serious.'
            : 'Press the button if you are girlfriend, best friend, or officially allowed to know too much.'}
        </p>
        <button type="button" onClick={() => setUnlocked(!unlocked)}>
          {unlocked ? <RotateCcw size={17} /> : <LockKeyhole size={17} />}
          {unlocked ? 'Lock again' : 'Unlock secret'}
        </button>
      </section>
    </ToolPage>
  )
}

function MissionWheel() {
  const [mission, setMission] = useState(missions[0])
  const [completed, setCompleted] = useState(false)

  function spinMission() {
    setMission(randomItem(missions, mission))
    setCompleted(false)
  }

  return (
    <ToolPage>
      <section className={`mission-card ${completed ? 'completed' : ''}`}>
        <div className="date-topline">
          <span className="mini-label">Tiny mission</span>
          <strong>{mission.target}</strong>
        </div>
        <h2>{mission.title}</h2>
        <p>{mission.detail}</p>
        <div className="reward-box">
          <span className="mini-label">Reward</span>
          <p>{completed ? 'Mission logged. You are now officially productive.' : mission.reward}</p>
        </div>
        <div className="button-row">
          <button type="button" onClick={spinMission}>
            <RefreshCw size={17} />
            Spin mission
          </button>
          <button className="secondary-button" type="button" onClick={() => setCompleted(!completed)}>
            {completed ? <RotateCcw size={17} /> : <Check size={17} />}
            {completed ? 'Undo done' : 'Mark done'}
          </button>
        </div>
      </section>
    </ToolPage>
  )
}

function PlayRoom() {
  const games = ['Truth or Dare', "Who's Most Likely To", 'Would You Rather']
  const [game, setGame] = useState(games[0])
  const [truthMode, setTruthMode] = useState('Truth')
  const [truthPrompt, setTruthPrompt] = useState(truthPrompts[0])
  const [darePrompt, setDarePrompt] = useState(darePrompts[0])
  const [likelyPrompt, setLikelyPrompt] = useState(likelyPrompts[0])
  const [ratherPrompt, setRatherPrompt] = useState(wouldYouRatherPrompts[0])
  const [score, setScore] = useState({ chaos: 0, laughs: 0 })

  function addLaugh() {
    setScore((score) => ({ ...score, laughs: score.laughs + 1 }))
  }

  function addChaos() {
    setScore((score) => ({ ...score, chaos: score.chaos + 1 }))
  }

  return (
    <ToolPage>
      <section className="play-room">
        <div className="play-header">
          <div>
            <span className="mini-label">Group game zone</span>
            <h2>Play Room</h2>
            <p>Pass the phone, read the prompt, argue loudly, repeat responsibly.</p>
          </div>
          <div className="play-scoreboard" aria-label="Play room scoreboard">
            <div>
              <span>Laughs</span>
              <strong>{score.laughs}</strong>
            </div>
            <div>
              <span>Chaos</span>
              <strong>{score.chaos}</strong>
            </div>
          </div>
        </div>

        <div className="play-tabs" aria-label="Play room games">
          {games.map((option) => (
            <button className={game === option ? 'active' : ''} type="button" key={option} onClick={() => setGame(option)}>
              {option}
            </button>
          ))}
        </div>

        {game === 'Truth or Dare' && (
          <GamePanel
            label={truthMode}
            title={truthMode === 'Truth' ? truthPrompt : darePrompt}
            description="Choose truth or dare, then let the group judge the bravery level."
            onPrimary={() => {
              if (truthMode === 'Truth') {
                setTruthPrompt(randomItem(truthPrompts, truthPrompt))
              } else {
                setDarePrompt(randomItem(darePrompts, darePrompt))
              }
              addChaos()
            }}
            primaryText="New Prompt"
            extra={
              <div className="segmented-control play-switch" aria-label="Truth or dare mode">
                {['Truth', 'Dare'].map((option) => (
                  <button className={truthMode === option ? 'active' : ''} type="button" key={option} onClick={() => setTruthMode(option)}>
                    {option}
                  </button>
                ))}
              </div>
            }
          />
        )}

        {game === "Who's Most Likely To" && (
          <GamePanel
            label="Vote loudly"
            title={likelyPrompt}
            description="Everyone points at the guilty person. The accused may defend themselves badly."
            onPrimary={() => {
              setLikelyPrompt(randomItem(likelyPrompts, likelyPrompt))
              addLaugh()
            }}
            primaryText="Next Question"
          />
        )}

        {game === 'Would You Rather' && (
          <GamePanel
            label="Pick one"
            title={`${ratherPrompt[0]} or ${ratherPrompt[1]}?`}
            description="No middle option. This is a democracy with unnecessary pressure."
            onPrimary={() => {
              setRatherPrompt(randomItem(wouldYouRatherPrompts, ratherPrompt))
              addChaos()
            }}
            primaryText="Next Choice"
            extra={
              <div className="rather-options">
                <button type="button" onClick={addLaugh}>{ratherPrompt[0]}</button>
                <button type="button" onClick={addLaugh}>{ratherPrompt[1]}</button>
              </div>
            }
          />
        )}
      </section>
    </ToolPage>
  )
}

function GameRoom() {
  const [currentPlayer, setCurrentPlayer] = useState(getStoredPlayer)
  const [room, setRoom] = useState(() => createInitialRoom(
    getInitialRoomCode(),
    currentPlayer.name ? currentPlayer : null,
  ))
  const [hasJoined, setHasJoined] = useState(Boolean(currentPlayer.name))
  const [joinName, setJoinName] = useState(currentPlayer.name)
  const [joinAvatar, setJoinAvatar] = useState(currentPlayer.avatar)
  const [joinCode, setJoinCode] = useState(room.roomCode)
  const [copied, setCopied] = useState(false)
  const [syncStatus, setSyncStatus] = useState(isFirebaseConfigured ? 'Connecting' : 'Local demo')
  const [syncError, setSyncError] = useState('')
  const [presenceNow, setPresenceNow] = useState(Date.now)
  const { game, history, messages, players, prompt, reactions, roomCode, round, session } = room
  const playerEntries = Object.entries(players).sort(([firstId], [secondId]) => {
    if (firstId === room.hostId) return -1
    if (secondId === room.hostId) return 1
    return 0
  })
  const isHost = room.hostId === currentPlayer.id
  const hostPlayer = players[room.hostId]
  const hostIsAway = !hostPlayer || presenceNow - (hostPlayer.lastSeen || 0) >= 120000
  const canControlRoom = isHost || hostIsAway
  const activePlayerEntries = playerEntries.filter(([, player]) => (
    presenceNow - (player.lastSeen || 0) < 120000
  ))
  const nonHostPlayers = activePlayerEntries.filter(([playerId]) => playerId !== room.hostId)
  const allReady = nonHostPlayers.every(([, player]) => player.ready)
  const readyCount = activePlayerEntries.filter(([playerId, player]) => (
    playerId === room.hostId || player.ready
  )).length
  const winnerNames = session.winnerIds
    .map((playerId) => players[playerId]?.name)
    .filter(Boolean)

  useEffect(() => {
    if (!hasJoined) return undefined
    const presenceTimer = window.setInterval(() => setPresenceNow(Date.now()), 30000)
    return () => window.clearInterval(presenceTimer)
  }, [hasJoined])

  useEffect(() => {
    if (!hasJoined || !isFirebaseConfigured) return undefined

    const roomRef = doc(db, 'rooms', roomCode)
    let heartbeatId
    let cancelled = false

    runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(roomRef)
      const now = Date.now()

      if (!snapshot.exists()) {
        const nextRoom = createInitialRoom(roomCode, currentPlayer)
        transaction.set(roomRef, {
          ...nextRoom,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } else {
        const currentRoom = normalizeRoom(snapshot.data(), roomCode)
        const existingPlayer = currentRoom.players[currentPlayer.id]
        const currentHost = currentRoom.players[currentRoom.hostId]
        const shouldClaimHost = !currentHost || now - (currentHost.lastSeen || 0) >= 120000

        transaction.set(roomRef, {
          roomCode,
          hostId: shouldClaimHost ? currentPlayer.id : currentRoom.hostId,
          players: {
            ...currentRoom.players,
            [currentPlayer.id]: {
              name: currentPlayer.name,
              avatar: currentPlayer.avatar,
              ready: existingPlayer?.ready || false,
              points: existingPlayer?.points || 0,
              joinedAt: existingPlayer?.joinedAt || now,
              lastSeen: now,
            },
          },
          updatedAt: serverTimestamp(),
        }, { merge: true })
      }
    })
      .then(() => {
        if (cancelled) return
        heartbeatId = window.setInterval(() => {
          setDoc(roomRef, {
            players: {
              [currentPlayer.id]: {
                name: currentPlayer.name,
                avatar: currentPlayer.avatar,
                lastSeen: Date.now(),
              },
            },
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {
            setSyncStatus('Reconnecting')
          })
        }, 45000)
      })
      .catch((error) => {
        setSyncStatus('Offline')
        setSyncError(error.message)
      })

    const unsubscribe = onSnapshot(
      roomRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.exists()) {
          return
        }
        setRoom(normalizeRoom(snapshot.data(), roomCode))
        setSyncStatus(snapshot.metadata.fromCache ? 'Reconnecting' : 'Live')
        setSyncError('')
      },
      (error) => {
        setSyncStatus('Offline')
        setSyncError(error.message)
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
      window.clearInterval(heartbeatId)
    }
  }, [currentPlayer, hasJoined, roomCode])

  function mutateRoom(createPatch, { hostOnly = false } = {}) {
    if (hostOnly && !canControlRoom) return

    if (!isFirebaseConfigured) {
      setRoom((currentRoom) => ({
        ...currentRoom,
        hostId: hostOnly && currentRoom.hostId !== currentPlayer.id
          ? currentPlayer.id
          : currentRoom.hostId,
        ...createPatch(currentRoom),
      }))
      return
    }

    setSyncStatus('Saving')
    runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'rooms', roomCode)
      const snapshot = await transaction.get(roomRef)
      if (!snapshot.exists()) throw new Error('This room no longer exists.')

      const currentRoom = normalizeRoom(snapshot.data(), roomCode)
      const currentHost = currentRoom.players[currentRoom.hostId]
      const currentHostIsAway = !currentHost || Date.now() - (currentHost.lastSeen || 0) >= 120000
      if (hostOnly && currentRoom.hostId !== currentPlayer.id && !currentHostIsAway) return

      transaction.set(roomRef, {
        ...(hostOnly && currentRoom.hostId !== currentPlayer.id
          ? { hostId: currentPlayer.id }
          : {}),
        ...createPatch(currentRoom),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }).catch((error) => {
      setSyncStatus('Offline')
      setSyncError(error.message)
    })
  }

  function joinRoom(event) {
    event.preventDefault()
    const name = joinName.trim().slice(0, 24)
    const code = sanitizeRoomCode(joinCode)
    if (!name || code.length < 4) return

    const nextPlayer = { ...currentPlayer, name, avatar: joinAvatar }
    savePlayer(nextPlayer)
    setCurrentPlayer(nextPlayer)
    setRoom(createInitialRoom(code, nextPlayer))
    setPresenceNow(Date.now())
    setJoinCode(code)
    setHasJoined(true)
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    window.history.replaceState(null, '', `/game-room?room=${code}`)
  }

  function startNewRoom() {
    const nextCode = createRoomCode()
    const nextRoom = createInitialRoom(nextCode, currentPlayer)
    setRoom(nextRoom)
    setJoinCode(nextCode)
    setSyncStatus(isFirebaseConfigured ? 'Connecting' : 'Local demo')
    setSyncError('')
    window.history.replaceState(null, '', `/game-room?room=${nextCode}`)
  }

  async function copyInvite() {
    const inviteUrl = `${window.location.origin}/game-room?room=${roomCode}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setSyncError('Could not copy the link. Copy it from the browser address bar.')
    }
  }

  function changeGame(nextGame) {
    if (session.status === 'playing') return

    mutateRoom((currentRoom) => {
      const patch = {
        game: nextGame,
        prompt: promptForGame(nextGame, currentRoom.prompt),
        round: 1,
        reactions: { laughs: 0, chaos: 0, skip: 0 },
        session: createInitialSession(),
        players: Object.fromEntries(
          Object.entries(currentRoom.players).map(([playerId, player]) => [
            playerId,
            { ...player, ready: false },
          ]),
        ),
      }

      if (nextGame === 'Chess') {
        patch.chess = currentRoom.chess || createChessState(
          currentRoom.players,
          currentRoom.hostId,
        )
      }

      if (nextGame === 'Ludo') {
        patch.ludo = currentRoom.ludo || createLudoState(
          2,
          currentRoom.players,
          currentRoom.hostId,
        )
      }

      return patch
    }, { hostOnly: true })
  }

  function nextRound() {
    if (session.status !== 'playing') return
    mutateRoom((currentRoom) => ({
      prompt: promptForGame(currentRoom.game, currentRoom.prompt),
      round: currentRoom.round + 1,
      reactions: { laughs: 0, chaos: 0, skip: 0 },
    }), { hostOnly: true })
  }

  function addReaction(reaction) {
    if (session.status !== 'playing') return
    mutateRoom((currentRoom) => ({
      reactions: {
        ...currentRoom.reactions,
        [reaction]: currentRoom.reactions[reaction] + 1,
      },
    }))
  }

  function claimChessSeat(color) {
    mutateRoom((currentRoom) => {
      const chessState = currentRoom.chess || createChessState(
        currentRoom.players,
        currentRoom.hostId,
      )
      const seatId = chessState.seats[color]
      if (seatId && seatId !== currentPlayer.id) return {}

      return {
        chess: {
          ...chessState,
          seats: {
            ...chessState.seats,
            [color]: seatId === currentPlayer.id ? '' : currentPlayer.id,
          },
        },
      }
    })
  }

  function moveChess(from, to) {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const chessState = currentRoom.chess || createChessState(
        currentRoom.players,
        currentRoom.hostId,
      )
      const chess = new Chess(chessState.fen)
      const seatId = chessState.seats[chess.turn()]
      const isSoloHost = Object.keys(currentRoom.players).length === 1
        && currentRoom.hostId === currentPlayer.id
      const canMove = seatId === currentPlayer.id
        || (!seatId && currentRoom.hostId === currentPlayer.id)
        || isSoloHost
      if (!canMove) return {}

      try {
        const move = chess.move({ from, to, promotion: 'q' })
        const patch = {
          chess: {
            ...chessState,
            fen: chess.fen(),
            lastMove: {
              from: move.from,
              to: move.to,
              san: move.san,
            },
          },
        }
        if (chess.isGameOver()) {
          const winnerId = chess.isCheckmate()
            ? chessState.seats[chess.turn() === 'w' ? 'b' : 'w']
            : ''
          return {
            ...patch,
            ...finishMatchPatch(
              currentRoom,
              winnerId ? [winnerId] : [],
              winnerId ? { ...currentRoom.session.scores, [winnerId]: 3 } : currentRoom.session.scores,
            ),
          }
        }
        return patch
      } catch {
        return {}
      }
    })
  }

  function resetChess() {
    mutateRoom((currentRoom) => ({
      chess: createChessState(currentRoom.players, currentRoom.hostId),
    }), { hostOnly: true })
  }

  function claimLudoSeat(color) {
    mutateRoom((currentRoom) => {
      const ludoState = currentRoom.ludo || createLudoState(
        2,
        currentRoom.players,
        currentRoom.hostId,
      )
      const seatId = ludoState.seats[color]
      if (seatId && seatId !== currentPlayer.id) return {}

      return {
        ludo: {
          ...ludoState,
          seats: {
            ...ludoState.seats,
            [color]: seatId === currentPlayer.id ? '' : currentPlayer.id,
          },
        },
      }
    })
  }

  function rollLudoDice() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const ludoState = currentRoom.ludo || createLudoState(
        2,
        currentRoom.players,
        currentRoom.hostId,
      )
      const seatId = ludoState.seats[ludoState.turn]
      const isSoloHost = Object.keys(currentRoom.players).length === 1
        && currentRoom.hostId === currentPlayer.id
      const canRoll = seatId === currentPlayer.id
        || (!seatId && currentRoom.hostId === currentPlayer.id)
        || isSoloHost
      if (!canRoll || ludoState.gameState !== 'playerHasToRollADice') return {}

      const ludo = restoreLudo(ludoState)
      ludo.rollDiceForCurrentPiece()
      return { ludo: serializeLudo(ludo, ludoState.seats) }
    })
  }

  function moveLudoToken(tokenIndex) {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const ludoState = currentRoom.ludo
      if (!ludoState) return {}

      const seatId = ludoState.seats[ludoState.turn]
      const isSoloHost = Object.keys(currentRoom.players).length === 1
        && currentRoom.hostId === currentPlayer.id
      const canMove = seatId === currentPlayer.id
        || (!seatId && currentRoom.hostId === currentPlayer.id)
        || isSoloHost
      if (!canMove || !ludoState.validTokenIndices.includes(tokenIndex)) return {}

      const ludo = restoreLudo(ludoState)
      ludo.selectToken(tokenIndex)
      const nextLudo = serializeLudo(ludo, ludoState.seats)
      const winnerColor = nextLudo.ranking[0]
      const winnerId = winnerColor ? nextLudo.seats[winnerColor] : ''
      if (winnerId) {
        return {
          ludo: nextLudo,
          ...finishMatchPatch(
            currentRoom,
            [winnerId],
            { ...currentRoom.session.scores, [winnerId]: 3 },
          ),
        }
      }
      return { ludo: nextLudo }
    })
  }

  function resetLudo(playerCount) {
    mutateRoom((currentRoom) => ({
      ludo: createLudoState(playerCount, currentRoom.players, currentRoom.hostId),
    }), { hostOnly: true })
  }

  function toggleReady() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'lobby') return {}
      const player = currentRoom.players[currentPlayer.id]
      if (!player || currentPlayer.id === currentRoom.hostId) return {}

      return {
        players: {
          ...currentRoom.players,
          [currentPlayer.id]: {
            ...player,
            ready: !player.ready,
          },
        },
      }
    })
  }

  function startMatch() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'lobby') return {}
      const now = Date.now()
      const effectiveRoom = currentRoom.hostId === currentPlayer.id
        ? currentRoom
        : { ...currentRoom, hostId: currentPlayer.id }
      const activeEntries = Object.entries(currentRoom.players).filter(([, player]) => (
        now - (player.lastSeen || 0) < 120000
      ))
      const waitingPlayers = activeEntries.filter(([playerId, player]) => (
        playerId !== currentPlayer.id && !player.ready
      ))
      if (waitingPlayers.length > 0) return {}

      const scores = Object.fromEntries(activeEntries.map(([playerId]) => [playerId, 0]))
      const nextPlayers = Object.fromEntries(
        Object.entries(currentRoom.players).map(([playerId, player]) => [
          playerId,
          { ...player, ready: false },
        ]),
      )

      return {
        ...freshGamePatch(effectiveRoom),
        players: nextPlayers,
        session: {
          status: 'playing',
          matchId: createEventId(),
          game: effectiveRoom.game,
          scores,
          winnerIds: [],
          startedAt: now,
          endedAt: 0,
        },
        messages: appendMessages(
          currentRoom.messages,
          systemMessage(`${effectiveRoom.game} started. Good luck, allegedly.`),
        ),
      }
    }, { hostOnly: true })
  }

  function adjustScore(playerId, amount) {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const currentScore = currentRoom.session.scores[playerId] || 0
      return {
        session: {
          ...currentRoom.session,
          scores: {
            ...currentRoom.session.scores,
            [playerId]: Math.min(99, Math.max(0, currentScore + amount)),
          },
        },
      }
    }, { hostOnly: true })
  }

  function endMatch() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'playing') return {}
      const scores = currentRoom.session.scores || {}
      const highestScore = Math.max(0, ...Object.values(scores))
      const winnerIds = highestScore > 0
        ? Object.keys(scores).filter((playerId) => scores[playerId] === highestScore)
        : []
      return finishMatchPatch(currentRoom, winnerIds, scores)
    }, { hostOnly: true })
  }

  function prepareRematch() {
    mutateRoom((currentRoom) => {
      if (currentRoom.session.status !== 'finished') return {}
      return {
        ...freshGamePatch(currentRoom),
        players: Object.fromEntries(
          Object.entries(currentRoom.players).map(([playerId, player]) => [
            playerId,
            { ...player, ready: false },
          ]),
        ),
        session: createInitialSession(),
        messages: appendMessages(
          currentRoom.messages,
          systemMessage(`Rematch lobby opened for ${currentRoom.game}.`),
        ),
      }
    }, { hostOnly: true })
  }

  function sendChatMessage(text) {
    const cleanText = text.trim().slice(0, 240)
    if (!cleanText) return

    mutateRoom((currentRoom) => ({
      messages: appendMessages(currentRoom.messages, {
        id: createEventId(),
        playerId: currentPlayer.id,
        name: currentPlayer.name,
        avatar: currentPlayer.avatar,
        text: cleanText,
        createdAt: Date.now(),
      }),
    }))
  }

  function editPlayer() {
    setJoinName(currentPlayer.name)
    setJoinAvatar(currentPlayer.avatar)
    setJoinCode(roomCode)
    setHasJoined(false)
  }

  if (!hasJoined) {
    return (
      <ToolPage>
        <section className="game-room room-lobby">
          <div className="lobby-copy">
            <span className="mini-label">Multiplayer lobby</span>
            <h2>Enter the chaos.</h2>
            <p>Pick a name and join with a room code. Each friend should open the invite on their own phone.</p>
            <div className="lobby-note">
              <strong>No account needed</strong>
              <span>Your name is remembered only in this browser.</span>
            </div>
          </div>
          <form className="join-room-form" onSubmit={joinRoom}>
            <label>
              Your name
              <input
                autoFocus
                maxLength="24"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                placeholder="Kushal"
              />
            </label>
            <AvatarPicker value={joinAvatar} onChange={setJoinAvatar} />
            <label>
              Room code
              <input
                inputMode="text"
                maxLength="6"
                value={joinCode}
                onChange={(event) => setJoinCode(sanitizeRoomCode(event.target.value))}
                placeholder="ABC123"
              />
            </label>
            <button type="submit" disabled={!joinName.trim() || joinCode.length < 4}>
              <ArrowRight size={17} />
              Join Room
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setJoinCode(createRoomCode())}
            >
              <RefreshCw size={17} />
              Generate New Code
            </button>
          </form>
        </section>
      </ToolPage>
    )
  }

  return (
    <ToolPage>
      <section className="game-room">
        <div className="room-hero">
          <div>
            <span className="mini-label">Common room</span>
            <h2>The Party Board</h2>
            <p>Ready up, chat live, keep score, and run party prompts or proper board games together.</p>
            <span className={`sync-pill ${syncStatus.toLowerCase().replace(' ', '-')}`}>
              {syncStatus === 'Live' ? 'Firebase live sync' : syncStatus}
            </span>
            {syncError && <p className="sync-error">{syncError}</p>}
          </div>
          <div className="room-code-card">
            <span>Room Code</span>
            <strong>{roomCode}</strong>
            <div className="button-row">
              <button type="button" onClick={copyInvite}>
                <Copy size={17} />
                {copied ? 'Copied Link' : 'Copy Invite'}
              </button>
              <button className="secondary-button" type="button" onClick={startNewRoom}>
                <Plus size={17} />
                New Room
              </button>
            </div>
          </div>
        </div>

        <SessionControls
          allReady={allReady}
          currentPlayer={players[currentPlayer.id]}
          isHost={canControlRoom}
          playerCount={activePlayerEntries.length}
          readyCount={readyCount}
          session={session}
          winnerNames={winnerNames}
          onEnd={endMatch}
          onRematch={prepareRematch}
          onStart={startMatch}
          onToggleReady={toggleReady}
        />

        <div className="room-layout">
          <PlayerRoster
            currentPlayerId={currentPlayer.id}
            hostId={room.hostId}
            isHost={canControlRoom}
            playerEntries={playerEntries}
            presenceNow={presenceNow}
            session={session}
            onAdjustScore={adjustScore}
            onEditProfile={editPlayer}
          />

          <section className="round-board">
            <div className="room-tabs" aria-label="Game room games">
              {roomGames.map((option) => (
                <button
                  className={game === option ? 'active' : ''}
                  type="button"
                  key={option}
                  disabled={!canControlRoom || session.status === 'playing'}
                  onClick={() => changeGame(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {game === 'Chess' && room.chess && (
              <ChessGame
                chessState={room.chess}
                currentPlayerId={currentPlayer.id}
                hostId={room.hostId}
                players={players}
                canReset={canControlRoom && session.status !== 'playing'}
                matchActive={session.status === 'playing'}
                onClaimSeat={claimChessSeat}
                onMove={moveChess}
                onReset={resetChess}
              />
            )}
            {game === 'Ludo' && room.ludo && (
              <LudoGame
                currentPlayerId={currentPlayer.id}
                hostId={room.hostId}
                ludoState={room.ludo}
                players={players}
                canReset={canControlRoom && session.status !== 'playing'}
                matchActive={session.status === 'playing'}
                onClaimSeat={claimLudoSeat}
                onMoveToken={moveLudoToken}
                onReset={resetLudo}
                onRoll={rollLudoDice}
              />
            )}
            {promptRoomGames.includes(game) && (
              <div className="round-card">
                <div className="date-topline">
                  <span className="mini-label">Round {round}</span>
                  <strong>{game}</strong>
                </div>
                <h3>{prompt}</h3>
                <p>Read this out loud. Everyone answers, votes, argues, laughs, then the host hits next round.</p>
                <div className="reaction-row">
                  <button type="button" disabled={session.status !== 'playing'} onClick={() => addReaction('laughs')}>
                    <Laugh size={16} />
                    Laughs {reactions.laughs}
                  </button>
                  <button type="button" disabled={session.status !== 'playing'} onClick={() => addReaction('chaos')}>
                    <Zap size={16} />
                    Chaos {reactions.chaos}
                  </button>
                  <button type="button" disabled={session.status !== 'playing'} onClick={() => addReaction('skip')}>
                    Skip {reactions.skip}
                  </button>
                </div>
                <button type="button" disabled={!canControlRoom || session.status !== 'playing'} onClick={nextRound}>
                  <ArrowRight size={17} />
                  {session.status !== 'playing' ? 'Start match to play' : canControlRoom ? 'Next Round' : 'Waiting for Host'}
                </button>
              </div>
            )}
          </section>

          <RoomSocialPanel
            currentPlayerId={currentPlayer.id}
            history={history}
            messages={messages}
            players={players}
            onSendMessage={sendChatMessage}
          />
        </div>
      </section>
    </ToolPage>
  )
}

function GamePanel({ label, title, description, onPrimary, primaryText, extra }) {
  return (
    <article className="game-panel">
      {extra}
      <span className="mini-label">{label}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" onClick={onPrimary}>
        <WandSparkles size={17} />
        {primaryText}
      </button>
    </article>
  )
}

function ComplimentGenerator() {
  const [mode, setMode] = useState('Girlfriend')
  const [compliment, setCompliment] = useState(compliments[0])
  const [luckyNumber, setLuckyNumber] = useState(97)

  function generateCompliment() {
    const list = mode === 'Girlfriend' ? compliments : friendCompliments
    setCompliment(randomItem(list, compliment))
    setLuckyNumber(Math.floor(Math.random() * 90) + 10)
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setCompliment(nextMode === 'Girlfriend' ? compliments[0] : friendCompliments[0])
    setLuckyNumber(97)
  }

  return (
    <ToolPage>
      <div className="segmented-control" aria-label="Compliment mode">
        {['Girlfriend', 'Friends'].map((option) => (
          <button
            className={mode === option ? 'active' : ''}
            type="button"
            key={option}
            onClick={() => changeMode(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <GeneratorPage
        label={`Compliment quality: ${luckyNumber}%`}
        text={compliment}
        buttonText="Generate Compliment"
        onGenerate={generateCompliment}
        embedded
      />
    </ToolPage>
  )
}

function GeneratorPage({ label, text, buttonText, onGenerate, embedded = false }) {
  const [copied, setCopied] = useState(false)

  function copyText() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const content = (
    <section className="generator-box">
      <span className="mini-label">{label}</span>
      <blockquote>{text}</blockquote>
      <div className="button-row">
        <button type="button" onClick={onGenerate}>
          <WandSparkles size={17} />
          {buttonText}
        </button>
        <button className="secondary-button" type="button" onClick={copyText}>
          <Copy size={17} />
          {copied ? 'Copied' : 'Copy Text'}
        </button>
      </div>
    </section>
  )

  if (embedded) return content

  return (
    <ToolPage>
      {content}
    </ToolPage>
  )
}

function ToolPage({ children }) {
  return <div className="tool-page">{children}</div>
}

function currentPageTitle(pathname) {
  return pages.find((page) => page.path === pathname)?.title ?? 'Just For Fun HQ'
}

function currentPageDescription(pathname) {
  return pages.find((page) => page.path === pathname)?.description ?? ''
}

export default App
