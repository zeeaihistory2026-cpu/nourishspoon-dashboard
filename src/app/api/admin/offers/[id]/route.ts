import {
  requireAdmin,
  assertSameOrigin,
  AuthError,
  authErrorResponse,
} from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { couponSchema } from "@/lib/schemas";
import { offerView, offerWrite } from "@/lib/offers-server";
import { rules } from "@/lib/rewards-server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = await request.json();
    const parsed = couponSchema.partial().parse(input);
    // Preserve omitted fields, including schema defaults, when pausing an offer.
    const changes = Object.fromEntries(
      Object.entries(parsed).filter(([key]) => Object.hasOwn(input, key)),
    );
    const reference = adminDb().collection("promoCodes").doc(id);
    const item = await adminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const previous =
        snapshot.data() || (id === "PROMO10" ? rules.DEFAULT_PROMO : null);
      if (!previous) throw new AuthError(404, "Offer not found.");
      const data = offerWrite(
        couponSchema.parse({ ...offerView(id, previous), ...changes }),
      );
      if (data.code !== id)
        throw new AuthError(
          400,
          "Create a new offer to use a different promo code.",
        );
      transaction.set(
        reference,
        {
          ...data,
          updated_by: admin.uid,
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
      return offerView(id, data);
    });
    return Response.json({ item });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    const reference = adminDb().collection("promoCodes").doc(id);
    await adminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const data =
        snapshot.data() || (id === "PROMO10" ? rules.DEFAULT_PROMO : null);
      if (!data) throw new AuthError(404, "Offer not found.");
      transaction.set(reference, {
        ...data,
        active: false,
        updated_at: new Date().toISOString(),
        updated_by: admin.uid,
      });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
