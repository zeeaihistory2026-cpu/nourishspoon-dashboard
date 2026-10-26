import { z } from "zod";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import {
  requireAdminMutation,
  authErrorResponse,
  AuthError,
} from "@/lib/auth-server";
import { emptyWallet, rules } from "@/lib/rewards-server";
import { updateOrderRecord } from "@/lib/commerce-server";

const schema = z.object({
  action: z.enum([
    "flag",
    "approve",
    "reject",
    "reverse",
    "restore_welcome",
    "override",
  ]),
  reason: z.string().trim().min(3).max(500),
  code: z.string().max(24).optional(),
});
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdminMutation(request);
    if (admin.role !== "admin")
      throw new AuthError(
        403,
        "Only administrators can override referral rewards.",
      );
    const { id } = await context.params;
    if (!id || id.includes("/") || id.length > 128)
      throw new AuthError(400, "Choose a valid customer.");
    const input = schema.parse(await request.json()),
      db = adminDb();
    const result = await db.runTransaction(async (tx) => {
      const ref = db.doc(`referrals/${id}`),
        walletRef = db.doc(`rewardWallets/${id}`);
      const [snapshot, walletDoc, settingsDoc] = await Promise.all([
        tx.get(ref),
        tx.get(walletRef),
        tx.get(db.doc("settings/rewards")),
      ]);
      const previous = snapshot.data(),
        wallet = { ...emptyWallet(id), ...walletDoc.data() },
        config = rules.rewardsConfig(settingsDoc.data());
      if (!previous && input.action !== "override")
        throw new AuthError(404, "Referral not found.");
      let next = {
        ...previous,
        updatedAt: new Date().toISOString(),
        updatedBy: admin.uid,
      } as Record<string, any>;
      let referrerWallet, reverseRef, reverseDoc, orderDoc, phoneRef, phoneDoc;
      if (input.action === "reverse") {
        if (
          !["completed", "rewarded"].includes(previous!.status) ||
          !previous!.rewardAmount
        )
          throw new AuthError(
            400,
            "Only an issued referral reward can be reversed.",
          );
        reverseRef = db.doc(
          `rewardWallets/${previous!.referrerId}/history/admin-referral-reverse-${id}`,
        );
        [referrerWallet, reverseDoc, orderDoc] = await Promise.all([
          tx.get(db.doc(`rewardWallets/${previous!.referrerId}`)),
          tx.get(reverseRef),
          previous!.orderId
            ? tx.get(db.doc(`orders/${previous!.orderId}`))
            : Promise.resolve(null),
        ]);
        if (reverseDoc.exists)
          throw new AuthError(409, "This referral was already reversed.");
        next.status = "reversed";
      } else if (input.action === "restore_welcome") {
        if (
          wallet.has_delivered_order ||
          Date.parse(previous!.expires_at || "1970-01-01") <= Date.now()
        )
          throw new AuthError(
            400,
            "A completed customer's or expired welcome reward cannot be restored.",
          );
        orderDoc = previous!.welcome_order_id
          ? await tx.get(db.doc(`orders/${previous!.welcome_order_id}`))
          : null;
        if (orderDoc?.exists && orderDoc.data()!.status !== "cancelled")
          throw new AuthError(
            400,
            "Cancel the reserved order before restoring its welcome reward.",
          );
        phoneRef = previous!.welcome_phone_hash
          ? db.doc(`welcomePhoneClaims/${previous!.welcome_phone_hash}`)
          : null;
        phoneDoc = phoneRef ? await tx.get(phoneRef) : null;
        Object.assign(next, {
          status: "pending",
          welcome_status: "restored",
          welcome_order_id: "",
        });
      } else if (input.action === "override") {
        if (
          wallet.has_delivered_order ||
          wallet.referral_paid ||
          ["reserved", "used"].includes(previous?.welcome_status) ||
          ["completed", "rewarded", "reversed"].includes(previous?.status)
        )
          throw new AuthError(
            400,
            "Issued or reserved referral benefits cannot be reassigned.",
          );
        const code = rules.promoCode(input.code),
          codeDoc = code ? await tx.get(db.doc(`referralCodes/${code}`)) : null;
        if (!codeDoc?.exists || codeDoc.data()!.uid === id)
          throw new AuthError(
            400,
            "Choose another active customer's referral code.",
          );
        const [referrer, customer] = await Promise.all([
          adminAuth().getUser(codeDoc.data()!.uid),
          adminAuth().getUser(id),
        ]);
        if (
          referrer.disabled ||
          customer.disabled ||
          (customer.phoneNumber &&
            customer.phoneNumber === referrer.phoneNumber)
        )
          throw new AuthError(
            400,
            "Choose a different active customer as referrer.",
          );
        const expiry = new Date(
          Date.now() + config.referral_valid_days * 86400000,
        ).toISOString();
        next = {
          ...next,
          referrerId: referrer.uid,
          referredId: id,
          code,
          status: "pending",
          welcome_status: "available",
          welcome_reward_type: config.welcome_type,
          welcome_reward_value: config.welcome_value,
          minimum_order_value: config.referral_minimum,
          reward_points: config.referral_points,
          monthly_limit: config.referral_monthly_limit,
          rewardAmount: 0,
          expires_at:
            config.referral_ends_at &&
            Date.parse(config.referral_ends_at) < Date.parse(expiry)
              ? config.referral_ends_at
              : expiry,
          createdAt: previous?.createdAt || new Date().toISOString(),
        };
      } else {
        if (["completed", "rewarded", "reversed"].includes(previous!.status))
          throw new AuthError(
            400,
            "Use Reverse reward for an already issued referral.",
          );
        Object.assign(next, {
          review_required: input.action === "flag",
          rewardState: input.action === "flag" ? "fraud_review" : "",
          status:
            input.action === "reject"
              ? "rejected"
              : previous!.orderId
                ? "qualified"
                : "pending",
        });
      }
      if (input.action === "reverse") {
        const before = {
            ...emptyWallet(previous!.referrerId),
            ...referrerWallet!.data(),
          },
          after = before.balance - previous!.rewardAmount;
        tx.set(referrerWallet!.ref, { ...before, balance: after });
        tx.create(reverseRef!, {
          points: -previous!.rewardAmount,
          transaction_type: "REFERRAL_REVERSAL",
          reference_type: "REFERRAL",
          reference_id: id,
          title: input.reason,
          before: before.balance,
          after,
          by: admin.uid,
          created_at: new Date().toISOString(),
          order_id: previous!.orderId || "",
          status: "completed",
        });
        if (orderDoc?.exists)
          tx.set(
            orderDoc.ref,
            { referral_bonus_reversed: previous!.rewardAmount },
            { merge: true },
          );
      }
      if (input.action === "override") {
        tx.set(walletRef, {
          ...wallet,
          referred_by: next.referrerId,
          referral_attached_at: new Date().toISOString(),
        });
        tx.set(
          db.doc(`users/${id}`),
          { referred_by_user_id: next.referrerId },
          { merge: true },
        );
      }
      if (
        input.action === "restore_welcome" &&
        phoneDoc?.exists &&
        phoneDoc.data()!.uid === id
      )
        tx.set(phoneRef!, { status: "restored" }, { merge: true });
      tx.set(ref, next);
      tx.create(db.collection("rewardAudit").doc(), {
        action: `referral_${input.action}`,
        referral_id: id,
        by: admin.uid,
        reason: input.reason,
        before: previous || null,
        after: next,
        at: new Date().toISOString(),
      });
      return next;
    });
    if (input.action === "approve" && result.orderId)
      await updateOrderRecord(
        { id: result.orderId, note: input.reason },
        admin,
      );
    return Response.json({ item: { id, ...result } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
