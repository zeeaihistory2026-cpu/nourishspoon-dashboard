import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { storySchema } from "@/lib/schemas";

const DOC = "ourStory";

function defaults() {
  return {
    id: DOC,
    sections: [
      {
        heading: "Our Story",
        body: "Share the Nourish Spoon story here.",
        imageUrl: "",
      },
    ],
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const snap = await adminDb().collection("appContent").doc(DOC).get();
    const doc = docToJSON(snap);
    return Response.json({ item: { ...defaults(), ...(doc ?? {}) } });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = storySchema.parse(await req.json());
    const ref = adminDb().collection("appContent").doc(DOC);
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
