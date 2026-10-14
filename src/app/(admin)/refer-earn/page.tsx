"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useApi, api } from "@/lib/api";
import { PageHeader, ErrorState, DataTable, StatusChip, type Column } from "@/components/ui";
import { fmtDate, fmtDateTime, rs } from "@/lib/format";
import type { Referral } from "@/lib/types";

function CorrectDialog({ row, onClose, onSaved }: { row: Referral | null; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(row?.status ?? "pending");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(row?.status ?? "pending");
    setNote("");
    setError(null);
  }, [row]);

  async function submit() {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/referrals/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(row)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Playfair Display", Georgia, serif' }}>Correct reward state</DialogTitle>
      <DialogContent className="flex flex-col gap-3" sx={{ pt: 1 }}>
        {error && <Typography variant="body2" sx={{ color: "#c0392b" }}>{error}</Typography>}
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Referrer: <b>{row?.referrerName || row?.referrerId}</b>
          {row?.referredName ? <> · Referred: <b>{row.referredName}</b></> : null}
        </Typography>
        <FormControl size="small" fullWidth>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            {["pending", "completed", "rewarded", "reversed"].map((s) => (
              <MenuItem key={s} value={s} className="capitalize">{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" label="Note (recorded in audit trail)" multiline rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
          Save correction
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Page() {
  const { data: cfgData, loading: cfgLoading, refresh: refreshCfg } = useApi<{ item: any }>("/api/admin/referrals/config");
  const { data: refData, loading: refLoading, error: refError, refresh: refreshRef } = useApi<{ items: Referral[] }>("/api/admin/referrals?limit=300");

  const [form, setForm] = useState({ headline: "", copy: "", referrerReward: 0, refereeReward: 0, terms: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<Referral | null>(null);

  useEffect(() => {
    if (cfgData?.item) {
      const c = cfgData.item;
      setForm({
        headline: c.headline ?? "",
        copy: c.copy ?? "",
        referrerReward: c.referrerReward ?? 0,
        refereeReward: c.refereeReward ?? 0,
        terms: c.terms ?? "",
        isActive: c.isActive !== false,
      });
    }
  }, [cfgData]);

  async function saveConfig() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/admin/referrals/config", { method: "PUT", body: JSON.stringify(form) });
      setMsg("Referral program saved.");
      refreshCfg();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Referral>[] = useMemo(() => [
    {
      key: "referrer",
      header: "Referrer",
      render: (r) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.referrerName || r.referrerId.slice(0, 8)}</Typography>
          {r.code && <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{r.code}</Typography>}
        </Box>
      ),
    },
    {
      key: "referred",
      header: "Referred",
      render: (r) => <Typography variant="body2">{r.referredName || "—"}</Typography>,
    },
    {
      key: "reward",
      header: "Reward",
      render: (r) => <Typography variant="body2" className="tnum" sx={{ fontWeight: 700 }}>{r.rewardAmount ? rs(r.rewardAmount) : "—"}</Typography>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusChip status={r.status} />,
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <Typography variant="body2" sx={{ color: "text.secondary" }}>{fmtDate(r.createdAt)}</Typography>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setCorrecting(r); }}>
          Correct
        </Button>
      ),
    },
  ], []);

  if (refError) return (<><PageHeader title="Refer & Earn" /><ErrorState message={refError} onRetry={refreshRef} /></>);

  return (
    <Box>
      <PageHeader title="Refer & Earn" subtitle="Referral program copy, rewards and referral records." />

      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, mb: 1 }}>
          Program Settings
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          The copy and rewards customers see on the Refer & Earn screen.
        </Typography>
        {msg && (
          <Typography variant="body2" sx={{ mb: 2, background: msg.includes("failed") ? "#fdecea" : "#e7f4ea", color: msg.includes("failed") ? "#c0392b" : "#2e7d4f", p: 1.5, borderRadius: 2 }}>
            {msg}
          </Typography>
        )}
        {cfgLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Box className="grid gap-3" sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField size="small" label="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} sx={{ gridColumn: { sm: "1 / -1" } }} />
            <TextField size="small" label="Program copy" multiline rows={3} value={form.copy} onChange={(e) => setForm({ ...form, copy: e.target.value })} sx={{ gridColumn: { sm: "1 / -1" } }} />
            <TextField size="small" label="Referrer reward (Rs.)" type="number" slotProps={{ htmlInput: { min: 0 } }} value={form.referrerReward} onChange={(e) => setForm({ ...form, referrerReward: Number(e.target.value) })} />
            <TextField size="small" label="Friend reward (Rs.)" type="number" slotProps={{ htmlInput: { min: 0 } }} value={form.refereeReward} onChange={(e) => setForm({ ...form, refereeReward: Number(e.target.value) })} />
            <TextField size="small" label="Terms" multiline rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} sx={{ gridColumn: { sm: "1 / -1" } }} />
            <Box sx={{ gridColumn: { sm: "1 / -1" } }} className="flex justify-end">
              <Button variant="contained" onClick={saveConfig} disabled={saving}>
                {saving ? "Saving..." : "Save program"}
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      <Typography variant="h6" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, mb: 1 }}>
        Referral Records
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Duplicate rewards are prevented at the record level — correct a failed or reversed reward here with an audit note.
      </Typography>
      <DataTable columns={columns} rows={refData?.items ?? []} loading={refLoading} emptyText="No referrals yet." />

      <CorrectDialog row={correcting} onClose={() => setCorrecting(null)} onSaved={refreshRef} />
    </Box>
  );
}

export default function ReferEarnPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
