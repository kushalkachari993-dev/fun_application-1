# Just For Fun HQ

A playful React + Vite hangout app for friends, mini games, chaos mode, shared rooms, Chess, and Ludo.

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

Every push and pull request runs `npm ci`, `npm run lint`, `npm run test`, `npm run api:check`, and `npm run build` through GitHub Actions.

## Groq AI Tools on Vercel

The Apology, Compliment, and Date Plan tools can generate custom ideas with Groq through a Vercel Serverless Function at `/api/generate-relationship-tool`. The React app never stores the Groq API key.

The API function verifies the visitor's Firebase anonymous sign-in token before calling Groq, so keep Anonymous Authentication enabled. It uses:

```txt
model: llama-3.3-70b-versatile
endpoint: https://api.groq.com/openai/v1/chat/completions
```

Add the API key in Vercel:

1. Open Vercel -> Project -> Settings -> Environment Variables.
2. Add `GROQ_API_KEY` with your Groq key.
3. Redeploy the project.

The API also needs your Firebase project id at runtime. If `VITE_FIREBASE_PROJECT_ID` is already set in Vercel for the React app, that is enough. You can also add `FIREBASE_PROJECT_ID` as a server-side variable.

For local AI testing, use Vercel dev with `GROQ_API_KEY` in your local environment. Plain `npm.cmd run dev` runs Vite only, so the `/api` function is not available there.

## Firebase Game Room Sync

The Game Room works in local demo mode without Firebase config. With Firebase enabled, friends can join from separate devices, choose avatars, ready up, chat live, keep score, save match history, and play synchronized party rounds, Chess, or Ludo.

Room data is split across Firestore subcollections so chat, players, join requests, game state, and match history can update independently:

```txt
rooms/{roomId}
rooms/{roomId}/players/{playerId}
rooms/{roomId}/joinRequests/{playerId}
rooms/{roomId}/messages/{messageId}
rooms/{roomId}/gameState/current
rooms/{roomId}/history/{matchId}
```

Chat queries only the latest 60 messages, and match history queries only the latest 12 results to keep Firestore usage predictable.

Hosts can remove non-host players from the room. Each removal adds one strike in `rooms/{roomId}.kickedPlayers`. Strike 1 and 2 remove the player from the roster but let them rejoin; strike 3 blocks that player profile from the room permanently. Kicked players are also cleared from Chess/Ludo seats and current scores.

Hosts can also lock a room. Locked rooms use `rooms/{roomId}/joinRequests/{playerId}` so new players must request access. Hosts can accept or reject pending requests; rejected players can request again later, while permanently blocked players cannot.

Room invites support copy, native share, and QR code options. Hosts can transfer host control to another online player from the roster while the room is outside an active match.

Rooms are created with a 24-hour cleanup timer. The room document stores `expiresAt` for the UI and `expireAt` as a Firestore timestamp. Player, message, game state, and history documents also receive `expireAt`, so you can later enable Firestore TTL policies for old room cleanup.

Rooms also self-heal during joins, room actions, and idle presence checks. Players whose `lastSeen` is more than 2 minutes old are pruned from the roster, current scores, and Chess/Ludo seats. If the host is stale, the room assigns a live player as the new host. If a room has no live players when someone joins later, it is reset with the joining player as host, clears old access state, and advances `resetAt` so old chat/history documents are treated as archived until TTL removes them.

1. Create a Firebase project.
2. Add a Web App in Firebase project settings.
3. Create a Cloud Firestore database.
4. Enable Authentication -> Sign-in method -> Anonymous.
5. Copy `.env.example` to `.env`.
6. Fill in the Firebase values:

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

## Firestore Rules

Publish the rules in `firestore.rules` after Anonymous Authentication is enabled. The rules require signed-in anonymous users, let players update only their own profile/presence, reserve host actions for the current host, and keep chat writes limited to room members.

Firebase Console path:

```txt
Firebase Console -> Firestore Database -> Rules -> paste firestore.rules -> Publish
```

Firebase CLI option:

```bash
firebase deploy --only firestore:rules
```

If the app starts showing permission errors after this change, confirm both pieces are live: Anonymous Auth is enabled, and the latest `firestore.rules` has been published.
