import { adminAuth, FirebaseConfigurationError } from "@/lib/firebase-admin";
import { AuthError, authErrorResponse } from "@/lib/auth-server";
import { customerDeviceAction } from "@/lib/customer-devices";
import { customerAction } from "@/lib/customer-commerce";

export const runtime = "nodejs";
const actions = new Set([
  "placeOrder",
  "placeWhatsAppOrder",
  "getReceipt",
  "quoteOrder",
  "getRewards",
  "getRewardsHistory",
  "startPhoneVerification",
  "startWhatsAppPhoneVerification",
  "applyReferral",
  "submitReview",
  "saveProfilePhoto",
  "registerDevice",
  "unregisterDevice",
]);
function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = (process.env.SHOP_WEB_ORIGINS || "")
    .split(",")
    .map((value) => value.trim());
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    !allowed.includes(origin)
  )
    throw new AuthError(403, "This website is not allowed to use checkout.");
  return origin
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : {};
}
export async function OPTIONS(request: Request) {
  try {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors(request),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "600",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  let headers: Record<string, string> = {};
  try {
    headers = cors(request);
    const { action } = await context.params;
    if (!actions.has(action))
      throw new AuthError(404, "Unknown customer action.");
    const bearer = request.headers
      .get("authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!bearer) throw new AuthError(401, "Please sign in first.");
    let token;
    try {
      token = await adminAuth().verifyIdToken(bearer, true);
    } catch (error) {
      if (error instanceof FirebaseConfigurationError) throw error;
      throw new AuthError(401, "Your session expired. Please sign in again.");
    }
    if (token.firebase?.sign_in_provider === "anonymous")
      throw new AuthError(401, "Please sign in first.");
    const text = await request.text();
    if (
      text.length >
      (["submitReview", "saveProfilePhoto"].includes(action) ? 190000 : 64000)
    )
      throw new AuthError(413, "Checkout details are too large.");
    let input;
    try {
      input = JSON.parse(text);
    } catch {
      throw new AuthError(400, "Send valid checkout details.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new AuthError(400, "Send valid checkout details.");
    let result;
    try {
      result = ["registerDevice", "unregisterDevice"].includes(action)
        ? await customerDeviceAction(action, input, token.uid)
        : await customerAction(action, input, token);
    } catch (error) {
      if (
        error instanceof Error &&
        !("code" in error) &&
        !(error instanceof AuthError) &&
        !(error instanceof FirebaseConfigurationError)
      )
        throw new AuthError(400, error.message);
      throw error;
    }
    return Response.json(
      { data: result },
      { headers: { ...headers, "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const response = authErrorResponse(error);
    for (const [key, value] of Object.entries(headers))
      response.headers.set(key, String(value));
    return response;
  }
}
