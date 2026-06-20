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
]

function randomItem(items, current) {
  if (items.length === 1) return items[0]
  let next = current
  while (next === current) {
    next = items[Math.floor(Math.random() * items.length)]
  }
  return next
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">JF</span>
          <span>Just For Fun HQ</span>
        </Link>
        <nav aria-label="Main pages">
          {pages.map((page) => (
            <NavLink key={page.path} to={page.path}>
              {page.title.replace(' Generator', '').replace(' Tracker', '')}
            </NavLink>
          ))}
        </nav>
      </header>

      <section className={isHome ? 'hero home-hero' : 'hero compact-hero'}>
        <p className="eyebrow">Relationship Control Room</p>
        <h1>{isHome ? 'Four tiny tools for girlfriend and friends' : currentPageTitle(location.pathname)}</h1>
        <p>
          {isHome
            ? 'A fake-serious dashboard for compliments, apologies, friendship stats, and girlfriend happiness checks.'
            : currentPageDescription(location.pathname)}
        </p>
      </section>

      <Outlet />
    </main>
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
        {pages.map((page) => (
          <Link className={`feature-card ${page.accent}`} key={page.path} to={page.path}>
            <span>{page.title}</span>
            <p>{page.description}</p>
            <strong>Open</strong>
          </Link>
        ))}
      </div>
    </>
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
