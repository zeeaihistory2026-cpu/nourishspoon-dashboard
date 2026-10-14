import { crudRoutes } from "@/lib/crud-factory";
import { deliveryInfoSchema } from "@/lib/schemas";

const { GET, POST } = crudRoutes({
  collection: "deliveryInformation",
  createSchema: deliveryInfoSchema,
  orderBy: "sortOrder",
  orderDir: "asc",
  searchFields: ["title"],
});

export { GET, POST };
