"use client";

import {
  ConfirmDialog,
  ErrorState,
  FormDrawer,
  PageHeader,
  StatusChip,
} from "@/components/ui";
import { DELIVERY_STAGES, canAdvanceDelivery } from "@/lib/fulfilment";
import { api, useApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { Order, TrackingMilestone, TrackingRecord } from "@/lib/types";
import AddIcon from "@mui/icons-material/AddOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const MILESTONES = DELIVERY_STAGES;

function TrackDetail({
  id,
  onClose,
  onUpdated,
}: {
  id: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { data, loading, error, refresh } = useApi<{ item: TrackingRecord }>(
    `/api/admin/tracking/${id}`,
    true,
  );
  const [trackingNumber, setTrackingNumber] = useState("");
  const [nextMilestone, setNextMilestone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const rec = data?.item;

  useEffect(() => {
    if (rec) {
      setTrackingNumber(rec.trackingNumber ?? "");
    }
  }, [rec?.id, rec?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(target = nextMilestone) {
    if (!rec) return;
    if (!/^\d{8,20}$/.test(trackingNumber.trim())) {
      setFailed(true);
      setMsg("Enter an 8–20 digit TCS tracking ID.");
      return;
    }
    setFailed(false);
    setBusy(true);
    setMsg(null);
    try {
      const milestone = MILESTONES.find((m) => m.key === target);
      await api(`/api/admin/tracking/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          ...(milestone ? { milestone } : {}),
        }),
      });
      setNextMilestone("");
      setConfirming(false);
      refresh();
      onUpdated();
      setMsg("Tracking updated. The customer sees the new state in the app.");
    } catch (e) {
      setFailed(true);
      setMsg(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  if (error || !rec)
    return <ErrorState message={error ?? "Not found."} onRetry={refresh} />;

  const milestones: TrackingMilestone[] = rec.milestones ?? [];
  const activeStep = Math.max(
    0,
    MILESTONES.findIndex((m) => m.key === rec.current),
  );

  return (
    <Box className="flex flex-col gap-5">
      {msg && (
        <Typography
          variant="body2"
          sx={{
            background: failed ? "#fdecea" : "#e7f4ea",
            color: failed ? "#c0392b" : "#2e7d4f",
            p: 1.5,
            borderRadius: 2,
          }}
        >
          {msg}
        </Typography>
      )}

      <Box className="flex items-start justify-between gap-3 flex-wrap">
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {rec.trackingNumber || rec.id}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Order {rec.orderNumber} · {rec.customerName || "Customer"}
          </Typography>
        </Box>
        <StatusChip status={rec.current} />
      </Box>

      <Stepper activeStep={activeStep} alternativeLabel>
        {MILESTONES.map((m) => (
          <Step key={m.key}>
            <StepLabel>
              <span style={{ fontSize: 11 }}>{m.label}</span>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Divider />

      <Box className="grid grid-cols-2 gap-3">
        <TextField
          size="small"
          fullWidth
          label="Tracking ID / TCS consignment number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
        <TextField
          size="small"
          fullWidth
          label="Delivery partner"
          value="TCS"
          slotProps={{ input: { readOnly: true } }}
        />
      </Box>
      <FormControl size="small" fullWidth>
        <InputLabel>Advance to milestone</InputLabel>
        <Select
          value={nextMilestone}
          label="Advance to milestone"
          onChange={(e) => setNextMilestone(e.target.value)}
        >
          <MenuItem value="">Keep current milestone</MenuItem>
          {MILESTONES.filter((m) => canAdvanceDelivery(rec.current, m.key)).map(
            (m) => (
              <MenuItem key={m.key} value={m.key}>
                {m.label}
              </MenuItem>
            ),
          )}
        </Select>
      </FormControl>
      <Box className="flex justify-end gap-2">
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          disabled={busy || !trackingNumber.trim()}
          onClick={() =>
            nextMilestone === "delivered" ? setConfirming(true) : void save()
          }
          startIcon={
            busy ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Save tracking
        </Button>
      </Box>

      {canAdvanceDelivery(rec.current, "delivered") && (
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() => {
            setNextMilestone("delivered");
            setConfirming(true);
          }}
        >
          Mark delivered
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        title="Mark order delivered?"
        message="This updates the customer's order in the app. Reward points are credited only after payment is marked paid."
        confirmLabel="Mark delivered"
        busy={busy}
        onClose={() => setConfirming(false)}
        onConfirm={() => void save("delivered")}
      />
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Milestone history
        </Typography>
        <Box className="flex flex-col gap-2">
          {[...milestones].reverse().map((m, i) => (
            <Box
              key={i}
              sx={{
                background: "#fbf7ea",
                border: "1px solid #ece4cb",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {m.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {fmtDateTime(m.at)}
              </Typography>
            </Box>
          ))}
          {!milestones.length && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No milestones yet.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function NewTracking({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const {
    data: orders,
    loading,
    error: loadError,
    refresh: retryOrders,
  } = useApi<{ items: Order[] }>("/api/admin/orders?limit=300", true);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!order || !/^\d{8,20}$/.test(trackingNumber.trim())) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/tracking", {
        method: "POST",
        body: JSON.stringify({
          orderId: order!.id,
          trackingNumber: trackingNumber.trim(),
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box className="flex flex-col gap-4">
      {error && (
        <Typography
          variant="body2"
          sx={{
            color: "#c0392b",
            background: "#fdecea",
            p: 1.5,
            borderRadius: 2,
          }}
        >
          {error}
        </Typography>
      )}
      {loadError && (
        <Button onClick={() => void retryOrders()}>Retry loading orders</Button>
      )}
      <Autocomplete
        options={(orders?.items || []).filter(
          (item) => item.orderStatus !== "cancelled",
        )}
        loading={loading}
        value={order}
        onChange={(_, value) => setOrder(value)}
        getOptionLabel={(item) =>
          `${item.orderNumber} · ${item.customerName || "Customer"}`
        }
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Choose order"
            required
            placeholder="Search order number or customer"
            size="small"
            helperText="Select the order that belongs to this consignment."
          />
        )}
      />
      <TextField
        size="small"
        fullWidth
        label="Tracking ID / TCS consignment number"
        required
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
      />
      <TextField
        size="small"
        fullWidth
        label="Delivery partner"
        value="TCS"
        slotProps={{ input: { readOnly: true } }}
      />
      <Box className="flex justify-end gap-2">
        <Button variant="outlined" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={busy || !order || !/^\d{8,20}$/.test(trackingNumber.trim())}
          startIcon={
            busy ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Create tracking
        </Button>
      </Box>
    </Box>
  );
}

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const path = `/api/admin/tracking?limit=300${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`;
  const { data, loading, error, refresh } = useApi<{ items: TrackingRecord[] }>(
    path,
    true,
  );
  const rows = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v) setViewId(v);
  }, [searchParams]);

  function closeAll() {
    setViewId(null);
    setCreating(false);
    router.replace("/track-orders", { scroll: false });
  }

  if (error)
    return (
      <>
        <PageHeader title="Track Orders" />
        <ErrorState message={error} onRetry={refresh} />
      </>
    );

  return (
    <Box>
      <PageHeader
        title="Track Orders"
        subtitle="Consignment numbers and customer-visible delivery milestones."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreating(true)}
          >
            Add Tracking
          </Button>
        }
      />

      <Card sx={{ mb: 2, p: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search by tracking ID, order ID or customer..."
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
          <table
            className="w-full text-sm"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                {[
                  "Tracking ID",
                  "Order ID",
                  "Customer",
                  "Status",
                  "Last Update",
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "left",
                      padding: "12px 12px",
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: "#8d8670",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "#8d8670",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <tr
                  key={t.id}
                  style={{ borderBottom: "1px solid #f1ebd6" }}
                  className="hover:bg-[#fdfaf0] cursor-pointer"
                  onClick={() => setViewId(t.id)}
                >
                  <td
                    style={{
                      padding: "11px 12px",
                      fontWeight: 700,
                      fontSize: 12.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.trackingNumber || "—"}
                  </td>
                  <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>
                    {t.orderNumber}
                  </td>
                  <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>
                    {t.customerName || "—"}
                  </td>
                  <td style={{ padding: "11px 12px" }}>
                    <StatusChip status={t.current} />
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      whiteSpace: "nowrap",
                      color: "#57523f",
                    }}
                  >
                    {fmtDateTime(t.updatedAt).split(",")[0]}
                  </td>
                  <td style={{ padding: "11px 12px" }}>
                    <VisibilityOutlined
                      sx={{ color: "#b3a983", fontSize: 18 }}
                    />
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#8d8670",
                    }}
                  >
                    No tracking records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      <FormDrawer
        open={Boolean(viewId)}
        wide
        title="Tracking details"
        onClose={closeAll}
      >
        {viewId && (
          <TrackDetail id={viewId} onClose={closeAll} onUpdated={refresh} />
        )}
      </FormDrawer>

      <FormDrawer
        open={creating}
        title="Add tracking"
        subtitle="Attach a consignment number to an order."
        onClose={closeAll}
      >
        <NewTracking onClose={closeAll} onSaved={refresh} />
      </FormDrawer>
    </Box>
  );
}

export default function TrackOrdersPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
