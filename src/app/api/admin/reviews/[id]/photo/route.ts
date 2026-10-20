import { requireAdmin, authErrorResponse, AuthError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const photo = await adminDb().doc(`reviews/${id}/media/photo`).get();
    if (!photo.exists) throw new AuthError(404, "Photo not found.");
    return new Response(Buffer.from(photo.data()!.data, "base64"), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
