// Offline-first sync layer between the local (localStorage) store and
// Firestore. Every page in the app reads/writes through `db` in
// `src/lib/store.js` exactly as before — this module quietly keeps that
// local copy in sync with `users/{uid}/appData/main` in Firestore whenever
// a real Firebase project is configured, and uploads files to Firebase
// Storage for the Documents module.
//
// Architecture:
//   Component -> db.update() -> localStorage (instant, always works)
//                              -> onChange listener here -> debounced
//                                 setDoc() to Firestore (when online)
//   Firestore onSnapshot -> db.set(remoteData, 'remote') -> localStorage
//                              -> React state in open pages re-renders
//
// This gives real-time multi-device sync when Firestore is configured, and
// falls back to a fully working local-only app (localStorage as the DB)
// when it isn't — no component code needs to branch on which mode it's in.

import { db } from './store'
import {
  firestore,
  storage,
  firebaseConfigured,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from '../firebase'

let unsubscribeSnapshot = null
let unsubscribeLocal = null
let currentUid = null
let pushTimer = null
let applyingRemote = false

const PUSH_DEBOUNCE_MS = 800

function docRef(uid) {
  return doc(firestore, 'users', uid, 'appData', 'main')
}

/** Call once after sign-in (and again with null after sign-out). */
export async function initCloudSync(uid) {
  stopCloudSync()
  currentUid = uid
  if (!firebaseConfigured || !uid) return

  const ref = docRef(uid)

  // Seed Firestore from whatever the very first read looks like, so a
  // brand-new account doesn't show an empty document before its first edit.
  try {
    const snap = await getDoc(ref)
    if (snap.exists()) {
      applyingRemote = true
      db.set(snap.data().payload ?? snap.data(), 'remote')
      applyingRemote = false
    } else {
      await setDoc(ref, { payload: db.get(), updatedAt: serverTimestamp() })
    }
  } catch (err) {
    console.warn('Cloud sync initial fetch failed, continuing offline:', err)
  }

  // Live updates from other devices/tabs.
  unsubscribeSnapshot = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return
      applyingRemote = true
      db.set(snap.data().payload ?? snap.data(), 'remote')
      applyingRemote = false
    },
    (err) => console.warn('Cloud sync listener error:', err)
  )

  // Local edits -> push to Firestore (debounced so rapid typing/taps don't
  // spam writes).
  unsubscribeLocal = db.onChange((next, source) => {
    if (source === 'remote' || applyingRemote) return
    clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      setDoc(ref, { payload: next, updatedAt: serverTimestamp() }).catch((err) =>
        console.warn('Cloud sync push failed (will retry on next change):', err)
      )
    }, PUSH_DEBOUNCE_MS)
  })
}

export function stopCloudSync() {
  unsubscribeSnapshot?.()
  unsubscribeLocal?.()
  unsubscribeSnapshot = null
  unsubscribeLocal = null
  clearTimeout(pushTimer)
  currentUid = null
}

export const cloudSyncEnabled = () => firebaseConfigured

/**
 * Upload a real file to Firebase Storage under the signed-in user's
 * documents folder, then write its metadata + download URL into the local
 * store (which — per the flow above — will sync to Firestore too).
 * Falls back to a local object URL when Firebase isn't configured, so the
 * Documents module still works end-to-end in demo mode.
 */
export function uploadDocument(uid, file, { category = 'Personal', onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (!firebaseConfigured || !uid) {
      const url = URL.createObjectURL(file)
      const entry = {
        id: 'd' + Date.now(),
        name: file.name,
        category,
        verified: false,
        url,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      }
      db.update((d) => {
        d.documents.unshift(entry)
        return d
      })
      onProgress?.(100)
      resolve(entry)
      return
    }

    const path = `users/${uid}/documents/${Date.now()}-${file.name}`
    const ref = storageRef(storage, path)
    const task = uploadBytesResumable(ref, file)

    task.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.(pct)
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        const entry = {
          id: 'd' + Date.now(),
          name: file.name,
          category,
          verified: false,
          url,
          storagePath: path,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        }
        db.update((d) => {
          d.documents.unshift(entry)
          return d
        })
        resolve(entry)
      }
    )
  })
}
