import "server-only";
import createRewards from "../server-shared/commerce/rewards.js";
import { createOrderPlacer } from "../server-shared/commerce/customerOrders.js";
import { createReviewSubmitter } from "../server-shared/commerce/customerReviews.js";
import { normalizeProduct } from "../server-shared/catalog/normalizeProduct.js";
import { adminDb } from "./firebase-admin";
import { AuthError } from "./auth-server";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Data } from "./contracts";

export async function customerAction(action: string, data: Data, token: DecodedIdToken) {
  const db = adminDb();
  const signedIn = () => token.uid;
  const owner = () => { throw new AuthError(403, "Customer access only."); };
  const loyalty = createRewards({ db, callable: (handler: any) => handler, signedIn, owner });
  const request = { data, auth: { uid: token.uid, token } };
  if (action === "placeOrder") return createOrderPlacer({ db, loyalty, normalizeProduct })(data, { uid: token.uid, email: token.email || "" });
  if (action === "quoteOrder") return loyalty.quoteOrder(request);
  if (action === "getRewards") return loyalty.getRewards(request);
  if (action === "applyReferral") return loyalty.applyReferral(request);
  if (action === "submitReview") return createReviewSubmitter({ db })(data, { uid: token.uid });
  throw new AuthError(404, "Unknown customer action.");
}
