# Firestore Contract — Nourish Spoon Admin Dashboard

Every collection the dashboard reads or writes (via the Firebase **Admin SDK**,
which bypasses security rules). The customer app still enforces rules — keep
them in sync with the shapes below. **Do not deploy rule changes without
reviewing the live rules first.**

Existing collections (`users`, `products`, `categories`, `coupons`, `orders`,
`reviews`, `notifications`) keep their current shapes; the dashboard adapts to
them. New collections introduced by the dashboard are marked ★.

## Existing collections

### `users/{uid}`
Customer profile. Fields: `fullName`, `email`, `phone`, `city`, `photoURL`,
`role`, `points`, `disabled` (bool), `createdAt`.
Subcollections: `addresses/{id}`, `wishlist/{productId}`, `devices/{id}`
(FCM tokens: `fcmToken`, `platform`).

### `products/{id}`
`name`, `slug`, `description`, `categoryId`, `categoryName`, `price`,
`compareAtPrice?`, `variants[]` (`label`, `price`, `compareAtPrice?`),
`weight`, `stock`, `images[]`, `ingredients[]` (`name`, `emoji?`),
`benefits[]` (`icon`, `label`), `isFeatured`, `isActive`, `deletedAt?`,
`rating`, `reviewCount`, `sortOrder`, timestamps.
Dashboard deletion is a **soft delete** (`isActive=false`, `deletedAt` set).

### `categories/{id}` ★ (dashboard-managed)
`name`, `slug`, `sortOrder`, `isActive`, timestamps. The app treats this as a
plain list — it is **not** a sidebar module.

### `coupons/{id}`
`code`, `description`, `discountType` (`percent`|`fixed`), `value`,
`minSubtotal?`, `expiresAt?`, `isActive`, `usageCount`, timestamps.

### `orders/{id}`
`orderNumber`, `userId`, `customerName`, `items[]` (`productId`, `name`,
`weight`, `price`, `qty`, `image?`), `subtotal`, `deliveryFee`, `discount`,
`total`, `orderStatus` (`placed`→`packed`→`out_for_delivery`→`delivered`,
`cancelled` terminal), `paymentStatus` (`pending`|`paid`|`failed`|`refunded`),
`paymentMethod`, `shippingAddress{}`, `createdAt`, `updatedAt`.
Subcollection `orderEvents/{id}`: `from?`, `to`, `note?`, `at`, `byUid?`, `byEmail?`.

### `reviews/{id}`
`productId`, `productName`, `productImage?`, `userId`, `userName`, `city?`,
`rating`, `comment`, `verifiedPurchase`, `visibility`
(`visible`|`hidden`|`featured`|`removed`), `moderatedBy?`, `moderatedAt?`.
Dashboard moderation only changes `visibility` — review text is immutable.

### `notifications/{userId}/...` (customer inbox, existing)
Per-user inbox written by the dashboard on send.

## New collections (★ dashboard-managed)

### `tracking/{id}`
`orderId`, `orderNumber`, `userId?`, `customerName?`, `trackingNumber`,
`carrier?`, `current` (milestone key), `milestones[]` (`key`, `label`, `at`),
timestamps. Order status changes in the dashboard auto-sync the matching
tracking record's milestone.

### `adminNotifications/{id}` ★
Draft/sent push notifications: `title`, `body`, `imageUrl?`, `deepLink?`,
`audience` (`all`|`segment`), `segment?`, `status` (`draft`|`sent`),
`sentCount?`, `sentAt?`, timestamps. Sent records are **immutable**; delete is
draft-only.

### `rewardTransactions/{id}` ★
Points ledger: `userId`, `userName?`, `delta` (signed), `reason`, `at`,
`byUid?`, `byEmail?`. Append-only.

### `referrals/{id}` ★
`referrerId`, `referrerName?`, `referredId?`, `referredName?`, `code?`,
`rewardAmount?`, `status` (`pending`|`completed`|`rewarded`|`reversed`),
`note?`, `correctedBy?`, `correctedAt?`, timestamps.

### `appConfig/{doc}` ★
Single-document configs: `rewards` (points rules: `earnPerRupee`,
`redeemValuePerPoint`, `minRedeemPoints`, `welcomeBonus`, `isActive`, `notes`),
`referral` (program copy: `headline`, `copy`, `referrerReward`,
`refereeReward`, `terms`, `isActive`).

### `appContent/{doc}` ★
Single-document content: `home` (`hero{}`, `bestSellerIds[]`,
`productTabs[]`, `sectionOrder[]`), `ourStory` (`sections[]`:
`heading?`, `body`, `imageUrl?`), `paymentMethods` (list), `deliveryInfo`
(list), `faqs` (list), `onboarding` (list of slides).

## Suggested rule shape (review before deploying)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    // Public catalogue — read-only for the app
    match /products/{id}   { allow read: if true;  allow write: if isAdmin(); }
    match /categories/{id} { allow read: if true;  allow write: if isAdmin(); }
    match /coupons/{id}    { allow read: if true;  allow write: if isAdmin(); }

    // Admin-managed content/config — app reads, only admin writes
    match /appContent/{doc} { allow read: if true; allow write: if isAdmin(); }
    match /appConfig/{doc}  { allow read: if true; allow write: if isAdmin(); }
    match /onboarding/{id}  { allow read: if true; allow write: if isAdmin(); }
    match /adminNotifications/{id} { allow read: if isAdmin(); allow write: if isAdmin(); }

    // Orders — owner reads/creates, admin manages
    match /orders/{id} {
      allow read: if isAdmin() || isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update: if isAdmin();
      match /orderEvents/{e} { allow read: if isAdmin() || isOwner(get(/databases/$(db)/documents/orders/$(id)).data.userId); }
    }
    match /tracking/{id} {
      allow read: if isAdmin() || isOwner(resource.data.userId);
      allow write: if isAdmin();
    }

    // Users — owner reads own, admin manages
    match /users/{uid} {
      allow read: if isAdmin() || isOwner(uid);
      allow create: if isOwner(uid);
      allow update: if isAdmin() || (isOwner(uid) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['points','disabled','role']));
      match /addresses/{a} { allow read, write: if isAdmin() || isOwner(uid); }
      match /wishlist/{w}   { allow read, write: if isAdmin() || isOwner(uid); }
      match /devices/{d}    { allow read, write: if isAdmin() || isOwner(uid); }
    }

    // Reviews — public read, owner creates, admin moderates
    match /reviews/{id} {
      allow read: if true;
      allow create: if isOwner(request.resource.data.userId);
      allow update: if isAdmin();
    }

    // Ledgers — admin only (app reads own rows where needed)
    match /rewardTransactions/{id} { allow read: if isAdmin() || isOwner(resource.data.userId); allow write: if isAdmin(); }
    match /referrals/{id}         { allow read: if isAdmin() || isOwner(resource.data.referrerId); allow write: if isAdmin(); }
  }
}
```
