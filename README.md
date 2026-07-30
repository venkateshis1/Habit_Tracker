# MyHabits — Cloud Habit Tracker

A production-ready **multi-user habit tracking web app** with real-time cloud sync, global leaderboard, achievements, and social login. Built on top of a hand-designed vanilla HTML/CSS/JS tracker and layered with a Firebase backend and a thin Next.js runtime.

Feels like **GitHub Contributions × Duolingo × Habitica** — while preserving a custom pixel-perfect UI.

![banner](public/app.html)

---

## ✨ Features

- **Authentication** — Email/Password and Google sign-in (Firebase Auth) with persistent login, email verification, and password reset.
- **Auto-generated User IDs** — Each account gets a unique `HB-YYYY-000001` handle via a Firestore transactional counter.
- **Cloud Habit Sync** — Every create / edit / delete / mark-complete change syncs to Firestore in real time via `onSnapshot` listeners.
- **Score & Ranking** — Automatic score algorithm (`+10 per completion`, `+20 per 7-day block`, `+100 per 30-day block`, `+50 perfect week`, `+300 perfect month`) with a **global top-100 leaderboard**.
- **Podium + Search** — Beautiful top-3 podium (with monochrome medals) plus searchable ranked list, with your row highlighted.
- **Profile Page** — Avatar upload (Firebase Storage), rank, score, streak, longest streak, active habits, 30-day completion %.
- **Achievements** — 11 auto-unlock badges (First Habit, 7-Day, 30-Day, 100 Days, Century, 500 Completions, 1000 Points, Top 100 / 10 / 3, #1) with green outline SVG icons.
- **Activity Feed** — Newest-first list of completions, unlocks, and rank changes.
- **Toasts** — Animated top-center notifications with color-coded icons.
- **Real-Time** — Everything updates live across all logged-in devices.
- **Responsive** — Mobile-optimized podium, leaderboard, achievement grid, and floating bottom nav.

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| UI | Hand-written **HTML + CSS + Vanilla JS** (single file, `public/app.html`) |
| Runtime | **Next.js 15** (App Router, standalone output) — serves the HTML through a Route Handler |
| Auth / DB / Storage | **Firebase** — Authentication, Firestore, Cloud Storage |
| Fonts | Syne + JetBrains Mono (Google Fonts) |
| Icons | Inline SVGs (monochrome `#39FF14`) |

The Next.js layer exists **only** to serve the HTML in production (K8s / Vercel / standalone Node) — all app logic runs 100% in the browser and talks directly to Firebase.

---

## 📁 Project Structure

```
.
├── app/
│   ├── api/[[...path]]/route.js   # Placeholder Next.js API route (MongoDB stub)
│   ├── globals.css                # Global Tailwind styles (not used by app.html)
│   ├── layout.js                  # Root layout (used for any nested pages)
│   ├── providers.js               # Client providers
│   └── route.js                   # Route Handler at '/' — reads public/app.html
│                                    and substitutes env vars (Firebase config)
├── public/
│   └── app.html                   # The entire habit-tracker UI + logic (~2400 lines)
├── components/                    # shadcn/ui components (available for future features)
├── lib/                           # Utility helpers
├── .env.example                   # Copy to `.env` and fill in your own values
├── next.config.js                 # Next.js config (standalone + trace includes)
├── package.json
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites
- **Node.js 18+**
- **Yarn** (recommended) or **npm**
- A **Firebase project** with:
  - Authentication → **Email/Password** enabled (and optionally Google, Apple)
  - **Firestore Database** created (start in "test mode" for local dev)
  - **Cloud Storage** enabled (for profile picture uploads)

### 1. Install dependencies

```bash
yarn install
# — or —
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and paste your Firebase config values. You can find them in **Firebase Console → Project Settings → General → Your apps → Web app → "SDK setup and configuration"**.

Only the `NEXT_PUBLIC_FIREBASE_*` variables are strictly required. `MONGO_URL` / `DB_NAME` are only used by the placeholder `/api` stub route and can be ignored if you're not extending the backend.

### 3. Run in development

```bash
yarn dev
# — or —
npm run dev
```

Open **http://localhost:3000** in your browser. You'll land on the login screen. Register a new account and start tracking!

### 4. Production build

```bash
yarn build && yarn start
# — or —
npm run build && npm start
```

The output is a **standalone** Node.js server at `.next/standalone/server.js`. To run the standalone bundle directly:

```bash
node .next/standalone/server.js
```

`public/app.html` is automatically bundled into the standalone output via `outputFileTracingIncludes` in `next.config.js`.

---

## 🔥 Firebase Setup Guide

### 1. Create the project
1. Go to https://console.firebase.google.com/ and click **"Add project"**.
2. Enter a name (e.g. `myhabits`) and complete the wizard.
3. From the project dashboard, click the **Web (`</>`)** icon to register a Web app. Copy the config values into your `.env`.

### 2. Enable Authentication providers
1. In the sidebar: **Build → Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. (Optional) Enable **Google** — one-click toggle.

### 3. Enable Firestore
1. Sidebar: **Build → Firestore Database → Create database**.
2. Start in **test mode** for local development (locks down after 30 days).
3. Choose a region close to your users.

### 4. Enable Storage
1. Sidebar: **Build → Storage → Get started**.
2. Start in **test mode**.
3. Use the same region as Firestore.

### 5. Firestore data model

```
meta/
  counters              # { userSeq: 143 } — increments per new user

users/
  {uid}
    uid, userId, username, email, photoURL,
    score, rank, joinedAt, habitsCount,
    currentStreak, longestStreak, totalCompletions,
    achievements: [id, id, ...],
    activity: [{ type, name, at }, ...]

    habits/             # subcollection
      {habitId}
        id, name, color, dates: ["YYYY-MM-DD", ...],
        createdAt, updatedAt
```

### 6. Recommended Firestore Security Rules

The default "test mode" rules expire in ~30 days. Replace them with these:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone signed-in can READ the users collection (leaderboard),
    // but only the owner can modify their own document.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if request.auth != null && request.auth.uid == userId;

      match /habits/{habitId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    // Only the server can update the counter, but authenticated users can read/write it via transactions.
    match /meta/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🎨 Customization

- **Accent color** — Change `--hc:#39FF14;` in the `:root` selector inside `public/app.html`. All UI elements use this variable via `var(--hc)`.
- **Score formula** — Edit `computeScore()` in the Firebase module of `public/app.html`.
- **Achievement badges** — Edit the `ACHIEVEMENTS` array to add/remove badges. Icons come from the `ICO_PATHS` map (add your own SVG paths).
- **Default seed habits** — Edit `defaultHabits()` in the vanilla script section.

---

## 🚢 Deployment

The app is designed to run anywhere that supports Next.js standalone (Vercel, Fly.io, Render, Emergent, or any Docker/K8s host).

Key config for standalone deployment (already set in `next.config.js`):

```js
{
  output: 'standalone',
  outputFileTracingIncludes: {
    '/': ['./public/**/*'],   // ensures app.html is bundled
  },
}
```

Startup command:

```bash
node .next/standalone/server.js
```

Ensure all `NEXT_PUBLIC_FIREBASE_*` env vars are set in your host's environment configuration. The `/` Route Handler substitutes them into the served HTML at request time.

---

## 📜 License

MIT — do whatever you want with it.
