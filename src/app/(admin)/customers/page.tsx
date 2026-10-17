"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import BlockIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutlined";
import { useApi, api } from "@/lib/api";
import { PageHeader, FormDrawer, ErrorState, StatusChip, ConfirmDialog, Thumb } from "@/components/ui";
import { fmtDate, fmtDateTime, rs } from "@/lib/format";
import type { UserProfile, Address, Order, RewardTransaction, Referral, WishlistItem } from "@/lib/types";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Box>
      <Box className="flex items-center justify-between mb-2">
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{title}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

function AdjustPoints({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adjustment = useRef<{ payload: string; id: string } | null>(null);

  async function submit() {
    if (busy) return;
    const payload = JSON.stringify({ userId, delta: Number(delta), reason: reason.trim() });
    if (adjustment.current?.payload !== payload) adjustment.current = { payload, id: crypto.randomUUID() };
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/points/adjust", {
        method: "POST",
        headers: { "Idempotency-Key": adjustment.current!.id },
        body: payload,
      });
      setOpen(false);
      setDelta("");
      setReason("");
      adjustment.current = null;
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>Adjust points</Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'var(--font-display)' }}>Adjust points</DialogTitle>
        <DialogContent className="flex flex-col gap-3" sx={{ pt: 1 }}>
          {error && <Typography variant="body2" sx={{ color: "#c0392b" }}>{error}</Typography>}
          <TextField
            size="small"
            label="Amount (use negative to deduct)"
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="e.g. 100 or -50"
          />
          <TextField
            size="small"
            label="Reason (required)"
            multiline
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this adjustment being made?"
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Every adjustment is logged with your admin identity and cannot be edited afterwards.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} variant="outlined" disabled={busy}>Cancel</Button>
          <Button
            onClick={submit}
            variant="contained"
            disabled={busy || !delta || Number(delta) === 0 || reason.trim().length < 3}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Apply adjustment
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function CustomerDetail({ id, onClose, onUpdated }: { id: string; onClose: () => void; onUpdated: () => void }) {
  const { data, loading, error, refresh } = useApi<{
    item: UserProfile;
    addresses: Address[];
    orders: Order[];
    pointsHistory: RewardTransaction[];
    wishlist: WishlistItem[];
    referrals: Referral[];
  }>(`/api/admin/customers/${id}`);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const user = data?.item;

  function startEdit() {
    if (!user) return;
    setForm({ fullName: user.fullName ?? "", phone: user.phone ?? "", city: user.city ?? "" });
    setEditing(true);
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await api(`/api/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(form) });
      setEditing(false);
      refresh();
      onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDisable() {
    if (disabling === null) return;
    setBusy(true);
    try {
      await api(`/api/admin/customers/${id}/disable`, { method: "POST", body: JSON.stringify({ disabled: disabling }) });
      setDisabling(null);
      refresh();
      onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>;
  if (error || !user) return <ErrorState message={error ?? "Customer not found."} onRetry={refresh} />;

  return (
    <Box className="flex flex-col gap-5">
      <Box className="flex items-start justify-between gap-3 flex-wrap">
        <Box className="flex items-center gap-3">
          <Thumb src={user.photoURL} alt={user.fullName} size={56} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{user.fullName}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{user.email}</Typography>
          </Box>
        </Box>
        <StatusChip status={user.disabled ? "inactive" : "active"} label={user.disabled ? "Disabled" : "Active"} />
      </Box>

      <Section title="Profile" action={!editing && <Button size="small" variant="outlined" onClick={startEdit}>Edit</Button>}>
        {editing ? (
          <Box className="flex flex-col gap-3">
            <TextField size="small" label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Box className="grid grid-cols-2 gap-3">
              <TextField size="small" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <TextField size="small" label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Box>
            <Box className="flex justify-end gap-2">
              <Button size="small" variant="outlined" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="small" variant="contained" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box className="grid grid-cols-2 gap-3">
            {[
              ["Phone", user.phone || "—"],
              ["City", user.city || "—"],
              ["Role", user.role],
              ["Joined", fmtDate(user.createdAt)],
              ["Points balance", String(user.points ?? 0)],
              ["User ID", user.uid],
            ].map(([k, v]) => (
              <Box key={k} sx={{ background: "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>{k}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: "break-all" }}>{v}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Section>

      <Section title="Points" action={<AdjustPoints userId={id} onDone={refresh} />}>
        {(data.pointsHistory ?? []).length ? (
          <Box className="flex flex-col gap-2">
            {data.pointsHistory.slice(0, 8).map((t) => (
              <Box key={t.id} sx={{ background: "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }} className="flex items-center justify-between gap-3">
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.reason}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{fmtDateTime(t.at)}{t.byEmail ? ` · ${t.byEmail}` : ""}</Typography>
                </Box>
                <Typography variant="body2" className="tnum" sx={{ fontWeight: 800, color: t.delta >= 0 ? "#2e7d4f" : "#c0392b" }}>
                  {t.delta >= 0 ? "+" : ""}{t.delta}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>No points activity.</Typography>
        )}
      </Section>

      <Section title={`Orders (${(data.orders ?? []).length})`}>
        {(data.orders ?? []).length ? (
          <Box className="flex flex-col gap-2">
            {data.orders.slice(0, 8).map((o) => (
              <Box key={o.id} sx={{ background: "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }} className="flex items-center justify-between gap-3">
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{o.orderNumber || o.id.slice(0, 8)}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{fmtDate(o.createdAt)}</Typography>
                </Box>
                <Box className="flex items-center gap-2">
                  <Typography variant="body2" className="tnum" sx={{ fontWeight: 800 }}>{rs(o.total)}</Typography>
                  <StatusChip status={o.orderStatus} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>No orders yet.</Typography>
        )}
      </Section>

      <Section title={`Saved addresses (${(data.addresses ?? []).length})`}>
        {(data.addresses ?? []).length ? (
          <Box className="flex flex-col gap-2">
            {data.addresses.map((a) => (
              <Box key={a.id} sx={{ background: "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {a.label}{a.isDefault ? " · Default" : ""}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {a.fullName} · {a.phone} · {a.line1}, {a.city}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>No saved addresses.</Typography>
        )}
      </Section>

      <Section title={`Wishlist (${(data.wishlist ?? []).length})`}>
        {(data.wishlist ?? []).length ? (
          <Box className="flex flex-col gap-2">
            {data.wishlist.map((w) => (
              <Box key={w.id} sx={{ background: "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 1 }} className="flex items-center gap-2">
                <Thumb src={w.productImage} alt={w.productName ?? ""} size={36} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{w.productName || w.productId}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Wishlist is empty.</Typography>
        )}
      </Section>

      <Divider />

      <Section title="Account access">
        <Box className="flex items-center justify-between gap-3 flex-wrap" sx={{ background: user.disabled ? "#fdecea" : "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 2 }}>
          <Typography variant="body2" sx={{ maxWidth: 340 }}>
            {user.disabled
              ? "This account is disabled and cannot sign in."
              : "Disable this account to block sign-in immediately (e.g. fraud or abuse)."}
          </Typography>
          <Button
            variant="outlined"
            color={user.disabled ? "success" : "error"}
            startIcon={user.disabled ? <CheckCircleOutline /> : <BlockIcon />}
            onClick={() => setDisabling(!user.disabled)}
          >
            {user.disabled ? "Re-enable account" : "Disable account"}
          </Button>
        </Box>
      </Section>

      <Box className="flex justify-end">
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </Box>

      <ConfirmDialog
        open={disabling !== null}
        title={disabling ? "Disable this account?" : "Re-enable this account?"}
        message={disabling
          ? `${user.fullName} will be signed out everywhere and unable to sign back in. Their data is kept.`
          : `${user.fullName} will be able to sign in again.`}
        confirmLabel={disabling ? "Disable account" : "Re-enable"}
        danger={!!disabling}
        busy={busy}
        onClose={() => setDisabling(null)}
        onConfirm={confirmDisable}
      />
    </Box>
  );
}

function Page() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v) setViewId(v);
  }, [searchParams]);

  const path = `/api/admin/customers?limit=300${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`;
  const { data, loading, error, refresh } = useApi<{ items: UserProfile[] }>(path);
  const rows = useMemo(() => data?.items ?? [], [data]);

  if (error) return (<><PageHeader title="Customers" /><ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      <PageHeader title="Customers" subtitle="Profiles, addresses, orders, points and account access." />

      <Card sx={{ mb: 2, p: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search by name, email, phone or UID..."
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
                {["Customer", "Phone", "City", "Points", "Joined", "Status", ""].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "12px 12px", fontSize: 12.5, fontWeight: 800, color: "#8d8670", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#8d8670" }}>Loading customers...</td></tr>}
              {rows.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0] cursor-pointer" onClick={() => setViewId(u.uid)}>
                  <td style={{ padding: "10px 12px" }}>
                    <Box className="flex items-center gap-2.5">
                      <Thumb src={u.photoURL} alt={u.fullName} size={36} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.fullName || "—"}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>{u.email}</Typography>
                      </Box>
                    </Box>
                  </td>
                  <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>{u.phone || "—"}</td>
                  <td style={{ padding: "11px 12px" }}>{u.city || "—"}</td>
                  <td style={{ padding: "11px 12px" }} className="tnum font-bold">{u.points ?? 0}</td>
                  <td style={{ padding: "11px 12px", whiteSpace: "nowrap", color: "#57523f" }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ padding: "11px 12px" }}>
                    <StatusChip status={u.disabled ? "inactive" : "active"} label={u.disabled ? "Disabled" : "Active"} />
                  </td>
                  <td style={{ padding: "11px 12px" }}><Typography variant="body2" sx={{ color: "#b3a983" }}>→</Typography></td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#8d8670" }}>No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      <FormDrawer open={Boolean(viewId)} wide title="Customer details" onClose={() => setViewId(null)}>
        {viewId && <CustomerDetail id={viewId} onClose={() => setViewId(null)} onUpdated={refresh} />}
      </FormDrawer>
    </Box>
  );
}

export default function CustomersPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
