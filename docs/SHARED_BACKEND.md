# Shared mobile and dashboard backend

This dashboard preserves the supplied interactive Next.js design. `apps/admin` in the Nourish-Spoon repository is the editable source. `scripts/export-dashboard.mjs` exports its server dependencies into the separate Vercel repository; generated `src/server-shared` files must not be edited directly.

The server and public Firebase project IDs must both be `nourish-spoon-f4820`. Configure Firebase Admin credentials in Vercel environment settings, never in Git. Dashboard owners require a verified email in ADMIN_EMAILS. Delegated staff require verified email ownership and a current adminAccess record; legacy admin claims cannot override these roles. The session endpoint does not grant administrator claims.

The Android app uses `https://nourishspoon-dashboard.vercel.app/api/shop/{action}` with its Firebase ID token. Supported customer actions: `quoteOrder`, `placeOrder`, `placeWhatsAppOrder`, `getRewards`, `applyReferral`, `submitReview`, `saveProfilePhoto`, `getReceipt`, `registerDevice`, and `unregisterDevice`. The server verifies tokens, rejects anonymous accounts, recalculates prices from Firestore, validates `promoCodes`, and saves orders through the same stock/reward transactions as the callable backend. No Firebase billing upgrade is required by this transport.

Canonical collections and fields:

- `products`: `active`, `variants` with stable IDs and integer rupee prices; null stock means not tracked.
- `orders`: `customer_uid`, `created_at`, `paid_at`, `status`, `payment_status`, `tracking_number`, `delivery_fee`, `subtotal`, `discount`, `total`; delivery uses the shared Rs. 250 / free-above-Rs. 2,500 policy after discounts.
- `promoCodes/{UPPERCASE_CODE}`: `active`, `type`, `value`, `minimum_spend`, `maximum_discount`, `expires_at`. `PROMO10` has a default 10% product discount until explicitly published or paused.
- `rewardWallets/{uid}` and its `history`: server-only balance changes and an auditable ledger.
- `users/{uid}/notifications`: inbox notices written atomically with order creation and status updates.
- `reviews`: pending moderation, linked to the customer's delivered order.

Order statuses: pending -> confirmed -> preparing -> out_for_delivery -> delivered. Cancellation is allowed before completion. Tracking is optional for dispatch and delivery and can be added later. Legacy pending delivery quotes are resolved by the shared delivery policy when confirmed.

`GET /api/health` verifies a database read and returns the public project ID and commerce readiness. It returns 503 when server credentials are missing or invalid. Check it before activating the app's commerce flag. Native apps do not use dashboard cookies. Browser storefronts require an explicit `SHOP_WEB_ORIGINS` allowlist.

Dashboard financial metrics read the full projected order history rather than a 2,000-order sample. Revenue includes saved paid-order totals independently of delivery status and excludes unpaid, refunded or invalid totals. Product list queries retain their own bounds. CMS and wishlist features require separate end-to-end verification; their presence in the supplied dashboard does not prove a given content field is wired into the mobile app. Earlier integration documentation is superseded by this contract for commerce.

Verified locally: production build, strict TypeScript, callable commerce tests, Firestore privacy rules, and dashboard API integration tests covering promo creation/application/pause/expiry/minimum spend, signed-in checkout, retry idempotency and order fulfilment.


Dashboard order views refresh from Firestore changes and use a 15-second visible-tab fallback. Referral records are written by the same linkage, settlement and refund transactions as reward wallets. Referral settings update settings/rewards rather than a separate marketing-only configuration.


Dashboard broadcasts write a deterministic message into every `users/{uid}/notifications` inbox, whether or not the customer allows push. Android installations register native FCM tokens through the authenticated customer API in server-only `pushDevices/{installationId}` records, with one current account per installation. The app deletes its native token and unregisters at logout. Broadcast sends report inbox recipients, successful FCM submissions and failures separately; accepted FCM submissions are not proof a phone displayed the message. Invalid tokens are removed without overwriting a newer registration. Only the all-users audience is supported.

