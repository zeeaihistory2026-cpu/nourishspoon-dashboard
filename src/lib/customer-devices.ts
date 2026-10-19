import { adminDb, FieldValue } from "./firebase-admin";
import { AuthError } from "./auth-server";
import { z } from "zod";

const identity = z.object({ installationId: z.string().uuid() });
const registration = identity.extend({
  token: z.string().min(20).max(4096),
  platform: z.literal("android"),
});
/** One owner per app installation prevents a switched account receiving an old account's push. */
export async function customerDeviceAction(
  action: string,
  input: unknown,
  uid: string,
) {
  const value = (
    action === "registerDevice" ? registration : identity
  ).safeParse(input);
  if (!value.success) throw new AuthError(400, "Invalid notification device.");
  const ref = adminDb()
    .collection("pushDevices")
    .doc(value.data.installationId);
  if (action === "registerDevice") {
    const data = registration.parse(input);
    await ref.set({
      uid,
      token: data.token,
      platform: data.platform,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await adminDb().runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (current.data()?.uid === uid) tx.delete(ref);
    });
  }
  return { registered: action === "registerDevice" };
}
