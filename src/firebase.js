import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
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
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
  runTransaction,
  enableIndexedDbPersistence,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only initialize if a key is present. This lets the app still run in a pure
// "demo mode" (mock auth + localStorage-only data) if the person hasn't wired
// up a real Firebase project yet. Once real keys are supplied in .env, the
// exact same code paths switch to live Firebase Auth + Firestore + Storage —
// nothing else in the app needs to change.
export const firebaseConfigured = Boolean(firebaseConfig.apiKey)

let app, auth, googleProvider, firestore, storage

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  firestore = getFirestore(app)
  storage = getStorage(app)

  // Persist Firestore reads/writes in IndexedDB so the app keeps working
  // offline and syncs automatically once connectivity returns.
  enableIndexedDbPersistence(firestore).catch((err) => {
    // Fails in multi-tab scenarios or unsupported browsers — non-fatal,
    // the app just falls back to network-only Firestore + localStorage cache.
    console.warn('Firestore offline persistence not enabled:', err.code)
  })
}

export {
  auth,
  googleProvider,
  firestore,
  storage,
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
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
  runTransaction,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
  arrayUnion,
  arrayRemove,
}
