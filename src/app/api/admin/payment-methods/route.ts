import { crudRoutes } from "@/lib/crud-factory";
import { paymentMethodSchema } from "@/lib/schemas";

const { GET, POST } = crudRoutes({
  collection: "paymentMethods",
  createSchema: paymentMethodSchema,
  orderBy: "sortOrder",
  orderDir: "asc",
  searchFields: ["title"],
});

export { GET, POST };
