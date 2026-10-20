"use client";

import SimpleCrudPage from "@/components/SimpleCrudPage";
import { DataTable,PageHeader,StatusChip,type Column } from "@/components/ui";
import { api,useApi } from "@/lib/api";
import { fmtDate,fmtDateTime,rs } from "@/lib/format";
import { couponSchema } from "@/lib/schemas";
import type { Coupon,RewardTransaction } from "@/lib/types";
import {
Box,
Button,
Card,
CircularProgress,
Tab,
Tabs,
TextField,
Typography,
} from "@mui/material";
import { Suspense,useEffect,useMemo,useState } from "react";

function OffersTab() {
  return (
    <SimpleCrudPage
      title="Offers"
      hideHeader
      endpoint="/api/admin/offers"
      itemName="Offer"
      schema={couponSchema}
      searchPlaceholder="Search by code..."
      defaults={{ code: "", description: "", discountType: "percent", value: undefined, minSubtotal: undefined, expiresAt: "", isActive: true }}
      deleteConfirm={(r: any) => `Delete offer "${r.code}"? Customers will no longer be able to use it at checkout.`}
      fields={[
        { name: "code", label: "Promo code", type: "text", required: true, hint: "Shown to customers, e.g. EID10." },
        { name: "description", label: "Description", type: "textarea", rows: 2 },
        { name: "discountType", label: "Discount type", type: "select", options: [{ value: "percent", label: "Percent %" }, { value: "fixed", label: "Fixed Rs." }] },
        { name: "value", label: "Value", type: "number", min: 0, required: true, hint: "Percent (e.g. 10) or rupees, depending on type." },
        { name: "minSubtotal", label: "Minimum order (Rs.)", type: "number", min: 0 },
        { name: "expiresAt", label: "Expiry date", type: "text", hint: "YYYY-MM-DD, optional." },
        { name: "isActive", label: "Active", type: "switch" },
      ]}
      columns={[
        {
          key: "code",
          header: "Code",
          render: (r: Coupon) => (
            <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace", background: "#f4e9c8", px: 1.2, py: 0.4, borderRadius: 1, display: "inline-block" }}>
              {r.code}
            </Typography>
          ),
        },
        {
          key: "benefit",
          header: "Benefit",
          render: (r: Coupon) => (
            <Typography variant="body2" sx={{ fontWeight: 700 }} className="tnum">
              {r.discountType === "percent" ? `${r.value}% off` : `${rs(r.value)} off`}
            </Typography>
          ),
        },
        {
          key: "minSubtotal",
          header: "Min. order",
          render: (r: Coupon) => <Typography variant="body2" className="tnum">{r.minSubtotal ? rs(r.minSubtotal) : "—"}</Typography>,
        },
        {
          key: "expiresAt",
          header: "Expires",
          render: (r: Coupon) => <Typography variant="body2">{r.expiresAt ? fmtDate(r.expiresAt) : "No expiry"}</Typography>,
        },
        {
          key: "isActive",
          header: "Status",
          render: (r: Coupon) => <StatusChip status={!r.isActive ? "inactive" : r.expiresAt && Date.parse(r.expiresAt) <= Date.now() ? "expired" : "active"} />,
        },
      ]}
    />
  );
}

function PointsTab() {
  const { data: cfgData, loading: cfgLoading, refresh: refreshCfg } = useApi<{ item: any }>("/api/admin/points/config");
  const { data: txData, loading: txLoading } = useApi<{ items: RewardTransaction[] }>("/api/admin/points/transactions?limit=100", true);
  const [form, setForm] = useState({ spendPerPoint: 0, redeemValuePerPoint: 0, minRedeemPoints: 0, referralReward: 0, isActive: true, notes: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cfgData?.item) {
      const c = cfgData.item;
      setForm({
        spendPerPoint: c.spendPerPoint ?? 0,
        redeemValuePerPoint: c.redeemValuePerPoint ?? 0,
        minRedeemPoints: c.minRedeemPoints ?? 0,
        referralReward: c.referralReward ?? 0,
        isActive: c.isActive !== false,
        notes: c.notes ?? "",
      });
    }
  }, [cfgData]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/admin/points/config", { method: "PUT", body: JSON.stringify(form) });
      setMsg("Reward rules saved.");
      refreshCfg();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<RewardTransaction>[] = useMemo(() => [
    {
      key: "user",
      header: "Customer",
      render: (r) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.userName || r.userId.slice(0, 8)}</Typography>,
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => <Typography variant="body2" sx={{ color: "text.secondary" }}>{r.reason}</Typography>,
    },
    {
      key: "delta",
      header: "Points",
      render: (r) => (
        <Typography variant="body2" className="tnum" sx={{ fontWeight: 800, color: r.delta >= 0 ? "#2e7d4f" : "#c0392b" }}>
          {r.delta >= 0 ? "+" : ""}{r.delta}
        </Typography>
      ),
    },
    {
      key: "at",
      header: "Date",
      render: (r) => <Typography variant="body2" sx={{ color: "text.secondary" }}>{fmtDateTime(r.at)}</Typography>,
    },
    {
      key: "by",
      header: "By",
      render: (r) => <Typography variant="caption" sx={{ color: "text.secondary" }}>{r.byEmail || "system"}</Typography>,
    },
  ], []);

  return (
    <Box className="flex flex-col gap-5">
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, mb: 1 }}>
          Reward Rules
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          How customers earn and redeem points. Only enable rules the app actually supports.
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
            <TextField size="small" label="Rs. spent to earn one point" type="number" slotProps={{ htmlInput: { min: 0, step: "any" } }}
              value={form.spendPerPoint} onChange={(e) => setForm({ ...form, spendPerPoint: Number(e.target.value) })} />
            <TextField size="small" label="Rs. value per point on redeem" type="number" slotProps={{ htmlInput: { min: 0, step: "any" } }}
              value={form.redeemValuePerPoint} onChange={(e) => setForm({ ...form, redeemValuePerPoint: Number(e.target.value) })} />
            <TextField size="small" label="Minimum points to redeem" type="number" slotProps={{ htmlInput: { min: 0 } }}
              value={form.minRedeemPoints} onChange={(e) => setForm({ ...form, minRedeemPoints: Number(e.target.value) })} />
            <TextField size="small" label="Referrer reward points" type="number" slotProps={{ htmlInput: { min: 0 } }}
              value={form.referralReward} onChange={(e) => setForm({ ...form, referralReward: Number(e.target.value) })} />
            <TextField size="small" label="Notes" multiline rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} sx={{ gridColumn: { sm: "1 / -1" } }} />
            <Box sx={{ gridColumn: { sm: "1 / -1" } }} className="flex justify-end">
              <Button variant="contained" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save rules"}
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      <Box>
        <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, mb: 1 }}>
          Points Ledger
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Every points adjustment, newest first. Adjust a customer's balance from their customer page.
        </Typography>
        <DataTable columns={columns} rows={txData?.items ?? []} loading={txLoading} emptyText="No points activity yet." />
      </Box>
    </Box>
  );
}

function Page() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <PageHeader title="Offers & Points" subtitle="Promo codes for checkout and the customer rewards program." />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: "1px solid #e7ddc2" }}>
        <Tab label="Offers" sx={{ fontWeight: 700 }} />
        <Tab label="Points" sx={{ fontWeight: 700 }} />
      </Tabs>
      {tab === 0 ? <OffersTab /> : <PointsTab />}
    </Box>
  );
}

export default function OffersPointsPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
