"use client";

import { Suspense } from "react";
import { Box, Typography } from "@mui/material";
import SimpleCrudPage from "@/components/SimpleCrudPage";
import { StatusChip } from "@/components/ui";
import { deliveryInfoSchema } from "@/lib/schemas";
import { rs } from "@/lib/format";

function Page() {
  return (
    <SimpleCrudPage
      title="Delivery Information"
      subtitle="Delivery cards, charges and thresholds shown in the app and at checkout."
      endpoint="/api/admin/delivery-information"
      itemName="Card"
      schema={deliveryInfoSchema}
      reorder
      searchPlaceholder="Search delivery cards..."
      defaults={{ title: "", description: "", icon: "", charge: undefined, freeAbove: undefined, isActive: true, sortOrder: 0 }}
      fields={[
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", rows: 4 },
        { name: "icon", label: "Icon key", type: "text", hint: "Optional icon reference used by the app." },
        { name: "charge", label: "Delivery charge (Rs.)", type: "number", min: 0, hint: "Leave empty if this card carries no charge." },
        { name: "freeAbove", label: "Free above (Rs.)", type: "number", min: 0, hint: "Order total above which delivery is free." },
        { name: "sortOrder", label: "Display order", type: "number", min: 0 },
        { name: "isActive", label: "Active (visible in app)", type: "switch" },
      ]}
      columns={[
        {
          key: "title",
          header: "Card",
          render: (r: any) => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.title}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.description || "—"}
              </Typography>
            </Box>
          ),
        },
        {
          key: "charge",
          header: "Charge",
          width: 130,
          render: (r: any) => <Typography variant="body2" className="tnum" sx={{ fontWeight: 700 }}>{r.charge != null ? rs(r.charge) : "—"}</Typography>,
        },
        {
          key: "freeAbove",
          header: "Free above",
          width: 130,
          render: (r: any) => <Typography variant="body2" className="tnum">{r.freeAbove != null ? rs(r.freeAbove) : "—"}</Typography>,
        },
        {
          key: "isActive",
          header: "Status",
          width: 120,
          render: (r: any) => <StatusChip status={r.isActive ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}

export default function DeliveryInformationPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
