import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { referralConfigSchema } from "@/lib/schemas";

const DOC = "referral";

export async function GET() {
  try {
    await requireAdmin();
    const snap = await adminDb().collection("appConfig").doc(DOC).get();
    return Response.json({ item: docToJSON(snap) ?? { id: DOC } });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = referralConfigSchema.parse(await req.json());
    const ref = adminDb().collection("appConfig").doc(DOC);
    await ref.set(
      {
        ...parsed,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.uid,
        updatedByEmail: (admin.email as string) ?? "",
      },
      { merge: true }
    );
    const snap = await ref.get();
    return Response.json({ item: docToJSON(snap) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
