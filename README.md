# Nourish Spoon interactive admin

This is the supplied Next.js dashboard, integrated with the customer app's canonical Firebase commerce schema. See docs/SHARED_BACKEND.md for the verified contract and remaining module verification.

Configure the public Firebase web settings and private Firebase Admin settings from .env.example in Vercel or an ignored .env.local. Both project IDs must match the existing app project. Owners need a verified email in ADMIN_EMAILS. Additional staff need a verified Firebase email and an explicit User Access record. Legacy admin claims do not override delegated roles.

Development: npm ci, npm run dev. Validation: npm run typecheck and npm run build. The canonical application repository also has tooling/dashboard-commerce.test.mjs, which runs only against the isolated demo project and a local dashboard server.

The separate Vercel repository is generated using scripts/export-dashboard.mjs in Nourish-Spoon. Do not edit generated src/server-shared files or commit credentials. The mobile app's authenticated commerce API is /api/shop/{action}; /api/health must return commerce: true before live checkout is considered ready.

The existing info@nourishspoon.com owner also retains its explicitly provisioned server-issued Firebase admin claim. This exception does not grant or elevate delegated users.
