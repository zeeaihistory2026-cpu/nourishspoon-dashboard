import { crudRoutes } from "@/lib/crud-factory";
import { onboardingSlideSchema } from "@/lib/schemas";

const { GET, POST } = crudRoutes({
  collection: "onboarding",
  createSchema: onboardingSlideSchema,
  orderBy: "sortOrder",
  orderDir: "asc",
  searchFields: ["title", "body"],
});

export { GET, POST };
