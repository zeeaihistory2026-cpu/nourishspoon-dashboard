import "server-only";
import { createOrderUpdater } from "../server-shared/commerce/adminOrders.js";
import { createOrderPlacer } from "../server-shared/commerce/customerOrders.js";
import createRewards from "../server-shared/commerce/rewards.js";
import { normalizeProduct } from "../server-shared/catalog/normalizeProduct.js";
import { adminDb, adminAuth } from "./firebase-admin";
import { AuthError } from "./auth-server";
import type { Data } from "./contracts";

/** Direct WhatsApp customers stay unlinked; entered phone numbers do not prove account ownership. */
export async function createWhatsAppOrderRecord(
  input: Data,
  actor: { uid: string },
) {
  try {
    return await createOrderPlacer({
      db: adminDb(),
      loyalty: null,
      normalizeProduct,
    })(
      input,
      { uid: null },
      {
        source: "whatsapp_manual",
        createdBy: actor.uid,
      },
    );
  } catch (error) {
    if (error instanceof Error && !("code" in error))
      throw new AuthError(400, error.message);
    throw error;
  }
}

/** The same transaction implementation backs both the mobile callable and dashboard API. */
export async function updateOrderRecord(input: Data, actor: { uid: string }) {
  const db = adminDb();
  const notCallable = () => {
    throw Error("This service is not a public callable.");
  };
  const loyalty = createRewards({
    db,
    auth: adminAuth(),
    callable: (action: unknown) => action,
    signedIn: notCallable,
    owner: notCallable,
  });
  const update = createOrderUpdater({ db, loyalty, normalizeProduct });
  try {
    return await update(input, actor);
  } catch (error) {
    if (error instanceof Error && !("code" in error))
      throw new AuthError(400, error.message);
    throw error;
  }
}
