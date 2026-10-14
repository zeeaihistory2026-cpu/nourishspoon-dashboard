import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

const DOC = "rewards";

const schema = z.object({
  earnPerRupee: z.number().min(0).default(0),
  redeemValuePerPoint: z.number().min(0).default(0),
  minRedeemPoints: z.number().int().min(0).default(0),
  welcomeBonus: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  notes: z.string().max(2000).default(""),
});

export async function GET() {
  try {
    await requireAdmin();
    const snap = await adminDb().collection("appConfig").doc(DOC).get();
    return Response.json({
      item: docToJSON(snap) ?? {
        id: DOC,
        earnPerRupee: 0,
        redeemValuePerPoint: 0,
        minRedeemPoints: 0,
        welcomeBonus: 0,
        isActive: true,
        notes: "",
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = schema.parse(await req.json());
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
