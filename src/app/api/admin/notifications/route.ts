import { crudRoutes } from "@/lib/crud-factory";
import { notificationSchema } from "@/lib/schemas";

const { GET, POST } = crudRoutes({
  collection: "adminNotifications",
  createSchema: notificationSchema,
  orderBy: "createdAt",
  orderDir: "desc",
  searchFields: ["title", "body"],
  beforeCreate: (data) => {
    data.status = "draft";
    data.sentCount = 0;
    data.failedCount = 0;
  },
});

export { GET, POST };
