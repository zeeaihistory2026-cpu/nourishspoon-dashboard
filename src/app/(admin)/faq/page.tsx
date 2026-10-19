"use client";

import { Suspense } from "react";
import { Box, Typography } from "@mui/material";
import SimpleCrudPage from "@/components/SimpleCrudPage";
import { StatusChip } from "@/components/ui";
import { faqSchema } from "@/lib/schemas";

const CATEGORIES = ["General", "Products", "Ordering", "Delivery"];

function Page() {
  return (
    <SimpleCrudPage
      title="FAQ / Help & Support"
      subtitle="Frequently asked questions shown in the app, organised by category."
      endpoint="/api/admin/faqs"
      itemName="FAQ"
      schema={faqSchema}
      reorder
      searchPlaceholder="Search questions..."
      defaults={{ category: "General", question: "", answer: "", sortOrder: 0, isActive: true }}
      fields={[
        { name: "category", label: "Category", type: "select", options: CATEGORIES.map((c) => ({ value: c, label: c })), required: true },
        { name: "question", label: "Question", type: "text", required: true },
        { name: "answer", label: "Answer", type: "textarea", rows: 5, required: true },
        { name: "sortOrder", label: "Display order", type: "number", min: 0 },
        { name: "isActive", label: "Active (visible in app)", type: "switch" },
      ]}
      columns={[
        {
          key: "question",
          header: "Question",
          render: (r: any) => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.question}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", maxWidth: 460, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.answer}
              </Typography>
            </Box>
          ),
        },
        {
          key: "category",
          header: "Category",
          width: 130,
          render: (r: any) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.category}</Typography>,
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

export default function FaqPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
