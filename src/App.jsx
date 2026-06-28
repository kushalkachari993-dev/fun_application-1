import { Suspense, lazy, useState } from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  Dice5,
  Gamepad2,
  HeartPulse,
  Home as HomeIcon,
  LockKeyhole,
  Menu,
  MessageCircleHeart,
  PartyPopper,
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

const GameRoom = lazy(() => import('./GameRoom'))

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

const aiToneOptions = ['Sweet', 'Funny', 'Sincere', 'Chaotic', 'Wholesome']
const aiBudgetOptions = ['Low', 'Medium', 'High']

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

function formatSyncError(error) {
  const message = error?.message || String(error || '')
  const code = error?.code || ''
  if (code === 'auth/configuration-not-found' || message.toLowerCase().includes('auth/configuration-not-found')) {
    return 'Firebase Anonymous Authentication is not enabled. Open Firebase Console > Authentication > Sign-in method and enable Anonymous.'
  }
  if (code === 'permission-denied' || message.toLowerCase().includes('missing or insufficient permissions')) {
    return 'Firebase rules are blocking this room. Open Firebase Console > Firestore Database > Rules and publish the rules from firestore.rules.'
  }
  if (message.toLowerCase().includes('client is offline')) {
    return 'Firestore is unreachable. Check that the database exists and your Firebase .env values match this project.'
  }
  return message
}

async function ensureAnonymousUser() {
  const [{ auth, isFirebaseConfigured }, { signInAnonymously }] = await Promise.all([
    import('./firebaseAuth'),
    import('firebase/auth'),
  ])

  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Anonymous Authentication is required before using AI tools.')
  }

  if (auth.currentUser) return auth.currentUser

  const credential = await signInAnonymously(auth)
  return credential.user
}

async function generateAiRelationshipContent(tool, answers) {
  const user = await ensureAnonymousUser()
  const token = await user.getIdToken()
  const response = await fetch('/api/generate-relationship-tool', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tool, answers }),
  })

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('AI endpoint is not available. Deploy to Vercel or run the app with Vercel dev.')
  }

  if (!response.ok) {
    const error = new Error(payload.error || 'AI generation failed. Try again in a moment.')
    error.code = payload.code || `http/${response.status}`
    throw error
  }

  return payload || {}
}

