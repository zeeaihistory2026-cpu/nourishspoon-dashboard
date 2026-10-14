import { crudItemRoutes } from "@/lib/crud-factory";
import { faqSchema } from "@/lib/schemas";

const { GET, PATCH, DELETE } = crudItemRoutes({
  collection: "faqs",
  createSchema: faqSchema,
});

export { GET, PATCH, DELETE };
