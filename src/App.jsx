import { useState } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import './App.css'

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

const roomGames = ['Truth or Dare', "Who's Most Likely To", 'Would You Rather']

const pages = [
  {
    path: '/girlfriend-meter',
    title: 'Girlfriend Happiness Meter',
    description: 'A very official mood detector with zero scientific backing.',
    accent: 'meter',
  },
  {
    path: '/friendship-tracker',
    title: 'Friendship Level Tracker',
    description: 'Fake stats for real friends with suspicious reply times.',
    accent: 'friends',
  },
  {
    path: '/apology-generator',
    title: 'Apology Generator',
    description: 'Emergency sorry messages for emotional damage control.',
    accent: 'apology',
  },
  {
    path: '/compliment-generator',
    title: 'Compliment Generator',
    description: 'Sweet lines for girlfriend mode and friendship mode.',
    accent: 'compliment',
  },
  {
    path: '/date-spinner',
    title: 'Date Plan Spinner',
    description: 'Random cute plans for when both of you say "you decide."',
    accent: 'date',
  },
  {
    path: '/emergency-kit',
    title: 'Girlfriend Emergency Kit',
    description: 'Fake survival plans for very real relationship weather.',
    accent: 'emergency',
  },
  {
    path: '/secret',
    title: 'Secret Page',
    description: 'A tiny hidden corner for one cute message.',
    accent: 'secret',
  },
  {
    path: '/mission-wheel',
    title: 'Mission Wheel',
    description: 'Spin for one tiny chaotic task to complete today.',
    accent: 'mission',
  },
  {
    path: '/play-room',
    title: 'Play Room',
    description: 'Three quick party games for friends on one screen.',
    accent: 'play',
  },
  {
    path: '/game-room',
    title: 'Game Room',
    description: 'Create a room code, add friends, and run group rounds.',
    accent: 'room',
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

function getInitialRoomCode() {
  const params = new URLSearchParams(window.location.search)
  return params.get('room')?.toUpperCase() || createRoomCode()
}

function promptForGame(game, currentPrompt) {
  if (game === "Who's Most Likely To") return randomItem(likelyPrompts, currentPrompt)
  if (game === 'Would You Rather') {
    const next = randomItem(wouldYouRatherPrompts, currentPrompt)
    return `${next[0]} or ${next[1]}?`
  }
  return randomItem([...truthPrompts, ...darePrompts], currentPrompt)
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
  const [burst, setBurst] = useState(funBursts[0])
  const [alert, setAlert] = useState(chaosAlerts[0])

  function toggleFunMode() {
    setFunMode(!funMode)
    setBurst(randomItem(funBursts, burst))
    setAlert(randomItem(chaosAlerts, alert))
  }

  return (
    <main className={`app-shell ${funMode ? 'fun-mode' : ''}`}>
      <FloatingStickers />
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">JF</span>
          <span>Just For Fun HQ</span>
        </Link>
        <div className="topbar-actions">
          <nav aria-label="Main pages">
            {pages.map((page) => (
              <NavLink key={page.path} to={page.path}>
                {page.title.replace(' Generator', '').replace(' Tracker', '')}
              </NavLink>
            ))}
          </nav>
          <button className="fun-toggle" type="button" onClick={toggleFunMode}>
            {funMode ? 'Chaos Mode On' : 'Chaos Mode'}
          </button>
        </div>
      </header>
      {funMode && (
        <div className="chaos-alert" aria-live="polite">
          {alert}
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
        {burst}
      </button>

      <section className={isHome ? 'hero home-hero' : 'hero compact-hero'}>
        <div>
          <p className="eyebrow">Relationship Control Room</p>
          <h1>{isHome ? 'Relationship HQ for girlfriend and friends' : currentPageTitle(location.pathname)}</h1>
          <p>
            {isHome
              ? 'A fake-serious dashboard for compliments, apologies, friendship stats, and girlfriend happiness checks.'
              : currentPageDescription(location.pathname)}
          </p>
        </div>
        {isHome && <HeroPreview />}
      </section>
      {isHome && <ChaosConsole active={funMode} />}

      <Outlet />
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
          <span>Drama risk</span>
          <strong>12%</strong>
        </div>
        <div>
          <span>Snack readiness</span>
          <strong>98%</strong>
        </div>
        <div>
          <span>Reply speed</span>
          <strong>Maybe</strong>
        </div>
      </section>

      <div className="page-grid">
        {pages.map((page, index) => (
          <Link className={`feature-card ${page.accent}`} key={page.path} to={page.path}>
            <div className="feature-topline">
              <span className="feature-number">{String(index + 1).padStart(2, '0')}</span>
              <strong>Open</strong>
            </div>
            <span>{page.title}</span>
            <p>{page.description}</p>
          </Link>
        ))}
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
        <span>Today</span>
        <strong>HQ Online</strong>
      </div>
      <div className="preview-meter">
        <div />
      </div>
      <div className="preview-grid">
        <div>
          <span>Compliments</span>
          <strong>Ready</strong>
        </div>
        <div>
          <span>Apology</span>
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
            Scan Again
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setStatusIndex(Math.floor(Math.random() * girlfriendStatuses.length))}
          >
            Random Mood
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
              Boost Loyalty
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
          Spin Plan
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
          {unlocked ? 'Lock Again' : 'Unlock Secret'}
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
            Spin Mission
          </button>
          <button className="secondary-button" type="button" onClick={() => setCompleted(!completed)}>
            {completed ? 'Undo Done' : 'Mark Done'}
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
  const [roomCode, setRoomCode] = useState(getInitialRoomCode)
  const [players, setPlayers] = useState(['You', 'Best Friend'])
  const [playerName, setPlayerName] = useState('')
  const [game, setGame] = useState(roomGames[0])
  const [prompt, setPrompt] = useState(promptForGame(roomGames[0], ''))
  const [round, setRound] = useState(1)
  const [copied, setCopied] = useState(false)
  const [reactions, setReactions] = useState({ laughs: 0, chaos: 0, skip: 0 })

  function addPlayer(event) {
    event.preventDefault()
    const trimmedName = playerName.trim()
    if (!trimmedName || players.includes(trimmedName)) return
    setPlayers([...players, trimmedName])
    setPlayerName('')
  }

  function startNewRoom() {
    const nextCode = createRoomCode()
    setRoomCode(nextCode)
    setRound(1)
    setReactions({ laughs: 0, chaos: 0, skip: 0 })
    window.history.replaceState(null, '', `/game-room?room=${nextCode}`)
  }

  function copyInvite() {
    const inviteUrl = `${window.location.origin}/game-room?room=${roomCode}`
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  function changeGame(nextGame) {
    setGame(nextGame)
    setPrompt(promptForGame(nextGame, prompt))
    setRound(1)
    setReactions({ laughs: 0, chaos: 0, skip: 0 })
  }

  function nextRound() {
    setPrompt(promptForGame(game, prompt))
    setRound((round) => round + 1)
  }

  return (
    <ToolPage>
      <section className="game-room">
        <div className="room-hero">
          <div>
            <span className="mini-label">Common room</span>
            <h2>Game Room</h2>
            <p>Use one room code, gather names, pick a game, and run the same round together.</p>
          </div>
          <div className="room-code-card">
            <span>Room Code</span>
            <strong>{roomCode}</strong>
            <div className="button-row">
              <button type="button" onClick={copyInvite}>
                {copied ? 'Copied Link' : 'Copy Invite'}
              </button>
              <button className="secondary-button" type="button" onClick={startNewRoom}>
                New Room
              </button>
            </div>
          </div>
        </div>

        <div className="room-layout">
          <aside className="players-panel">
            <div className="date-topline">
              <span className="mini-label">Players</span>
              <strong>{players.length} online</strong>
            </div>
            <div className="player-list">
              {players.map((player, index) => (
                <div className="player-pill" key={player}>
                  <span>{player.slice(0, 1).toUpperCase()}</span>
                  <strong>{player}</strong>
                  {index === 0 && <small>Host</small>}
                </div>
              ))}
            </div>
            <form className="player-form" onSubmit={addPlayer}>
              <input
                aria-label="Friend name"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Add friend name"
              />
              <button type="submit">Add</button>
            </form>
          </aside>

          <section className="round-board">
            <div className="room-tabs" aria-label="Game room games">
              {roomGames.map((option) => (
                <button className={game === option ? 'active' : ''} type="button" key={option} onClick={() => changeGame(option)}>
                  {option}
                </button>
              ))}
            </div>
            <div className="round-card">
              <div className="date-topline">
                <span className="mini-label">Round {round}</span>
                <strong>{game}</strong>
              </div>
              <h3>{prompt}</h3>
              <p>Read this out loud. Everyone answers, votes, argues, laughs, then the host hits next round.</p>
              <div className="reaction-row">
                <button type="button" onClick={() => setReactions((reactions) => ({ ...reactions, laughs: reactions.laughs + 1 }))}>
                  Laughs {reactions.laughs}
                </button>
                <button type="button" onClick={() => setReactions((reactions) => ({ ...reactions, chaos: reactions.chaos + 1 }))}>
                  Chaos {reactions.chaos}
                </button>
                <button type="button" onClick={() => setReactions((reactions) => ({ ...reactions, skip: reactions.skip + 1 }))}>
                  Skip {reactions.skip}
                </button>
              </div>
              <button type="button" onClick={nextRound}>
                Next Round
              </button>
            </div>
          </section>
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
          {buttonText}
        </button>
        <button className="secondary-button" type="button" onClick={copyText}>
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
