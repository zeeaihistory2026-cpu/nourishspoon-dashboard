"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import { useApi, api } from "@/lib/api";
import { PageHeader, FormDrawer, ErrorState, StatusChip, ConfirmDialog } from "@/components/ui";
import { rs, fmtDateTime } from "@/lib/format";
import type { Order, OrderEvent } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "packed", label: "Packed" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const FLOW = ["placed", "packed", "out_for_delivery", "delivered"];
const TERMINAL_CONFIRM = new Set(["delivered", "cancelled"]);

function OrderDetail({ id, onClose, onUpdated }: { id: string; onClose: () => void; onUpdated: () => void }) {
  const { data, loading, error, refresh } = useApi<{
    item: Order;
    customer: any;
    events: OrderEvent[];
    tracking: any;
  }>(`/api/admin/orders/${id}`);
  const [newStatus, setNewStatus] = useState("");
  const [newPayment, setNewPayment] = useState("");
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const order = data?.item;

  useEffect(() => {
    if (order) {
      setNewStatus(order.orderStatus);
      setNewPayment(order.paymentStatus);
      setTrackingNumber(data?.tracking?.trackingNumber || "");
    }
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!order) return;
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          orderStatus: newStatus,
          paymentStatus: newPayment || undefined,
          note: note || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
        }),
      });
      setNote("");
      setConfirming(false);
      refresh();
      onUpdated();
      setMsg("Order updated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  function requestSave() {
    if (TERMINAL_CONFIRM.has(newStatus) && newStatus !== order?.orderStatus) setConfirming(true);
    else save();
  }

  if (loading) return <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>;
  if (error || !order) return <ErrorState message={error ?? "Order not found."} onRetry={refresh} />;

  const activeStep = FLOW.indexOf(order.orderStatus);

  return (
    <Box className="flex flex-col gap-5">
      {msg && (
        <Typography variant="body2" sx={{ background: msg.includes("failed") || msg.includes("Cannot") ? "#fdecea" : "#e7f4ea", color: msg.includes("failed") || msg.includes("Cannot") ? "#c0392b" : "#2e7d4f", p: 1.5, borderRadius: 2 }}>
          {msg}
        </Typography>
      )}

      <Box className="flex items-start justify-between gap-3 flex-wrap">
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{order.orderNumber || order.id}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {order.customerName || data.customer?.fullName || "Customer"} · {fmtDateTime(order.createdAt)}
          </Typography>
        </Box>
        <StatusChip status={order.orderStatus} />
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Items</Typography>
        <Card sx={{ overflow: "hidden" }}>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <tbody>
              {(order.items ?? []).map((it, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1ebd6" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{it.name}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{it.weight} × {it.qty}</Typography>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }} className="tnum font-bold">{rs(it.price * it.qty)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: "8px 12px", color: "#8d8670" }}>Subtotal</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }} className="tnum">{rs(order.subtotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", color: "#8d8670" }}>Delivery</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }} className="tnum">{rs(order.deliveryFee)}</td>
              </tr>
              {order.discount ? (
                <tr>
                  <td style={{ padding: "8px 12px", color: "#2e7d4f" }}>Discount</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#2e7d4f" }} className="tnum">−{rs(order.discount)}</td>
                </tr>
              ) : null}
              <tr style={{ borderTop: "2px solid #e7ddc2" }}>
                <td style={{ padding: "10px 12px", fontWeight: 800 }}>Total</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }} className="tnum">{rs(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </Box>

      <Box className="grid grid-cols-2 gap-4">
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Delivery address</Typography>
          <Typography variant="body2">{order.shippingAddress?.fullName}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {order.shippingAddress?.line1}, {order.shippingAddress?.city}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{order.shippingAddress?.phone}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Payment</Typography>
          <Typography variant="body2" className="capitalize">{(order.paymentMethod ?? "").replace("_", " ")}</Typography>
          <Box sx={{ mt: 0.5 }}><StatusChip status={order.paymentStatus} /></Box>
          {data.tracking && (
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              Tracking: <b>{data.tracking.trackingNumber || "—"}</b>
            </Typography>
          )}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Progress</Typography>
        <Stepper activeStep={order.orderStatus === "cancelled" ? -1 : activeStep} alternativeLabel>
          {FLOW.map((s) => (
            <Step key={s}>
              <StepLabel><span className="capitalize">{s.replace(/_/g, " ")}</span></StepLabel>
            </Step>
          ))}
        </Stepper>
        {order.orderStatus === "cancelled" && (
          <Typography variant="body2" sx={{ color: "#c0392b", textAlign: "center", mt: 1, fontWeight: 700 }}>
            This order was cancelled.
          </Typography>
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Update order</Typography>
        <Box className="grid grid-cols-2 gap-3">
          <FormControl size="small" fullWidth>
            <InputLabel>Order status</InputLabel>
            <Select value={newStatus} label="Order status" onChange={(e) => setNewStatus(e.target.value)}>
              {["placed", "packed", "out_for_delivery", "delivered", "cancelled"].map((s) => (
                <MenuItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Payment status</InputLabel>
            <Select value={newPayment} label="Payment status" onChange={(e) => setNewPayment(e.target.value)}>
              {["pending", "paid", "failed", "refunded"].map((s) => (
                <MenuItem key={s} value={s} className="capitalize">{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TextField
          fullWidth
          size="small"
          label="TCS Tracking Number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          sx={{ mt: 2 }}
          placeholder="Enter TCS tracking number"
        />
        <TextField
          fullWidth
          size="small"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mt: 2 }}
          placeholder="Visible in the order timeline"
        />
        <Box className="flex justify-end gap-2 mt-3">
          <Button variant="outlined" onClick={onClose}>Close</Button>
          <Button
            variant="contained"
            disabled={busy || (newStatus === order.orderStatus && newPayment === order.paymentStatus && !note && trackingNumber === (data?.tracking?.trackingNumber || ""))}
            onClick={requestSave}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Update order
          </Button>
        </Box>
      </Box>

      {!!data.events?.length && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Timeline</Typography>
          <Box className="flex flex-col gap-2">
            {data.events.map((ev) => (
              <Box key={ev.id} sx={{ background: "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {(ev.from ? `${ev.from} → ` : "")}{ev.to}
                </Typography>
                {ev.note && <Typography variant="body2" sx={{ color: "text.secondary" }}>{ev.note}</Typography>}
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {fmtDateTime(ev.at)}{ev.byEmail ? ` · ${ev.byEmail}` : ""}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Mark as ${newStatus.replace(/_/g, " ")}?`}
        message={`This moves order ${order.orderNumber || order.id} to a terminal state. The customer will see this status in the app.`}
        confirmLabel="Confirm"
        danger={newStatus === "cancelled"}
        busy={busy}
        onClose={() => setConfirming(false)}
        onConfirm={save}
      />
    </Box>
  );
}

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  const path = `/api/admin/orders?limit=300${status ? `&status=${status}` : ""}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`;
  const { data, loading, error, refresh } = useApi<{ items: (Order & { customerName?: string })[] }>(path);
  const rows = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v) setViewId(v);
  }, [searchParams]);

  function closeDrawer() {
    setViewId(null);
    router.replace("/orders", { scroll: false });
  }

  if (error) return (<><PageHeader title="Orders" /><ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      <PageHeader title="Orders" subtitle="View and manage customer orders." />

      <Box className="flex flex-wrap gap-2 mb-3">
        {STATUSES.map((s) => (
          <Chip
            key={s.value || "all"}
            label={s.label}
            clickable
            onClick={() => setStatus(s.value)}
            sx={{
              fontWeight: 700,
              background: status === s.value ? "#1b3a28" : "#fffdf7",
              color: status === s.value ? "#fffdf7" : "#57523f",
              border: "1px solid #e7ddc2",
            }}
          />
        ))}
      </Box>

      <Card sx={{ mb: 2, p: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search by order ID, customer, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 440, width: "100%" }}
          slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#8d8670", fontSize: 19 }} />
                  </InputAdornment>
                ),
              },
              }}
        />
      </Card>

      <Card sx={{ overflow: "hidden" }}>
        <Box className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                {["Order ID", "Customer", "Items", "Amount", "Payment", "Status", "Date", ""].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "12px 12px", fontSize: 12.5, fontWeight: 800, color: "#8d8670", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#8d8670" }}>Loading orders...</td></tr>}
              {rows.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0] cursor-pointer" onClick={() => setViewId(o.id)}>
                  <td style={{ padding: "11px 12px", fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>{o.orderNumber || o.id.slice(0, 8).toUpperCase()}</td>
                  <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>{o.customerName || "Customer"}</td>
                  <td style={{ padding: "11px 12px" }} className="tnum">{(o.items ?? []).reduce((s, i) => s + (i.qty ?? 1), 0)}</td>
                  <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }} className="tnum font-bold">{rs(o.total)}</td>
                  <td style={{ padding: "11px 12px" }}><StatusChip status={o.paymentStatus} /></td>
                  <td style={{ padding: "11px 12px" }}><StatusChip status={o.orderStatus} /></td>
                  <td style={{ padding: "11px 12px", whiteSpace: "nowrap", color: "#57523f" }}>{fmtDateTime(o.createdAt).split(",")[0]}</td>
                  <td style={{ padding: "11px 12px" }}><VisibilityOutlined sx={{ color: "#b3a983", fontSize: 18 }} /></td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#8d8670" }}>No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      <FormDrawer open={Boolean(viewId)} wide title="Order details" onClose={closeDrawer}>
        {viewId && <OrderDetail id={viewId} onClose={closeDrawer} onUpdated={refresh} />}
      </FormDrawer>
    </Box>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
