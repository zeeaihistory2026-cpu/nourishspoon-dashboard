import {
  assertSameOrigin,
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

import { reviewView } from "@/lib/contracts";
import { reviewModerateSchema } from "@/lib/schemas";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = reviewModerateSchema.parse(await request.json());
    const reference = adminDb().collection("reviews").doc(id);
    await reference.update({
      status: ["visible", "featured"].includes(input.visibility)
        ? "approved"
        : input.visibility,
      is_featured: input.visibility === "featured",
      moderated_by: admin.uid,
      moderated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const snapshot = await reference.get();
    return Response.json({ item: reviewView(id, snapshot.data()!) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
