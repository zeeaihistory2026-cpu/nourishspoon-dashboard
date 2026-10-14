import { adminDb, adminMessaging, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

/**
 * Publish a notification: FCM multicast to all registered device tokens plus
 * per-user inbox records. Send history is immutable afterwards (PRD 14.4).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const db = adminDb();
    const ref = db.collection("adminNotifications").doc(id);
    const snap = await ref.get();
    const doc = docToJSON(snap);
    if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
    if (doc.status === "sent") {
      return Response.json({ error: "This notification was already sent." }, { status: 400 });
    }

    // Collect device tokens across users (devices subcollection per app schema).
    const usersSnap = await db.collection("users").select().get().catch(() => null);
    const tokens: string[] = [];
    const tokenOwners = new Map<string, string>();
    if (usersSnap) {
      await Promise.all(
        usersSnap.docs.slice(0, 2000).map(async (u) => {
          const dev = await db.collection("users").doc(u.id).collection("devices").get().catch(() => null);
          dev?.docs.forEach((d) => {
            const t = (d.data() as { token?: string }).token;
            if (t && !tokenOwners.has(t)) {
              tokenOwners.set(t, u.id);
              tokens.push(t);
            }
          });
        })
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    if (tokens.length) {
      const message = {
        notification: {
          title: (doc.title as string) ?? "",
          body: (doc.body as string) ?? "",
          ...(doc.imageUrl ? { imageUrl: doc.imageUrl as string } : {}),
        },
        data: {
          ...(doc.deepLink ? { deepLink: String(doc.deepLink) } : {}),
          notificationId: id,
        },
      };
      // Multicast in chunks of 500 (FCM limit).
      for (let i = 0; i < tokens.length; i += 500) {
        const chunk = tokens.slice(i, i + 500);
        try {
          const resp = await adminMessaging().sendEachForMulticast({
            ...message,
            tokens: chunk,
          });
          sentCount += resp.successCount;
          failedCount += resp.failureCount;
        } catch {
          failedCount += chunk.length;
        }
      }
    }

    // Per-user inbox records for the reachable audience.
    // Firestore batches cap at 500 writes — commit in chunks.
    const uids = [...new Set(tokenOwners.values())];
    for (let i = 0; i < uids.length; i += 450) {
      const batch = db.batch();
      for (const uid of uids.slice(i, i + 450)) {
        const inbox = db.collection("notifications").doc();
        batch.set(inbox, {
          recipientUid: uid,
          title: doc.title,
          body: doc.body,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
    await ref.update({
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      sentCount,
      failedCount,
      sentBy: admin.uid,
      sentByEmail: (admin.email as string) ?? "",
    });

    const updated = await ref.get();
    return Response.json({ item: docToJSON(updated), reached: tokenOwners.size });
  } catch (err) {
    return authErrorResponse(err);
  }
}
