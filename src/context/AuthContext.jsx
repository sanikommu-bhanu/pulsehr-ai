import { createContext, useContext, useEffect, useState } from 'react'
import {
  auth,
  googleProvider,
  firebaseConfigured,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from '../firebase'
import { createCompany, joinCompanyByCode, getMembership } from '../lib/companyStore'
import { db } from '../lib/store'
import { initCloudSync, stopCloudSync } from '../lib/cloudSync'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// Local (no-Firebase-project-yet) auth: a real, self-contained account
// system backed by localStorage — not a single canned "demo user". Anyone
// can create as many accounts as they like; passwords are only ever
// compared, never displayed back. This is what makes `npm run dev` work
// immediately with zero setup, while every account, company and record
// created this way is genuinely user-generated.
const LOCAL_USERS_KEY = 'pulsehr_local_users'
const LOCAL_SESSION_KEY = 'pulsehr_local_session'

function readLocalUsers() {
  try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]') } catch { return [] }
}
function writeLocalUsers(rows) { localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(rows)) }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [membership, setMembership] = useState(null) // { companyId, role }
  const [loading, setLoading] = useState(true)

  async function loadMembership(uid) {
    if (!uid) { setMembership(null); return }
    const m = await getMembership(uid)
    setMembership(m)
  }

  useEffect(() => {
    if (firebaseConfigured) {
      const unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u)
        db.configure(u)
        if (u) {
          await loadMembership(u.uid)
          initCloudSync(u.uid)
        } else {
          stopCloudSync()
        }
        setLoading(false)
      })
      return unsub
    } else {
      const raw = localStorage.getItem(LOCAL_SESSION_KEY)
      const u = raw ? JSON.parse(raw) : null
      setUser(u)
      db.configure(u)
      if (u) loadMembership(u.uid).finally(() => setLoading(false))
      else setLoading(false)
    }
  }, [])

  function persistLocalUser(u) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(u))
    setUser(u)
    db.configure(u)
  }

  /**
   * accountType: 'hr' | 'employee'
   * hr signUp:       { accountType:'hr', name, email, password, companyName, remember }
   * employee signUp: { accountType:'employee', name, email, password, joinCode, title, department, remember }
   */
  async function signUp({ accountType, name, email, password, remember, companyName, joinCode, title, department }) {
    let firebaseUser
    if (firebaseConfigured) {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      await sendEmailVerification(cred.user)
      firebaseUser = cred.user
    } else {
      const users = readLocalUsers()
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with that email already exists. Try signing in instead.')
      }
      firebaseUser = { uid: 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), displayName: name, email, emailVerified: false, photoURL: null }
      users.push({ ...firebaseUser, password })
      writeLocalUsers(users)
      persistLocalUser(firebaseUser)
    }

    const m = accountType === 'hr'
      ? await createCompany({ uid: firebaseUser.uid, name, email, companyName })
      : await joinCompanyByCode({ uid: firebaseUser.uid, name, email, joinCode, title, department })
    setMembership(m)
    return firebaseUser
  }

  async function signIn({ email, password, remember }) {
    if (firebaseConfigured) {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await loadMembership(cred.user.uid)
      return cred.user
    }
    const users = readLocalUsers()
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!found) throw new Error('Incorrect email or password.')
    const { password: _pw, ...safeUser } = found
    persistLocalUser(safeUser)
    await loadMembership(safeUser.uid)
    return safeUser
  }

  async function signInGoogle() {
    if (firebaseConfigured) {
      const cred = await signInWithPopup(auth, googleProvider)
      await loadMembership(cred.user.uid)
      return cred.user
    }
    throw new Error('Google sign-in needs a real Firebase project configured in .env — see docs/INSTALLATION.md.')
  }

  async function resetPassword(email) {
    if (firebaseConfigured) {
      await sendPasswordResetEmail(auth, email)
      return
    }
    const users = readLocalUsers()
    if (!users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('No account found with that email.')
    }
    // Local mode has no email transport — this is surfaced honestly in the UI
    // rather than pretending an email was sent.
    throw new Error('Password reset email requires a configured Firebase project. Contact your HR admin to reset it manually for now.')
  }

  async function logout() {
    if (firebaseConfigured) {
      await signOut(auth)
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY)
      setUser(null)
    }
    stopCloudSync()
    db.configure(null)
    setMembership(null)
  }

  function markVerified() {
    if (!firebaseConfigured && user) {
      const updated = { ...user, emailVerified: true }
      const users = readLocalUsers().map((u) => (u.uid === user.uid ? { ...u, emailVerified: true } : u))
      writeLocalUsers(users)
      persistLocalUser(updated)
    }
  }

  const value = {
    user,
    loading,
    role: membership?.role || null,
    companyId: membership?.companyId || null,
    firebaseConfigured,
    signUp,
    signIn,
    signInGoogle,
    resetPassword,
    logout,
    markVerified,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
