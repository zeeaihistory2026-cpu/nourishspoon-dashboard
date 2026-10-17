# Shared mobile and dashboard backend

This dashboard preserves the supplied interactive Next.js design. `apps/admin` in the Nourish-Spoon repository is the editable source. `scripts/export-dashboard.mjs` exports its server dependencies into the separate Vercel repository; generated `src/server-shared` files must not be edited directly.

The server and public Firebase project IDs must both be `nourish-spoon-f4820`. Configure Firebase Admin credentials in Vercel environment settings, never in Git. Verified owner email access or an existing administrator claim is required. The session endpoint does not grant administrator claims.

The Android app uses `https://nourishspoon-dashboard.vercel.app/api/shop/{action}` with its Firebase ID token. Supported customer actions: `quoteOrder`, `placeOrder`, `getRewards`, `applyReferral`, and `submitReview`. The server verifies tokens, rejects anonymous accounts, recalculates prices from Firestore, validates `promoCodes`, and saves orders through the same stock/reward transactions as the callable backend. No Firebase billing upgrade is required by this transport.

Canonical collections and fields:

- `products`: `active`, `variants` with stable IDs and integer rupee prices; null stock means not tracked.
- `orders`: `customer_uid`, `created_at`, `status`, `payment_status`, `tracking_number`, `delivery_fee`, `subtotal`, `discount`, `total`; absent delivery pricing remains an explicit pending quote.
- `promoCodes/{UPPERCASE_CODE}`: `active`, `type`, `value`, `minimum_spend`, `maximum_discount`, `expires_at`. `PROMO10` has a default 10% product discount until explicitly published or paused.
- `rewardWallets/{uid}` and its `history`: server-only balance changes and an auditable ledger.
- `users/{uid}/notifications`: inbox notices written atomically with order updates.
- `reviews`: pending moderation, linked to the customer's delivered order.

Order statuses: pending -> confirmed -> preparing -> out_for_delivery -> delivered. Cancellation is allowed before completion. TCS dispatch requires a consignment number. A pending delivery quote must be resolved before order confirmation.

`GET /api/health` verifies a database read and returns the public project ID and commerce readiness. It returns 503 when server credentials are missing or invalid. Check it before activating the app's commerce flag. Native apps do not use dashboard cookies. Browser storefronts require an explicit `SHOP_WEB_ORIGINS` allowlist.

Dashboard metrics use up to the most recent 2,000 orders and 1,000 products. Revenue includes paid, delivered orders. CMS, broadcast messaging and wishlist features require separate end-to-end verification; their presence in the supplied dashboard does not prove they are wired into this mobile app. Earlier integration documentation describes the other agent's implementation and is superseded by this contract for commerce.

Verified locally: production build, strict TypeScript, callable commerce tests, Firestore privacy rules, and dashboard API integration tests covering promo creation/application/pause/expiry/minimum spend, signed-in checkout, retry idempotency and order fulfilment.
