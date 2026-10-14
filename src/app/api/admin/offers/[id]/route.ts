import { crudItemRoutes } from "@/lib/crud-factory";
import { couponSchema } from "@/lib/schemas";

const { GET, PATCH, DELETE } = crudItemRoutes({
  collection: "coupons",
  createSchema: couponSchema,
});

export { GET, PATCH, DELETE };
