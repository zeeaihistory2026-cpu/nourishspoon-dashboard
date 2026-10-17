# Customer App Integration — making dashboard content live

Status verified against the Expo app at `~/workspace/Nourish-Spoon`.

## Integrated 2026-10-14 ✅

All screens below now read their content from Firestore on mount, with the
bundled hardcoded content as the offline/first-run fallback. Implementation:
`src/services/content/contentService.ts` (`fetchContentList` /
`fetchContentDoc` — both swallow errors and return empty so the app never
breaks when offline or when rules aren't deployed yet).

| Dashboard area | Firestore location | App wiring |
|---|---|---|
| Home hero artwork | `appContent/home` → `hero.imageUrl` | `HomeScreen.tsx` uses the remote URL as the artwork source when set. NOTE: the home screen is pixel-artwork based — copy/CTAs are baked into the reference image, so only the artwork image itself is swappable, and any replacement must keep the reference layout (tap zones are positioned for it). `bestSellerIds`/`productTabs`/`sectionOrder` have no app effect in the current artwork architecture. |
| Onboarding slides | `onboarding` collection (`title`, `body`, `imageUrl?`, `ctaLabel?`, `sortOrder`, `isActive`) | `OnboardingScreen.tsx` — slide 1 stays the reference artwork; slides 2+ render from the collection (title/body, per-slide image, last-slide CTA label, dynamic dots). |
| Payment methods | `paymentMethods` collection (`title`, `icon`, `instructions`, `accountDetails`, `isActive`, `sortOrder`) | `PaymentDeliveryScreen.tsx` — rows render from the collection; `icon`/title keywords map to the brand badges, unknown → generic wallet badge. |
| Delivery information | `deliveryInformation` collection (`title`, `description`, `icon`, `isActive`, `sortOrder`) | Same screen, same pattern. |
| FAQs | `faqs` collection (`category`, `question`, `answer`, `sortOrder`, `isActive`) | `FaqScreen.tsx` — list + filter chips derived from categories (`General` chip = show all, as before). |
| Our Story | `appContent/ourStory` → `sections[0]` (`heading?`, `body`, `imageUrl?`) | `AboutScreen.tsx` — first section overrides the story title, body and hero image. Quote/steps/values remain bundled design elements. |

## Already live (no app changes needed)

| Dashboard area | Firestore | App reads it today? |
|---|---|---|
| Products (catalog, price, stock, images) | `products` | ✅ Yes — catalog, product detail, cart, checkout |
| Orders + status | `orders`, `orders/{id}/orderEvents` | ✅ Yes — orders list/detail |
| Coupons / offers | `coupons` | ✅ Yes — checkout promo codes |
| Reviews | `reviews` | ✅ Yes — product detail reviews |
| Wishlist | `users/{uid}/wishlist` | ✅ Yes |
| Tracking | `tracking` | ✅ Yes — track order screen |
| Push notifications | FCM + `notifications/{uid}` inbox | ✅ Yes — notifications screen |

## Still needed

- **Firestore rules deploy (REQUIRED for the above to work):** `firestore.rules`
  in the app repo now includes public-read rules for `appContent`,
  `appConfig`, `faqs`, `onboarding`, `paymentMethods`, `deliveryInformation`
  (writes blocked client-side; the dashboard writes via the Admin SDK which
  bypasses rules). The rules file is updated locally but NOT deployed —
  deploy with `firebase deploy --only firestore:rules` (needs explicit
  approval). Until deployed, the app silently keeps its bundled content.
- **Refer & Earn / Loyalty Points screens don't exist in the app yet** — the
  dashboard's `appConfig/referral` and `appConfig/rewards` have nothing to
  render into. Building those two screens is a separate job (was offered as
  part of the More-menu redesign, awaiting approval).

## Not in scope

- `adminNotifications` — dashboard-internal; customers only receive the FCM push.
- `rewardTransactions` / `referrals` ledgers — admin-only reads.
