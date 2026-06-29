import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore'
import {
  BarChart3,
  Bug,
  MessageCircleHeart,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { auth, db, isFirebaseConfigured } from './firebase'

const feedbackFilterOptions = [
  ['all', 'All'],
  ['bug', 'Bugs'],
  ['idea', 'Ideas'],
  ['confusing', 'Confusing'],
  ['love', 'Love'],
  ['aiHelpful', 'AI votes'],
  ['roomExit', 'Room exits'],
]

function formatTime(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null)
  if (!date || Number.isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString([], {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

function AdminFeedback() {
  const [adminReady, setAdminReady] = useState(() => !isFirebaseConfigured || !auth || !db)
  const [adminAllowed, setAdminAllowed] = useState(false)
  const [authUid, setAuthUid] = useState('')
  const [error, setError] = useState(() => (
    !isFirebaseConfigured || !auth || !db
      ? 'Firebase is not configured for the admin dashboard.'
      : ''
  ))
  const [feedback, setFeedback] = useState([])
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  const filteredFeedback = useMemo(() => (
    filter === 'all' ? feedback : feedback.filter((item) => item.type === filter)
  ), [feedback, filter])
  const feedbackCounts = useMemo(() => countBy(feedback, 'type'), [feedback])
  const eventCounts = useMemo(() => countBy(events, 'event'), [events])

  async function loadDashboard(existingUser = null) {
    if (!isFirebaseConfigured || !auth || !db) {
      setError('Firebase is not configured for the admin dashboard.')
      setAdminReady(true)
      return
    }

    setLoading(true)
    setError('')
    try {
      const user = existingUser || auth.currentUser || (await signInAnonymously(auth)).user
      setAuthUid(user.uid)
      const adminSnapshot = await getDoc(doc(db, 'admins', user.uid))
      const allowed = adminSnapshot.exists() && adminSnapshot.data()?.enabled === true
      setAdminAllowed(allowed)
      setAdminReady(true)

      if (!allowed) return

      const [feedbackSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'feedback'), orderBy('createdAt', 'desc'), limit(80))),
        getDocs(query(collection(db, 'analyticsEvents'), orderBy('createdAt', 'desc'), limit(120))),
      ])

      setFeedback(feedbackSnapshot.docs.map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      })))
      setEvents(eventsSnapshot.docs.map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      })))
    } catch (loadError) {
      setError(loadError?.message || 'Could not load feedback.')
      setAdminReady(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUid(user.uid)
        loadDashboard(user)
      } else {
        signInAnonymously(auth).catch((authError) => {
          setError(authError?.message || 'Could not sign in for admin access.')
          setAdminReady(true)
        })
      }
    })
    return unsubscribe
  }, [])

  if (!adminReady) {
    return (
      <div className="tool-page">
        <section className="admin-panel">
          <span className="mini-label">Admin</span>
          <h2>Loading feedback...</h2>
        </section>
      </div>
    )
  }

  if (!adminAllowed) {
    return (
      <div className="tool-page">
        <section className="admin-panel admin-locked">
          <ShieldAlert size={34} />
          <span className="mini-label">Admin access</span>
          <h2>Add your UID to Firestore.</h2>
          <p>Create this document in Firebase Console, then refresh:</p>
          <code>admins/{authUid || 'your_uid'}</code>
          <pre>{'{\n  "enabled": true\n}'}</pre>
          {error && <p className="admin-error">{error}</p>}
          <button type="button" onClick={loadDashboard}>
            <RefreshCw size={17} />
            Retry
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="tool-page">
      <section className="admin-panel">
        <div className="admin-heading">
          <div>
            <span className="mini-label">Admin dashboard</span>
            <h2>Feedback Loop</h2>
            <p>Recent feedback and usage signals from Firestore.</p>
          </div>
          <button type="button" onClick={loadDashboard} disabled={loading}>
            <RefreshCw size={17} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="admin-stat-grid">
          <AdminStat icon={MessageCircleHeart} label="Feedback" value={feedback.length} />
          <AdminStat icon={BarChart3} label="Events" value={events.length} />
          <AdminStat icon={Bug} label="Bugs" value={feedbackCounts.bug || 0} />
          <AdminStat icon={Sparkles} label="AI no votes" value={events.filter((event) => event.event === 'ai_feedback' && event.rating === 'down').length} />
        </div>

        <div className="admin-dashboard-grid">
          <section className="admin-card">
            <div className="admin-card-heading">
              <h3>Feedback</h3>
              <div className="admin-filter-row">
                {feedbackFilterOptions.map(([value, label]) => (
                  <button className={filter === value ? 'active' : ''} type="button" key={value} onClick={() => setFilter(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-list">
              {filteredFeedback.length === 0 ? (
                <p className="admin-empty">No feedback for this filter yet.</p>
              ) : filteredFeedback.map((item) => (
                <article className="admin-list-item" key={item.id}>
                  <div>
                    <span>{item.type}</span>
                    <strong>{item.message || item.value || item.rating || 'No message'}</strong>
                    <small>{item.page || '/'} {item.roomCode ? `- ${item.roomCode}` : ''}</small>
                  </div>
                  <time>{formatTime(item.createdAt)}</time>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-heading">
              <h3>Events</h3>
              <span>{events.length} recent</span>
            </div>
            <div className="admin-event-summary">
              {Object.entries(eventCounts).slice(0, 8).map(([event, count]) => (
                <div key={event}>
                  <span>{event}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <div className="admin-list compact">
              {events.slice(0, 28).map((event) => (
                <article className="admin-list-item" key={event.id}>
                  <div>
                    <span>{event.event}</span>
                    <strong>{event.value || event.rating || event.source || 'Event'}</strong>
                    <small>{event.page || '/'} {event.roomCode ? `- ${event.roomCode}` : ''}</small>
                  </div>
                  <time>{formatTime(event.createdAt)}</time>
                </article>
              ))}
            </div>
          </section>
        </div>
        {error && <p className="admin-error">{error}</p>}
      </section>
    </div>
  )
}

function AdminStat({ icon: Icon, label, value }) {
  return (
    <article className="admin-stat">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export default AdminFeedback