function formatAiError(error) {
  const message = formatSyncError(error)
  if (message.includes('GROQ_API_KEY')) {
    return 'Groq is not connected yet. Add GROQ_API_KEY in Vercel Environment Variables and redeploy.'
  }
  if (message.includes('Firebase Anonymous Authentication is required')) {
    return 'Firebase Anonymous Authentication is required for AI tools. Add Firebase env values and enable Anonymous sign-in.'
  }
  return message || 'AI generation failed. Try again in a moment.'
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
        <Route path="game-room" element={<LazyRoute><GameRoom /></LazyRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function LazyRoute({ children }) {
  return (
    <Suspense fallback={(
      <ToolPage>
        <section className="generator-box">
          <span className="mini-label">Loading</span>
          <blockquote>Opening game room...</blockquote>
        </section>
      </ToolPage>
    )}
    >
      {children}
    </Suspense>
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
  const [aiSituation, setAiSituation] = useState('')
  const [aiTone, setAiTone] = useState('Sincere')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  async function generateAiApology() {
    setAiLoading(true)
    setAiError('')
    try {
      const result = await generateAiRelationshipContent('apology', {
        recipient: 'girlfriend',
        situation: aiSituation,
        tone: aiTone,
      })
      if (result.text) setApology(result.text)
    } catch (error) {
      setAiError(formatAiError(error))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <GeneratorPage
      label="Emergency message"
      text={apology}
      buttonText="Generate Sorry"
      onGenerate={() => setApology(randomItem(apologies, apology))}
    >
      <AiAssistPanel
        title="Custom apology"
        buttonText="Write with AI"
        loading={aiLoading}
        error={aiError}
        onGenerate={generateAiApology}
        fields={[
          {
            id: 'tone',
            label: 'Tone',
            type: 'select',
            value: aiTone,
            onChange: setAiTone,
            options: aiToneOptions,
          },
          {
            id: 'situation',
            label: 'Situation',
            value: aiSituation,
            onChange: setAiSituation,
            placeholder: 'What happened?',
            maxLength: 300,
          },
        ]}
      />
    </GeneratorPage>
  )
}

function DateSpinner() {
  const [plan, setPlan] = useState(datePlans[0])
  const [aiBudget, setAiBudget] = useState('Medium')
  const [aiContext, setAiContext] = useState('')
  const [aiMood, setAiMood] = useState('Cozy')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  async function generateAiDatePlan() {
    setAiLoading(true)
    setAiError('')
    try {
      const result = await generateAiRelationshipContent('datePlan', {
        budget: aiBudget,
        context: aiContext,
        mood: aiMood,
      })
      if (result.title && Array.isArray(result.steps)) {
        setPlan({
          title: result.title,
          budget: result.budget || aiBudget.toLowerCase(),
          vibe: result.vibe || 'Thoughtful and easy to enjoy.',
          steps: result.steps,
        })
      }
    } catch (error) {
      setAiError(formatAiError(error))
    } finally {
      setAiLoading(false)
    }
  }

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
        <AiAssistPanel
          title="Custom date plan"
          buttonText="Plan with AI"
          loading={aiLoading}
          error={aiError}
          onGenerate={generateAiDatePlan}
          fields={[
            {
              id: 'budget',
              label: 'Budget',
              type: 'select',
              value: aiBudget,
              onChange: setAiBudget,
              options: aiBudgetOptions,
            },
            {
              id: 'mood',
              label: 'Mood',
              type: 'select',
              value: aiMood,
              onChange: setAiMood,
              options: ['Cozy', 'Funny', 'Romantic', 'Adventurous', 'Lazy'],
            },
            {
              id: 'context',
              label: 'Place or idea',
              value: aiContext,
              onChange: setAiContext,
              placeholder: 'City, time, food craving, or constraint',
              maxLength: 300,
            },
          ]}
        />
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

function AiAssistPanel({ buttonText, disabled = false, error, fields, loading, onGenerate, title }) {
  return (
    <div className="ai-tool-panel">
      <div className="ai-tool-heading">
        <span className="mini-label">Groq AI</span>
        <strong>{title}</strong>
      </div>
      <div className="ai-tool-fields">
        {fields.map((field) => (
          <label key={field.id}>
            {field.label}
            {field.type === 'select' ? (
              <select value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                {field.options.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            ) : (
              <textarea
                rows={field.rows || 3}
                maxLength={field.maxLength || 240}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))}
      </div>
      <button type="button" disabled={disabled || loading} onClick={onGenerate}>
        <Sparkles size={17} />
        {loading ? 'Thinking...' : buttonText}
      </button>
      {error && <p className="ai-tool-error">{error}</p>}
    </div>
  )
}

function ComplimentGenerator() {
  const [mode, setMode] = useState('Girlfriend')
  const [compliment, setCompliment] = useState(compliments[0])
  const [luckyNumber, setLuckyNumber] = useState(97)
  const [aiDetails, setAiDetails] = useState('')
  const [aiTone, setAiTone] = useState('Sweet')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

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

  async function generateAiCompliment() {
    setAiLoading(true)
    setAiError('')
    try {
      const result = await generateAiRelationshipContent('compliment', {
        recipient: mode.toLowerCase(),
        details: aiDetails,
        tone: aiTone,
      })
      if (result.text) {
        setCompliment(result.text)
        setLuckyNumber(Math.floor(Math.random() * 8) + 92)
      }
    } catch (error) {
      setAiError(formatAiError(error))
    } finally {
      setAiLoading(false)
    }
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
      >
        <AiAssistPanel
          title="Personal compliment"
          buttonText="Write with AI"
          loading={aiLoading}
          error={aiError}
          onGenerate={generateAiCompliment}
          fields={[
            {
              id: 'tone',
              label: 'Tone',
              type: 'select',
              value: aiTone,
              onChange: setAiTone,
              options: aiToneOptions,
            },
            {
              id: 'details',
              label: 'Details',
              value: aiDetails,
              onChange: setAiDetails,
              placeholder: 'One thing you like about them',
              maxLength: 300,
            },
          ]}
        />
      </GeneratorPage>
    </ToolPage>
  )
}

function GeneratorPage({ children, label, text, buttonText, onGenerate, embedded = false }) {
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
      {children}
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

