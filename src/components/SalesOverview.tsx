"use client";

import { Alert, Box, Button, Card, Chip, MenuItem, Select, Typography } from "@mui/material";
import { useState } from "react";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlined from "@mui/icons-material/TrendingDownOutlined";
import { rs } from "@/lib/format";

export type SalesSummary = {
  total: number;
  orders: number;
  delta: number;
  points: { label: string; revenue: number; orders: number }[];
};
export type SalesPeriod = "weekly" | "monthly";

export function SalesOverview({
  sales,
  period,
  onPeriodChange,
  children,
}: {
  sales: SalesSummary;
  period: SalesPeriod;
  onPeriodChange: (period: SalesPeriod) => void;
  children: React.ReactNode;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (downloading) return;
    setDownloading(true); setError("");
    try {
      const response = await fetch(`/api/admin/revenue-report?period=${period}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to download the report. Please retry.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `Nourish-Spoon-${period}-revenue.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to download the report."); }
    finally { setDownloading(false); }
  }
  return (
    <Card
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 25%" },
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2, minWidth: 0 }}>
        <Typography
          component="h2"
          sx={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontWeight: 700,
            fontSize: 21,
            mb: 1.2,
          }}
        >
          {period === "weekly" ? "Weekly Sales" : "Monthly Sales"}
        </Typography>
        <Button onClick={download} disabled={downloading} size="small" variant="outlined" sx={{ mb: 1.2 }}>
          {downloading ? "Preparing PDF…" : `Download ${period === "weekly" ? "Weekly" : "Monthly"} PDF`}
        </Button>
        {!!error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "160px minmax(0, 1fr)" },
            gap: 1,
            alignItems: "center",
            border: "1px solid #efe8d2",
            borderRadius: 2,
            px: 1.5,
            py: 1,
          }}
        >
          <Box>
            <Select
              value={period}
              onChange={(event) =>
                onPeriodChange(event.target.value as SalesPeriod)
              }
              size="small"
              inputProps={{ "aria-label": "Sales period" }}
              sx={{
                mb: 1.8,
                fontSize: 11,
                borderRadius: 1.5,
                "& .MuiSelect-select": { py: 0.65 },
              }}
            >
              <MenuItem value="weekly">Last 7 days</MenuItem>
              <MenuItem value="monthly">This month</MenuItem>
            </Select>
            <Typography
              sx={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontWeight: 700,
                fontSize: 29,
                lineHeight: 1.2,
              }}
            >
              {rs(sales.total)}
            </Typography>
            <Chip
              size="small"
              icon={
                sales.delta >= 0 ? (
                  <TrendingUpOutlined />
                ) : (
                  <TrendingDownOutlined />
                )
              }
              label={`${sales.delta > 0 ? "+" : ""}${sales.delta}%`}
              sx={{
                mt: 0.8,
                color: sales.delta >= 0 ? "#237340" : "#a4352a",
                background: sales.delta >= 0 ? "#e9f5e8" : "#fdecea",
                "& .MuiChip-icon": { color: "inherit", fontSize: 16 },
                height: 24,
              }}
            />
            <Typography sx={{ color: "text.secondary", fontSize: 10, mt: 1 }}>
              {sales.orders} paid orders ·{" "}
              {period === "weekly" ? "Last 7 days" : "Month to date"}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 10 }}>
              {period === "weekly"
                ? "vs previous week"
                : "vs previous month to date"}
            </Typography>
          </Box>
          <Box sx={{ minWidth: 0 }}>{children}</Box>
        </Box>
        <Typography sx={{ color: "text.secondary", fontSize: 10, mt: 1 }}>
          Money received from Paid orders, after discounts and including delivery.
          Refunded payments are excluded. Older orders without a payment date use their order date.
        </Typography>
      </Box>
      <Box
        aria-hidden
        sx={{
          position: "relative",
          minHeight: 205,
          background: "#efe2bd",
          overflow: "hidden",
          display: { xs: "none", lg: "block" },
        }}
      >
        <Box
          component="img"
          src="/assets/brand/home-hero.jpg"
          alt=""
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "65% center",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(125deg, #fffae9f5 0%, #fffae9bb 38%, transparent 73%)",
          }}
        />
        <Typography
          sx={{
            position: "relative",
            p: 2,
            width: "85%",
            color: "#a47222",
            fontFamily: "var(--font-script), cursive",
            fontSize: 34,
            lineHeight: 1.05,
            transform: "rotate(-8deg)",
          }}
        >
          Small Bites
          <br />
          Bigger Wellness
        </Typography>
      </Box>
    </Card>
  );
}
