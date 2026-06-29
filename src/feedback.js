import { signInAnonymously } from 'firebase/auth'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from './firebase'

const appVersion = 'web'

async function ensureFeedbackUser() {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error('Firebase is not configured for feedback yet.')
  }

  if (auth.currentUser) return auth.currentUser

  const credential = await signInAnonymously(auth)
  return credential.user
}

function cleanText(value, max = 600) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function baseContext(context = {}) {
  return {
    page: cleanText(context.page || window.location.pathname, 120),
    roomCode: cleanText(context.roomCode || new URLSearchParams(window.location.search).get('room') || '', 20),
    source: cleanText(context.source || '', 80),
    rating: cleanText(context.rating || '', 40),
    value: cleanText(context.value || '', 120),
    appVersion,
    userAgent: cleanText(window.navigator.userAgent, 240),
  }
}

export async function submitFeedback({ type, message = '', ...context }) {
  const user = await ensureFeedbackUser()
  const payload = {
    ...baseContext(context),
    type: cleanText(type, 40),
    message: cleanText(message, 800),
    uid: user.uid,
    createdAt: serverTimestamp(),
  }

  await addDoc(collection(db, 'feedback'), payload)
  await logAnalyticsEvent('feedback_submitted', {
    ...context,
    value: payload.type,
  })
}

export async function logAnalyticsEvent(event, context = {}) {
  if (!isFirebaseConfigured || !auth || !db) return

  try {
    const user = auth.currentUser || (await signInAnonymously(auth)).user
    await addDoc(collection(db, 'analyticsEvents'), {
      ...baseContext(context),
      event: cleanText(event, 60),
      uid: user.uid,
      createdAt: serverTimestamp(),
    })
  } catch {
    // Analytics must never block the product flow.
  }
}
