import {
  assertSameOrigin,
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

import { offerView, offerWrite } from "@/lib/offers-server";
import { rules } from "@/lib/rewards-server";
import { couponSchema } from "@/lib/schemas";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const snapshot = await adminDb().collection("promoCodes").limit(1000).get();
    const items = snapshot.docs.map((doc) => offerView(doc.id, doc.data()));
    if (!items.some((item) => item.code === "PROMO10"))
      items.push(offerView("PROMO10", rules.DEFAULT_PROMO));
    const search = (
      new URL(request.url).searchParams.get("search") || ""
    ).toUpperCase();
    return Response.json({
      items: items.filter((item) => !search || item.code.includes(search)),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const data = offerWrite(couponSchema.parse(await request.json()));
    const reference = adminDb().collection("promoCodes").doc(data.code);
    await reference.create({
      ...data,
      created_at: new Date().toISOString(),
      updated_by: admin.uid,
    });
    return Response.json({ item: offerView(data.code, data) }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
