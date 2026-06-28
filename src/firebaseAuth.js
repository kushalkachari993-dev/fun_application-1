import { getAuth } from 'firebase/auth'
import { firebaseApp, isFirebaseConfigured } from './firebaseCore'

export { isFirebaseConfigured }

export const auth = firebaseApp ? getAuth(firebaseApp) : null