Deploy Vercel functions in `bom1` alongside the existing `asia-south1` Firestore database. Coupon preview uses a read-only transaction and one batched read; final placement always recalculates current discounts and stock. Client rewards prefetch/cache is session-scoped and never authorizes a deduction.


## Order fulfilment and dashboard alerts

Both mobile WhatsApp entry points call the authenticated `placeWhatsAppOrder` action before opening WhatsApp. The action uses the same server pricing, transactional stock reservation and request-ID deduplication as checkout. It records `source: whatsapp_app`, binds `customer_uid` to the verified token, and starts at `pending` / `awaiting_payment` with delivery charges and the final total awaiting confirmation. This action can use the configured dashboard API while `EXPO_PUBLIC_COMMERCE_ENABLED=false`; full checkout and rewards remain behind their existing switch. A failed save never opens WhatsApp. A failed WhatsApp launch leaves the saved request available in My Orders for resending; opening WhatsApp does not establish that a message was sent.

Orders → Add WhatsApp Order uses an authenticated, same-origin POST to `/api/admin/orders` for conversations received directly. These orders have `source: whatsapp_manual`, an audit actor and no customer UID. Phone input does not authorize account linking, customer receipt access, customer notifications or rewards. They remain dashboard-only; app-origin requests appear in the signed-in customer's My Orders. Creation and retries reserve stock once; cancel abandoned requests to restore inventory. Staff confirm the conversation, delivery fee and selected payment method before verifying payment. Payment method `to_confirm` is available for WhatsApp requests; the server rejects marking them paid before the fee and method are confirmed.

Tracking numbers are stored on the canonical order document as tracking_number. The tracking form selects an order by customer-facing number/customer name; the API also accepts that number. Canonical stages are pending, confirmed, preparing, out_for_delivery and delivered. Any forward stage is allowed; completed and cancelled orders cannot be reopened. TCS tracking is optional for dispatch and delivery, including when marking an order delivered directly. An 8–20 digit consignment number can be added later without reopening the order. Supplied tracking numbers are validated. Payment verification and reward settlement remain separate, transactional and idempotent.

The dashboard bell reads recent orders and maintains a monotonic read-through cursor per administrator in adminOrderInbox. New order receipts appear as a live toast and refresh order lists, tracking and sales. Existing customer inbox and native push flows remain separate.

Sales supports the last seven days and the current calendar month to date in Asia/Karachi. Monthly comparison uses the same elapsed days of the previous month. Revenue counts saved paid-order totals; pending orders remain visible in order counts and Recent Orders. A payment verification writes paid_at once; unrelated tracking/fulfilment changes preserve it. Legacy paid records without paid_at use their creation date with that limitation disclosed. The KPI, graph and authenticated weekly/monthly PDF endpoint share the same calculation.

`getReceipt` returns a branded PDF only to the order's customer. It validates saved amount arithmetic, refuses unconfirmed totals and shows PAID only for saved paid status. Other payment states are labelled truthfully. The dashboard's `/api/admin/revenue-report?period=weekly|monthly` requires an admin session and reports the same paid totals as the graph.

The existing info@nourishspoon.com owner also retains its explicitly provisioned server-issued Firebase admin claim. This exception does not grant or elevate delegated users.

## Customer review and profile photos

Verified buyers can submit one review per delivered order/product. New reviews remain pending until the owner approves them; approved reviews refresh in the mobile Reviews tab through Firestore. The dashboard listens to review updated_at changes, supports a Pending approval filter, and preserves the original text and rating during moderation.

A review may include one JPEG photo. The server decodes, resizes and recompresses it, strips metadata and limits the stored image to 80 KB. Photos live in a separate reviews/{reviewId}/media/photo document so normal review lists do not download image bytes. Media reads follow the parent review's ownership and approval state. The authenticated dashboard photo endpoint is private and uncached. Profile thumbnails use users/{uid}/media/profile, readable only by that account and writable only through the authenticated saveProfilePhoto action. Photo payloads have a separate bounded request limit. These small attachments use the existing database and do not require a new storage service.
