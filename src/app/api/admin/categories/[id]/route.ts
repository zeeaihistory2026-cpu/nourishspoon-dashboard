import { crudItemRoutes } from "@/lib/crud-factory";
import { categorySchema } from "@/lib/schemas";

const { GET, PATCH, DELETE } = crudItemRoutes({
  collection: "categories",
  createSchema: categorySchema,
});

export { GET, PATCH, DELETE };
