# Setup

1. Use the same Firebase project as the mobile app: nourish-spoon-f4820.
2. Configure all variables in .env.example using Vercel environment settings or an ignored local .env.local. Private keys remain server-only. Keep both project IDs equal.
3. Set ADMIN_EMAILS to the verified owner email, or use an existing administrator claim. This dashboard does not grant admin claims during sign-in.
4. Run npm ci, npm run typecheck, and npm run build. Deploy the generated dashboard repository to its existing Vercel project.
5. Verify /api/health returns status: ok, commerce: true, and the correct public project ID.
6. Confirm a real owner can sign in. Do not use a development authentication bypass.
7. Use the documented customer API and tested Firestore rules; see SHARED_BACKEND.md. Firebase billing settings are unchanged.

For local QA only, use project demo-nourish-spoon with the local Auth/Firestore emulators. Set both server emulator variables and NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST to local loopback addresses. Never put emulator settings in the production deployment.
