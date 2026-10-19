"use client";

import {
  DataTable,
  ErrorState,
  PageHeader,
  StatusChip,
  type Column,
} from "@/components/ui";
import { api, useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { Referral } from "@/lib/types";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Suspense, useEffect, useMemo, useState } from "react";

function Page() {
  const {
    data: cfgData,
    loading: cfgLoading,
    refresh: refreshCfg,
  } = useApi<{ item: any }>("/api/admin/referrals/config");
  const {
    data: refData,
    loading: refLoading,
    error: refError,
    refresh: refreshRef,
  } = useApi<{ items: Referral[] }>("/api/admin/referrals?limit=300", true);

  const [form, setForm] = useState({
    headline: "",
    copy: "",
    referrerReward: 0,
    terms: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cfgData?.item) {
      const c = cfgData.item;
      setForm({
        headline: c.headline ?? "",
        copy: c.copy ?? "",
        referrerReward: c.referrerReward ?? 0,
        terms: c.terms ?? "",
        isActive: c.isActive !== false,
      });
    }
  }, [cfgData]);

  async function saveConfig() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/admin/referrals/config", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setMsg("Referral program saved.");
      refreshCfg();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Referral>[] = useMemo(
    () => [
      {
        key: "referrer",
        header: "Referrer",
        render: (r) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {r.referrerName || r.referrerId.slice(0, 8)}
            </Typography>
            {r.code && (
              <Typography
                variant="caption"
                sx={{ fontFamily: "monospace", color: "text.secondary" }}
              >
                {r.code}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        key: "referred",
        header: "Referred",
        render: (r) => (
          <Typography variant="body2">{r.referredName || "—"}</Typography>
        ),
      },
      {
        key: "reward",
        header: "Reward",
        render: (r) => (
          <Typography variant="body2" className="tnum" sx={{ fontWeight: 700 }}>
            {r.rewardAmount ? `${r.rewardAmount} points` : "—"}
          </Typography>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (r) => <StatusChip status={r.status} />,
      },
      {
        key: "date",
        header: "Date",
        render: (r) => (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {fmtDate(r.createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  );

  if (refError)
    return (
      <>
        <PageHeader title="Refer & Earn" />
        <ErrorState message={refError} onRetry={refreshRef} />
      </>
    );

  return (
    <Box>
      <PageHeader
        title="Refer & Earn"
        subtitle="Referral program copy, rewards and referral records."
      />

      <Card sx={{ p: 3, mb: 4 }}>
        <Typography
          variant="h6"
          sx={{ fontFamily: "var(--font-display)", fontWeight: 700, mb: 1 }}
        >
          Program Settings
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          The copy and rewards customers see on the Refer & Earn screen.
        </Typography>
        {msg && (
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              background: msg.includes("failed") ? "#fdecea" : "#e7f4ea",
              color: msg.includes("failed") ? "#c0392b" : "#2e7d4f",
              p: 1.5,
              borderRadius: 2,
            }}
          >
            {msg}
          </Typography>
        )}
        {cfgLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Box
            className="grid gap-3"
            sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}
          >
            <TextField
              size="small"
              label="Headline"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />
            <TextField
              size="small"
              label="Program copy"
              multiline
              rows={3}
              value={form.copy}
              onChange={(e) => setForm({ ...form, copy: e.target.value })}
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />
            <TextField
              size="small"
              label="Referrer reward (points)"
              type="number"
              slotProps={{ htmlInput: { min: 0 } }}
              value={form.referrerReward}
              onChange={(e) =>
                setForm({ ...form, referrerReward: Number(e.target.value) })
              }
            />
            <TextField
              size="small"
              label="Terms"
              multiline
              rows={3}
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />
            <FormControl size="small">
              <InputLabel>Program status</InputLabel>
              <Select
                label="Program status"
                value={form.isActive ? "active" : "paused"}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.value === "active" })
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
              </Select>
            </FormControl>
            <Box
              sx={{ gridColumn: { sm: "1 / -1" } }}
              className="flex justify-end"
            >
              <Button
                variant="contained"
                onClick={saveConfig}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save program"}
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      <Typography
        variant="h6"
        sx={{ fontFamily: "var(--font-display)", fontWeight: 700, mb: 1 }}
      >
        Referral Records
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Rewards are issued once after the friend’s first paid delivery, and
        reversed if refunded. Use Offers & Points for an audited balance
        adjustment.
      </Typography>
      <DataTable
        columns={columns}
        rows={refData?.items ?? []}
        loading={refLoading}
        emptyText="No referrals yet."
      />
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
