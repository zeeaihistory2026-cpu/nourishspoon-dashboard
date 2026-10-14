import { crudRoutes } from "@/lib/crud-factory";
import { faqSchema } from "@/lib/schemas";

const { GET, POST } = crudRoutes({
  collection: "faqs",
  createSchema: faqSchema,
  orderBy: "sortOrder",
  orderDir: "asc",
  searchFields: ["question", "answer", "category"],
});

export { GET, POST };
