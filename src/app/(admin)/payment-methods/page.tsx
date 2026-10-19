"use client";

import { Suspense } from "react";
import { Box, Typography } from "@mui/material";
import SimpleCrudPage from "@/components/SimpleCrudPage";
import { StatusChip } from "@/components/ui";
import { paymentMethodSchema } from "@/lib/schemas";

function Page() {
  return (
    <SimpleCrudPage
      title="Payment Methods"
      subtitle="Payment options shown at checkout and on the Payment Methods screen."
      endpoint="/api/admin/payment-methods"
      itemName="Method"
      schema={paymentMethodSchema}
      reorder
      searchPlaceholder="Search payment methods..."
      defaults={{ title: "", icon: "", instructions: "", accountDetails: "", isActive: true, sortOrder: 0 }}
      fields={[
        { name: "title", label: "Method title", type: "text", required: true },
        { name: "icon", label: "Icon key", type: "text", hint: "Optional icon reference used by the app, e.g. cod, bank." },
        { name: "instructions", label: "Customer instructions", type: "textarea", rows: 4 },
        { name: "accountDetails", label: "Account details", type: "textarea", rows: 3, hint: "Only customer-visible details. Never put secret keys here." },
        { name: "sortOrder", label: "Display order", type: "number", min: 0 },
        { name: "isActive", label: "Active (visible in app)", type: "switch" },
      ]}
      columns={[
        {
          key: "title",
          header: "Method",
          render: (r: any) => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.title}</Typography>
              {r.icon && <Typography variant="caption" sx={{ color: "text.secondary" }}>icon: {r.icon}</Typography>}
            </Box>
          ),
        },
        {
          key: "instructions",
          header: "Instructions",
          render: (r: any) => (
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {r.instructions || "—"}
            </Typography>
          ),
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

export default function PaymentMethodsPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
