import "server-only";
import createRewards from "../server-shared/commerce/rewards.js";
import { createOrderPlacer } from "../server-shared/commerce/customerOrders.js";
import { createReviewSubmitter } from "../server-shared/commerce/customerReviews.js";
import { saveProfilePhoto } from "../server-shared/commerce/customerPhotos.js";
import { normalizeProduct } from "../server-shared/catalog/normalizeProduct.js";
import { adminDb } from "./firebase-admin";
import { AuthError } from "./auth-server";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Data } from "./contracts";

export async function customerAction(
  action: string,
  data: Data,
  token: DecodedIdToken,
) {
  const db = adminDb();
  if (action === "getReceipt") {
    const id = typeof data.order_id === "string" ? data.order_id.trim() : "";
    if (!id || id.includes("/") || id.length > 80)
      throw new AuthError(400, "Choose a valid order.");
    const snapshot = await db.collection("orders").doc(id).get();
    if (!snapshot.exists || snapshot.data()!.customer_uid !== token.uid)
      throw new AuthError(404, "This order is unavailable for your account.");
    const order = { ...snapshot.data()!, id };
    const { receiptPdf } = await import("./pdf-documents");
    const bytes = await receiptPdf(order);
    const reference = String(snapshot.data()!.order_number || id)
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .slice(0, 60);
    return {
      filename: `Nourish-Spoon-${reference}-receipt.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  }
  const signedIn = () => token.uid;
  const owner = () => {
    throw new AuthError(403, "Customer access only.");
  };
  const loyalty = createRewards({
    db,
    callable: (handler: any) => handler,
    signedIn,
    owner,
  });
  const request = { data, auth: { uid: token.uid, token } };
  if (action === "placeOrder" || action === "placeWhatsAppOrder")
    return createOrderPlacer({ db, loyalty, normalizeProduct })(
      data,
      {
        uid: token.uid,
        email: token.email || "",
      },
      { source: action === "placeWhatsAppOrder" ? "whatsapp_app" : "app" },
    );
  if (action === "quoteOrder") return loyalty.quoteOrder(request);
  if (action === "getRewards") return loyalty.getRewards(request);
  if (action === "applyReferral") return loyalty.applyReferral(request);
  if (action === "submitReview")
    return createReviewSubmitter({ db })(data, { uid: token.uid });
  if (action === "saveProfilePhoto")
    return saveProfilePhoto(db, data, token.uid);
  throw new AuthError(404, "Unknown customer action.");
}
