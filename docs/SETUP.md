# Nourish Spoon Admin — Setup Guide

## 1. Prerequisites

- Node.js 20+
- A Firebase project (`nourish-spoon-f4820`) with:
  - Email/Password authentication enabled
  - Firestore database created
  - Firebase Storage enabled
  - Cloud Messaging (FCM) — works out of the box on the Spark plan for sending via Admin SDK

## 2. Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → Web app → firebaseConfig |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same place (`<project-id>.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same place |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same place |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same place |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same place (register a **Web** app if there isn't one) |
| `FIREBASE_PROJECT_ID` | Your project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account JSON → `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account JSON → `private_key` (keep `\n` escapes, one line, quoted) |
| `FIREBASE_STORAGE_BUCKET` | Your storage bucket |
| `ADMIN_EMAILS` | Comma-separated emails allowed to sign in, e.g. `owner@nourishspoon.com` |

Service account JSON: Firebase Console → Project settings → Service accounts →
**Generate new private key**. Keep it secret — it never leaves the server
(`src/lib/firebase-admin.ts` is server-only).

## 3. Admin user

1. Firebase Console → Authentication → Users → **Add user** (email + password).
2. Put that email in `ADMIN_EMAILS`.
3. On first login the dashboard also stamps a Firebase custom claim `admin: true`
   on the account, so Firestore rules can recognise the admin.

## 4. Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build check
```

## 5. Firestore rules

The dashboard reads/writes through the Admin SDK (bypasses rules), but the
customer app still needs rules. `docs/FIRESTORE_CONTRACT.md` lists every
collection the dashboard touches and the rule shape each one needs.
**Do not deploy rules from here without reviewing them against the live rules.**

## 6. What the dashboard manages

See `docs/FIRESTORE_CONTRACT.md` for the full collection/field contract.
Values edited here (home content, onboarding, FAQs, story, payment methods,
delivery info, referrals config, reward rules) only appear in the customer app
once the app is updated to read them from Firestore — see
`docs/APP_INTEGRATION.md`.
