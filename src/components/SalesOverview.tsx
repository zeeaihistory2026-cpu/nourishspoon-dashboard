"use client";

import { Box, Card, Chip, MenuItem, Select, Typography } from "@mui/material";
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
              {sales.orders} orders ·{" "}
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
          Revenue includes paid, delivered orders.
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
