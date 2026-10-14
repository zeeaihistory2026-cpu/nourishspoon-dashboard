import { crudItemRoutes } from "@/lib/crud-factory";
import { onboardingSlideSchema } from "@/lib/schemas";
import { adminDb } from "@/lib/firebase-admin";

const { GET, PATCH, DELETE } = crudItemRoutes({
  collection: "onboarding",
  createSchema: onboardingSlideSchema,
  beforeDelete: async (doc) => {
    // PRD 9.2: never allow deleting the last active onboarding slide.
    if (doc.isActive === false) return;
    const snap = await adminDb()
      .collection("onboarding")
      .where("isActive", "==", true)
      .limit(2)
      .get();
    const othersActive = snap.docs.filter((d) => d.id !== doc.id).length;
    if (othersActive === 0) {
      throw new Error("GUARD: You cannot delete the last active onboarding slide.");
    }
  },
});

export { GET, PATCH, DELETE };
