import { z } from "zod";
import { adminDb, adminAuth, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { customerUpdateSchema } from "@/lib/schemas";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const db = adminDb();
    const snap = await db.collection("users").doc(id).get();
    const profile = docToJSON(snap);
    if (!profile) return Response.json({ error: "Customer not found." }, { status: 404 });

    // NOTE: No orderBy() here — Firestore equality + orderBy on different fields
    // needs a composite index, and a missing index made the WHOLE profile 500
    // ("try again"). We fetch then sort in memory, and each sub-query is
    // isolated so one failure never kills the profile.
    const [addrSnap, ordersSnap, pointsSnap, wishlistSnap, refSnap] = await Promise.all([
      db.collection("users").doc(id).collection("addresses").get().catch(() => ({ docs: [] as unknown[] })),
      db.collection("orders").where("userId", "==", id).limit(50).get().catch(() => ({ docs: [] as unknown[] })),
      db.collection("rewardTransactions").where("userId", "==", id).limit(50).get().catch(() => ({ docs: [] as unknown[] })),
      db.collection("users").doc(id).collection("wishlist").get().catch(() => ({ docs: [] as unknown[] })),
      db.collection("referrals").where("referrerId", "==", id).limit(50).get().catch(() => null),
    ]);
    const byDateDesc = (a: Record<string, unknown>, b: Record<string, unknown>, field: string) =>
      String(b[field] ?? "").localeCompare(String(a[field] ?? ""));
    const toRows = (docs: readonly unknown[]) =>
      docs
        .map((d) => docToJSON(d as never))
        .filter((r): r is Record<string, unknown> => r !== null);
    const orders = toRows(ordersSnap.docs).sort((a, b) => byDateDesc(a, b, "createdAt"));
    const pointsHistory = toRows(pointsSnap.docs).sort((a, b) => byDateDesc(a, b, "at"));
    const referrals = toRows(refSnap ? refSnap.docs : []).sort((a, b) => byDateDesc(a, b, "createdAt"));

    let disabled = false;
    try {
      disabled = (await adminAuth().getUser(id)).disabled;
    } catch {
      /* user may not exist in Auth */
    }

    // Enrich wishlist with product names.
    const wishlist = await Promise.all(
      wishlistSnap.docs.map(async (d) => {
        const w = docToJSON(d as never) as Record<string, unknown>;
        if (w.productId) {
          const p = await db.collection("products").doc(w.productId as string).get().catch(() => null);
          if (p?.exists) {
            const pd = p.data() as { name?: string; images?: string[] };
            w.productName = pd.name ?? "";
            w.productImage = pd.images?.[0] ?? "";
          }
        }
        return { ...w, userId: id };
      })
    );

    return Response.json({
      item: { ...profile, disabled },
      addresses: addrSnap.docs.map((d) => docToJSON(d as never)),
      orders,
      pointsHistory,
      wishlist,
      referrals,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = customerUpdateSchema.parse(await req.json());
    const data: Record<string, unknown> = { ...parsed };
    for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
    data.updatedAt = FieldValue.serverTimestamp();
    data.updatedBy = admin.uid;
    const ref = adminDb().collection("users").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Customer not found." }, { status: 404 });
    await ref.update(data);
    const updated = await ref.get();
    return Response.json({ item: docToJSON(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
