import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import {
  requireAdmin,
  authErrorResponse,
  requireAdminMutation,
} from "@/lib/auth-server";
import { homeContentSchema } from "@/lib/schemas";

const DOC = "home";

function defaults() {
  return {
    id: DOC,
    hero: {
      heading: "Traditional Panjeeri from Sargodha",
      copy: "Wholesome, handcrafted goodness made with love.",
      ctaLabel: "Shop Now",
      ctaDestination: "/products",
      imageUrl: "",
      isActive: true,
    },
    bestSellerIds: [],
    productTabs: [
      { key: "panjeeri", label: "Panjeeri", icon: "leaf", isActive: true },
      {
        key: "energy-balls",
        label: "Energy Balls",
        icon: "jar",
        isActive: true,
      },
      { key: "combos", label: "Combos", icon: "box", isActive: true },
    ],
    sectionOrder: ["hero", "bestSellers", "productTabs", "onboarding"],
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
    const admin = await requireAdminMutation(req);
    const parsed = homeContentSchema.parse(await req.json());
    const ref = adminDb().collection("appContent").doc(DOC);
    await ref.set(
      {
        ...parsed,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.uid,
        updatedByEmail: (admin.email as string) ?? "",
      },
      { merge: true },
    );
    const snap = await ref.get();
    return Response.json({ item: docToJSON(snap) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json(
        { error: err.issues[0]?.message ?? "Invalid data." },
        { status: 400 },
      );
    }
    return authErrorResponse(err);
  }
}
