import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { trackingSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 1000);
    const snap = await adminDb().collection("tracking").orderBy("updatedAt", "desc").limit(limit).get();
    let items = snap.docs.map((d) => docToJSON(d)).filter(Boolean) as Record<string, unknown>[];
    if (search) {
      items = items.filter((t) =>
        [t.trackingNumber, t.orderNumber, t.customerName, t.carrier]
          .map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes(search))
      );
    }
    return Response.json({ items, total: items.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = trackingSchema.parse(await req.json());
    const db = adminDb();

    // Attach to an existing order where possible for customer/order context.
    const orderSnap = await db.collection("orders").doc(parsed.orderId).get();
    const order = orderSnap.exists ? (docToJSON(orderSnap) as Record<string, unknown>) : null;

    const first = {
      key: "order_placed",
      label: "Order Placed",
      at: FieldValue.serverTimestamp(),
      by: admin.uid,
    };
    const ref = db.collection("tracking").doc(parsed.orderId);
    await ref.set(
      {
        orderId: parsed.orderId,
        orderNumber: (order?.orderNumber as string) ?? parsed.orderId.slice(0, 8).toUpperCase(),
        customerName: (order?.customerName as string) ?? "",
        trackingNumber: parsed.trackingNumber,
        carrier: parsed.carrier || "",
        current: "order_placed",
        milestones: [first],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.uid,
        updatedByEmail: (admin.email as string) ?? "",
      },
      { merge: true }
    );
    const snap = await ref.get();
    return Response.json({ item: docToJSON(snap) }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
