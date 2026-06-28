import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { firebaseApp, isFirebaseConfigured } from './firebaseCore'

export { firebaseApp, isFirebaseConfigured }
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp
  ? initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    })
  : null
