import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { orderStatusSchema } from "@/lib/schemas";
import { isTransitionAllowed } from "../route";

const MILESTONE_FOR_STATUS: Record<string, { key: string; label: string }> = {
  placed: { key: "order_placed", label: "Order Placed" },
  packed: { key: "packed", label: "Packed" },
  out_for_delivery: { key: "out_for_delivery", label: "Out for Delivery" },
  delivered: { key: "delivered", label: "Delivered" },
  cancelled: { key: "cancelled", label: "Cancelled" },
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const db = adminDb();
    const snap = await db.collection("orders").doc(id).get();
    const order = docToJSON(snap);
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

    const [customerSnap, eventsSnap, trackingSnap] = await Promise.all([
      order.userId ? db.collection("users").doc(order.userId as string).get() : null,
      db.collection("orders").doc(id).collection("orderEvents").orderBy("at", "desc").limit(50).get(),
      db.collection("tracking").doc(id).get(),
    ]);

    return Response.json({
      item: order,
      customer: customerSnap?.exists ? docToJSON(customerSnap) : null,
      events: eventsSnap.docs.map((d) => docToJSON(d)),
      tracking: trackingSnap.exists ? docToJSON(trackingSnap) : null,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = orderStatusSchema.parse(body);

    const db = adminDb();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();
    const order = docToJSON(snap);
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

    const from = (order.orderStatus as string) ?? "placed";
    const to = parsed.orderStatus;
    if (!isTransitionAllowed(from, to)) {
      return Response.json(
        { error: `Cannot move order from "${from}" to "${to}".` },
        { status: 400 }
      );
    }

    const batch = db.batch();
    const updates: Record<string, unknown> = {
      orderStatus: to,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.uid,
    };
    if (parsed.paymentStatus) updates.paymentStatus = parsed.paymentStatus;
    batch.update(ref, updates);

    // Immutable event log (PRD 18).
    const eventRef = ref.collection("orderEvents").doc();
    batch.set(eventRef, {
      from,
      to,
      note: parsed.note ?? "",
      by: admin.uid,
      byEmail: (admin.email as string) ?? "",
      at: FieldValue.serverTimestamp(),
    });

    // Keep the customer-facing tracking record in sync.
    const milestone = MILESTONE_FOR_STATUS[to];
    if (milestone) {
      const trackRef = db.collection("tracking").doc(id);
      const trackSnap = await trackRef.get();
      const entry = {
        key: milestone.key,
        label: milestone.label,
        at: FieldValue.serverTimestamp(),
        by: admin.uid,
      };
      if (trackSnap.exists) {
        batch.update(trackRef, {
          current: milestone.key,
          milestones: FieldValue.arrayUnion(entry),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: admin.uid,
        });
      } else {
        batch.set(trackRef, {
          orderId: id,
          orderNumber: (order.orderNumber as string) ?? id.slice(0, 8).toUpperCase(),
          customerName: (order.customerName as string) ?? "",
          trackingNumber: "",
          carrier: "",
          current: milestone.key,
          milestones: [entry],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: admin.uid,
        });
      }
    }

    // Save TCS/custom tracking number if provided.
    if (parsed.trackingNumber !== undefined) {
      const trackRef = db.collection("tracking").doc(id);
      const trackSnap = await trackRef.get();
      if (trackSnap.exists) {
        batch.update(trackRef, {
          trackingNumber: parsed.trackingNumber,
          carrier: "TCS",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: admin.uid,
        });
      } else {
        batch.set(trackRef, {
          orderId: id,
          orderNumber: (order.orderNumber as string) ?? id.slice(0, 8).toUpperCase(),
          customerName: (order.customerName as string) ?? "",
          trackingNumber: parsed.trackingNumber,
          carrier: "TCS",
          current: milestone?.key ?? "placed",
          milestones: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: admin.uid,
        });
      }
    }

    await batch.commit();
    const updated = await ref.get();
    return Response.json({ item: docToJSON(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
