"use client";

import Link from "next/link";
import { Box, Card, Typography } from "@mui/material";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import { StatusChip } from "@/components/ui";
import { fmtDate, rs } from "@/lib/format";

type RecentOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  items: number;
  amount: number | null;
  status: string;
};
type TrackingRequest = {
  id: string;
  trackingNumber: string;
  orderNumber: string;
  customer: string;
  status: string;
  updatedAt: string | null;
};

function SummaryTable({
  columns,
  loading,
  empty,
  children,
}: {
  columns: { label: string; width: string }[];
  loading: boolean;
  empty?: "orders" | "tracking";
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          "& th, & td": {
            px: 0.8,
            py: 1.5,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11,
            borderBottom: "1px solid #efe8d2",
          },
          "& th": {
            color: "text.secondary",
            fontWeight: 700,
            fontSize: 10.5,
            background: "#fcf9f0",
          },
          "& tr:last-child td": { borderBottom: 0 },
          "& .MuiChip-root": { fontSize: 10, height: 23, maxWidth: "100%" },
          "& .MuiChip-label": { px: 0.7 },
          "& .MuiChip-label > span": { gap: "4px" },
          "& a": {
            color: "#1b3a28",
            fontWeight: 700,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          },
        }}
      >
        <colgroup>
          {columns.map((column) => (
            <col key={column.label} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !empty ? (
            <tr>
              <td colSpan={columns.length}>Updating orders…</td>
            </tr>
          ) : null}
          {children}
        </tbody>
      </Box>
      {empty && (
        <Box
          sx={{
            p: 3,
            minHeight: 175,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            textAlign: "center",
            gap: 1,
          }}
        >
          {empty === "orders" ? (
            <Inventory2Outlined sx={{ fontSize: 38, color: "#a2936c" }} />
          ) : (
            <LocationOnOutlined sx={{ fontSize: 38, color: "#a2936c" }} />
          )}
          <Typography sx={{ fontSize: 13 }}>
            {loading
              ? "Loading…"
              : empty === "orders"
                ? "No orders yet."
                : "No tracking records yet."}
          </Typography>
          {!loading && (
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
              {empty === "orders"
                ? "Customer orders will appear here as they arrive."
                : "Add an order’s tracking ID from Track Order."}
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
}

export function RecentOrderTable({
  items,
  loading,
}: {
  items: RecentOrder[];
  loading: boolean;
}) {
  return (
    <SummaryTable
      columns={[
        { label: "Order ID", width: "24%" },
        { label: "Customer", width: "21%" },
        { label: "Items", width: "9%" },
        { label: "Amount", width: "22%" },
        { label: "Status", width: "24%" },
      ]}
      loading={loading}
      empty={!items.length ? "orders" : undefined}
    >
      {items.map((order) => (
        <tr key={order.id}>
          <td title={order.orderNumber}>
            <Link href={`/orders?view=${order.id}`}>{order.orderNumber}</Link>
          </td>
          <td title={order.customer}>{order.customer}</td>
          <td>{order.items}</td>
          <td className="tnum" title={rs(order.amount)}>
            {rs(order.amount)}
          </td>
          <td>
            <StatusChip status={order.status} />
          </td>
        </tr>
      ))}
    </SummaryTable>
  );
}

export function TrackingRequestTable({
  items,
  loading,
}: {
  items: TrackingRequest[];
  loading: boolean;
}) {
  return (
    <SummaryTable
      columns={[
        { label: "Tracking ID", width: "22%" },
        { label: "Order ID", width: "23%" },
        { label: "Customer", width: "17%" },
        { label: "Status", width: "21%" },
        { label: "Updated", width: "17%" },
      ]}
      loading={loading}
      empty={!items.length ? "tracking" : undefined}
    >
      {items.map((order) => (
        <tr key={order.id}>
          <td title={order.trackingNumber}>
            <Link href={`/track-orders?view=${order.id}`}>
              {order.trackingNumber}
            </Link>
          </td>
          <td title={order.orderNumber}>
            <Link href={`/orders?view=${order.id}`}>{order.orderNumber}</Link>
          </td>
          <td title={order.customer}>{order.customer}</td>
          <td>
            <StatusChip status={order.status} />
          </td>
          <td title={fmtDate(order.updatedAt)}>
            {order.updatedAt
              ? new Intl.DateTimeFormat("en", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Karachi",
                }).format(new Date(order.updatedAt))
              : "—"}
          </td>
        </tr>
      ))}
    </SummaryTable>
  );
}
