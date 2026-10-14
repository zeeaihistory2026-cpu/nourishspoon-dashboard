import { crudItemRoutes } from "@/lib/crud-factory";
import { deliveryInfoSchema } from "@/lib/schemas";

const { GET, PATCH, DELETE } = crudItemRoutes({
  collection: "deliveryInformation",
  createSchema: deliveryInfoSchema,
});

export { GET, PATCH, DELETE };
