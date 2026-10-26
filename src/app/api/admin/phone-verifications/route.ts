import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import {
  requireAdmin,
  requireAdminMutation,
  authErrorResponse,
  AuthError,
} from "@/lib/auth-server";
import { whatsappPhoneService } from "@/lib/phone-verification";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (admin.role !== "admin")
      throw new AuthError(
        403,
        "Only administrators can review phone ownership.",
      );
    const result = await adminDb()
      .collection("whatsappPhoneVerifications")
      .where("pending_until", ">", Date.now())
      .limit(200)
      .get();
    const items = result.docs
      .map((doc) => {
        const { code_hash, approval_id, ...item } = doc.data();
        return { ...item, id: doc.id };
      })
      .filter((item: any) => item.expires_at > Date.now())
      .sort((a: any, b: any) => b.created_at - a.created_at);
    return Response.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
const schema = z.object({
  uid: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[^/]+$/),
  request_id: z.string().regex(/^[a-f0-9]{24}$/),
  sender_phone: z.string().min(8).max(30),
  code: z.string().min(1).max(40),
  sender_confirmed: z.literal(true),
});
export async function POST(request: Request) {
  try {
    const admin = await requireAdminMutation(request);
    if (admin.role !== "admin")
      throw new AuthError(
        403,
        "Only administrators can verify WhatsApp ownership.",
      );
    const input = schema.parse(await request.json());
    let result;
    try {
      result = await whatsappPhoneService().approve(input.uid, input, admin);
    } catch (error) {
      throw new AuthError(
        400,
        error instanceof Error ? error.message : "Verification failed.",
      );
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
