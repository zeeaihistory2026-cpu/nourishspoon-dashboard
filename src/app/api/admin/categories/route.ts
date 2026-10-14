import { crudRoutes } from "@/lib/crud-factory";
import { categorySchema } from "@/lib/schemas";
import { slugify } from "@/lib/format";

const { GET, POST } = crudRoutes({
  collection: "categories",
  createSchema: categorySchema,
  orderBy: "sortOrder",
  orderDir: "asc",
  pageSize: 100,
  beforeCreate: (data) => {
    if (!data.slug && typeof data.name === "string") data.slug = slugify(data.name);
  },
});

export { GET, POST };
