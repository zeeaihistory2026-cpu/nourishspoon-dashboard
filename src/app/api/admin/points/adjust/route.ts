import {
  assertSameOrigin,
  AuthError,
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

import { emptyWallet } from "@/lib/rewards-server";
import { pointsAdjustSchema } from "@/lib/schemas";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const input = pointsAdjustSchema.parse(await request.json());
    const requestId = request.headers.get("idempotency-key");
    if (!requestId || !/^[a-zA-Z0-9_-]{16,80}$/.test(requestId))
      throw new AuthError(400, "An adjustment request ID is required.");
    const db = adminDb();
    const walletRef = db.collection("rewardWallets").doc(input.userId);
    const historyRef = walletRef
      .collection("history")
      .doc("admin-" + requestId);
    const result = await db.runTransaction(async (transaction) => {
      const [profile, wallet, history] = await Promise.all([
        transaction.get(db.collection("users").doc(input.userId)),
        transaction.get(walletRef),
        transaction.get(historyRef),
      ]);
      if (!profile.exists) throw new AuthError(404, "Customer not found.");
      if (history.exists) {
        const previous = history.data()!;
        if (previous.points !== input.delta || previous.title !== input.reason)
          throw new AuthError(
            409,
            "This request ID was already used for a different adjustment.",
          );
        return {
          balance: previous.after,
          item: { id: history.id, ...previous },
        };
      }
      const before = { ...emptyWallet(input.userId), ...wallet.data() };
      const after = before.balance + input.delta;
      if (!Number.isSafeInteger(after) || after < 0)
        throw new AuthError(
          400,
          "The adjustment would produce an invalid or negative balance.",
        );
      const entry = {
        points: input.delta,
        title: input.reason,
        before: before.balance,
        after,
        by: admin.uid,
        by_email: admin.email ?? "",
        created_at: new Date().toISOString(),
        order_id: "",
      };
      transaction.set(walletRef, { ...before, balance: after });
      transaction.create(historyRef, entry);
      return { balance: after, item: { id: historyRef.id, ...entry } };
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
