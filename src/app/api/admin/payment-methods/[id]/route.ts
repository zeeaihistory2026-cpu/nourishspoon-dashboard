import { crudItemRoutes } from "@/lib/crud-factory";
import { paymentMethodSchema } from "@/lib/schemas";

const { GET, PATCH, DELETE } = crudItemRoutes({
  collection: "paymentMethods",
  createSchema: paymentMethodSchema,
});

export { GET, PATCH, DELETE };
