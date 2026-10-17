# Firestore contract

The canonical commerce contract is documented in SHARED_BACKEND.md. Customer order fields use snake_case; the dashboard uses camelCase view adapters. Do not write separate coupons, pointsTransactions or tracking records expecting the mobile app to consume them.

Only authenticated server code writes orders, payments, promo codes and reward balances. The customer app reads its own records under the tested application Firestore rules. Dashboard access goes through verified administrator sessions.
