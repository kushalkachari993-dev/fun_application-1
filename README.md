# Just For Fun HQ

A playful React + Vite hangout app for friends, mini games, chaos mode, shared rooms, Chess, and Ludo.

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

## Firebase Game Room Sync

The Game Room works in local demo mode without Firebase config. With Firebase enabled, friends can join from separate devices, choose avatars, ready up, chat live, keep score, save match history, and play synchronized party rounds, Chess, or Ludo.

Chat is stored inside each room document and automatically capped at the latest 60 messages. Match history is capped at 12 results to keep Firestore usage predictable.

1. Create a Firebase project.
2. Add a Web App in Firebase project settings.
3. Create a Cloud Firestore database.
4. Copy `.env.example` to `.env`.
5. Fill in the Firebase values:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

For Vercel, add the same variables in Project Settings -> Environment Variables.

If the Game Room badge says `Offline`, check the message below it:

- `Failed to get document because the client is offline.` usually means the browser/network cannot reach Firestore, Firestore Database is not created, or the Firebase project/env values do not match. The app enables Firestore long-polling auto detection to help on restricted networks.
- `Missing or insufficient permissions` means your Firestore rules are blocking reads/writes.

## Firestore Rules For Testing

For a small friends-only test, you can start with open room rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;
    }
  }
}
```

These rules are convenient for testing, but public. Tighten them before sharing widely.
