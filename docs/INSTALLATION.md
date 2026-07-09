# Installation

## Prerequisites
- Node.js 18+ and npm
- (Optional) A Firebase project — for real Auth/Firestore/Storage
- (Optional) A free Google Gemini API key — for live AI responses

## 1. Install dependencies
```bash
npm install
```

## 2. Run in local mode (zero setup)
```bash
npm run dev
```
Open the printed local URL (usually `http://localhost:5173`). Sign up as HR/Admin to create a real company (you'll get a join code), or as an Employee with that code. Every module is fully interactive immediately, backed by real accounts and records in `localStorage` — nothing is pre-seeded, and no `.env` file is required. Open a second tab to see HR and Employee views update each other live.

## 3. (Optional) Enable real Firebase + Gemini
```bash
cp .env.example .env
```
Fill in your Firebase web app config and Gemini API key (see
`README.md` → "Run modes" for the exact console steps), then restart:
```bash
npm run dev
```

## 4. Build for production
```bash
npm run build
npm run preview   # sanity-check the production build locally
```
See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for hosting options.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Blank page after `npm run dev` | Check the terminal for a Vite error; make sure Node is 18+ (`node -v`) |
| Firebase auth errors | Confirm Email/Password and Google are both enabled in Firebase Console → Authentication → Sign-in method |
| AI answers look like generic fallback text | `VITE_GEMINI_API_KEY` is missing/invalid, or the request failed — check the browser console, which logs the exact Gemini error |
| Firestore permission-denied | Make sure `firestore.rules` (and `storage.rules`) have been deployed: `firebase deploy --only firestore:rules,storage:rules` |
| Firestore error mentioning a missing index, with a console link | Deploy `firestore.indexes.json`: `firebase deploy --only firestore:indexes` (or just click the link Firestore prints — it pre-fills the same index) |
