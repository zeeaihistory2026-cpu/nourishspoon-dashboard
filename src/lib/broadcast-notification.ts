import {
  adminDb,
  adminMessaging,
  FieldValue,
  Timestamp,
} from "./firebase-admin";
import { FieldPath } from "firebase-admin/firestore";
import { AuthError } from "./auth-server";

/** Durable inbox first; push delivery is optional and must never exclude an account. */
export async function broadcastNotification(
  id: string,
  sender: { uid: string; email?: unknown },
) {
  const db = adminDb();
  const ref = db.collection("adminNotifications").doc(id);
  const message = await db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (!current.exists) throw new AuthError(404, "Notification not found.");
    const data = current.data()!;
    if (["sent", "sending"].includes(data.status))
      throw new AuthError(
        409,
        "This notification is already sent or being sent.",
      );
    if (data.audience && data.audience !== "all")
      throw new AuthError(400, "Choose the all-users audience.");
    tx.update(ref, {
      status: "sending",
      startedAt: FieldValue.serverTimestamp(),
    });
    return data;
  });
  try {
    let recipientCount = 0;
    const audience = new Set<string>();
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
      const query = db
        .collection("users")
        .orderBy(FieldPath.documentId())
        .limit(450);
      const page: FirebaseFirestore.QuerySnapshot = await (
        last ? query.startAfter(last) : query
      ).get();
      if (page.empty) break;
      const batch = db.batch();
      for (const user of page.docs) {
        audience.add(user.id);
        batch.set(db.doc(`users/${user.id}/notifications/broadcast-${id}`), {
          title: message.title,
          body: message.body,
          read: false,
          type: "announcement",
          created_at: new Date().toISOString(),
          ...(message.imageUrl ? { image_url: message.imageUrl } : {}),
        });
      }
      await batch.commit();
      recipientCount += page.size;
      last = page.docs[page.size - 1];
    }
    let sentCount = 0,
      failedCount = 0;
    const seen = new Set<string>();
    last = undefined;
    while (true) {
      const query = db
        .collection("pushDevices")
        .orderBy(FieldPath.documentId())
        .limit(500);
      const page: FirebaseFirestore.QuerySnapshot = await (
        last ? query.startAfter(last) : query
      ).get();
      if (page.empty) break;
      const devices = page.docs.filter((device) => {
        const data = device.data();
        if (
          !audience.has(data.uid) ||
          typeof data.token !== "string" ||
          seen.has(data.token)
        )
          return false;
        seen.add(data.token);
        return true;
      });
      if (devices.length) {
        try {
          // Emulator suites verify inbox writes without contacting production FCM.
          if (process.env.FIRESTORE_EMULATOR_HOST)
            throw Error("No FCM in isolated QA");
          const result = await adminMessaging().sendEachForMulticast({
            tokens: devices.map((device) => device.data().token),
            notification: {
              title: message.title,
              body: message.body,
              ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
            },
            android: {
              priority: "high",
              notification: { channelId: "nourish-updates", sound: "default" },
            },
            data: { notificationId: id, screen: "Notifications" },
          });
          sentCount += result.successCount;
          failedCount += result.failureCount;
          const invalid = result.responses.flatMap((response, index) =>
            [
              "messaging/registration-token-not-registered",
              "messaging/invalid-registration-token",
            ].includes(response.error?.code || "")
              ? [devices[index]]
              : [],
          );
          // A refreshed registration must not be removed by an older failed delivery.
          await Promise.all(
            invalid.map((device) =>
              db.runTransaction(async (tx) => {
                const current = await tx.get(device.ref);
                if (current.data()?.token === device.data().token)
                  tx.delete(device.ref);
              }),
            ),
          );
        } catch {
          failedCount += devices.length;
        }
      }
      last = page.docs[page.size - 1];
    }
    await ref.update({
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      recipientCount,
      sentCount,
      failedCount,
      sentBy: sender.uid,
      sentByEmail: String(sender.email || ""),
    });
    const updated = await ref.get();
    return {
      item: {
        ...updated.data(),
        id,
        sentAt: (updated.data()?.sentAt as Timestamp)?.toDate().toISOString(),
      },
      reached: recipientCount,
      pushed: sentCount,
      failed: failedCount,
    };
  } catch (error) {
    await ref
      .update({
        status: "draft",
        lastError: "Send interrupted; retry to complete delivery.",
      })
      .catch(() => {});
    throw error;
  }
}
