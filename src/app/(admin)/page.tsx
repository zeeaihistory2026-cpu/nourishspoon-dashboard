"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Select,
  MenuItem,
  Switch,
  Typography,
} from "@mui/material";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import SwapVertIcon from "@mui/icons-material/SwapVertOutlined";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import HelpOutline from "@mui/icons-material/HelpOutlineOutlined";
import NatureOutlined from "@mui/icons-material/NatureOutlined";
import StarBorderOutlined from "@mui/icons-material/StarBorderOutlined";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutlineOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import PersonOutline from "@mui/icons-material/PersonOutlineOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownIcon from "@mui/icons-material/TrendingDownOutlined";
import InboxOutlined from "@mui/icons-material/InboxOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import { useApi, api } from "@/lib/api";
import { rs, num, pad2, fmtDate } from "@/lib/format";
import { StatusChip, Thumb } from "@/components/ui";
import { LeafSprig } from "@/components/Shell";
import type { DashboardStats } from "@/lib/types";

interface DashboardData {
  stats: DashboardStats;
  recentOrders: {
    id: string;
    orderNumber: string;
    customer: string;
    items: number;
    amount: number;
    status: string;
    date: string | null;
  }[];
  trackRequests: {
    id: string;
    trackingNumber: string;
    orderNumber: string;
    customer: string;
    status: string;
    updatedAt: string | null;
  }[];
  controlProducts: {
    id: string;
    name: string;
    weight: string;
    price: number;
    stock: number;
    isActive: boolean;
    isFeatured: boolean;
    image: string;
    thumb: string;
  }[];
  weeklySales: {
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }[];
}

/* ------------------------------- sparkline ------------------------------- */

function Sparkline({ values, tone }: { values: number[]; tone: "green" | "gold" }) {
  const W = 200;
  const H = 44;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * W;
    const y = H - 6 - ((v - min) / range) * (H - 12);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const fill = tone === "green" ? "rgba(127,176,105,0.18)" : "rgba(201,162,39,0.18)";
  const stroke = tone === "green" ? "#7fb069" : "#d9b53a";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 40, display: "block" }} aria-hidden>
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------------------- KPI card --------------------------------- */

function KpiCard({
  icon,
  label,
  value,
  delta,
  caption,
  href,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: number;
  caption: string;
  href: string;
  trend: number[];
  tone: "green" | "gold";
}) {
  const up = delta >= 0;
  return (
    <Card
      component={Link}
      href={href}
      sx={{
        p: 0,
        flex: 1,
        minWidth: 0,
        textDecoration: "none",
        cursor: "pointer",
        overflow: "hidden",
        transition: "box-shadow .15s ease, transform .15s ease",
        "&:hover": { boxShadow: "0 6px 18px rgba(27,58,40,0.12)", transform: "translateY(-1px)" },
      }}
    >
      <CardContent sx={{ p: 2.2, pb: 1.4, "&:last-child": { pb: 1.4 } }}>
        <Box className="flex items-start justify-between gap-2">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: tone === "green" ? "#eef4e2" : "#f7ecd0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1b3a28",
              flexShrink: 0,
              "& svg": { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", mt: 1.2 }}>
          {label}
        </Typography>
        <Box className="flex items-baseline gap-1 flex-wrap">
          <Typography
            className="tnum"
            sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: 27, lineHeight: 1.15 }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: up ? "#2e7d4f" : "#c0392b",
              fontWeight: 800,
              fontSize: 11,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.3,
              whiteSpace: "nowrap",
            }}
          >
            {up ? <TrendingUpIcon sx={{ fontSize: 13 }} /> : <TrendingDownIcon sx={{ fontSize: 13 }} />}
            +{delta}%
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11 }}>
          {caption}
        </Typography>
      </CardContent>
      <Box sx={{ px: 0, pb: 0 }}>
        <Sparkline values={trend} tone={tone} />
      </Box>
    </Card>
  );
}

/* ----------------------------- section headings ----------------------------- */

function SectionHead({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <Box className="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <Box className="flex items-baseline gap-3 flex-wrap">
        <Typography
          variant="h5"
          sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: 21 }}
        >
          {title}
        </Typography>
        {caption && (
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5 }}>
            {caption}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Button
      component={Link}
      href={href}
      variant="text"
      endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
      sx={{ color: "#1b3a28", fontWeight: 700, fontSize: 13 }}
    >
      View All
    </Button>
  );
}

/* ------------------------------- home section cards ------------------------------- */

function HomeSectionCard({
  title,
  children,
  onEdit,
  onPreview,
}: {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
  onPreview: () => void;
}) {
  return (
    <Card sx={{ p: 1.6, display: "flex", flexDirection: "column", gap: 1.2 }}>
      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13.5, px: 0.5 }}>
        {title}
      </Typography>
      <Box
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          aspectRatio: "1.5 / 1",
          width: "100%",
          position: "relative",
          background: "#f4e9c8",
          border: "1px solid #ece4cb",
        }}
      >
        {children}
      </Box>
      <Box className="flex items-center gap-1.5">
        <Button
          variant="contained"
          size="small"
          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
          onClick={onEdit}
          sx={{ px: 2, py: 0.7, fontSize: 12.5, borderRadius: 99 }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityOutlined sx={{ fontSize: 14 }} />}
          onClick={onPreview}
          sx={{ px: 1.6, py: 0.7, fontSize: 12.5, borderRadius: 99 }}
        >
          Preview
        </Button>
      </Box>
    </Card>
  );
}

/* ------------------------------- weekly line chart ------------------------------- */

function WeeklyLineChart({ days }: { days: DashboardData["weeklySales"] }) {
  const W = 640;
  const H = 170;
  const PAD_L = 34;
  const PAD_R = 12;
  const PAD_T = 14;
  const PAD_B = 28;
  const maxRev = Math.max(0, ...days.map((d) => d.revenue));
  const maxY = Math.max(4, maxRev);
  const steps = 4;
  const x = (i: number) => PAD_L + (i / Math.max(1, days.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - v / maxY) * (H - PAD_T - PAD_B);
  const line = days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Weekly sales line chart">
      {Array.from({ length: steps + 1 }).map((_, s) => {
        const v = (maxY / steps) * s;
        const yy = y(v);
        return (
          <g key={s}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yy} y2={yy} stroke="#ece4cb" strokeWidth="1" />
            <text x={PAD_L - 8} y={yy + 3.5} textAnchor="end" fontSize="11" fill="#8d8670" fontWeight={600}>
              {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
            </text>
          </g>
        );
      })}
      {days.length > 0 && <path d={line} fill="none" stroke="#1b3a28" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {days.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.revenue)} r="4.5" fill="#fffdf7" stroke="#1b3a28" strokeWidth="2.5" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11.5" fill="#57523f" fontWeight={600}>
            {d.label}
          </text>
          <title>{`${d.label}: ${rs(d.revenue)} · ${d.orders} orders`}</title>
        </g>
      ))}
    </svg>
  );
}

/* --------------------------------- manage screens --------------------------------- */

const MANAGE_SCREENS: { href: string; title: string; desc: string; icon: React.ReactNode }[] = [
  { href: "/payment-methods", title: "Payment Methods", desc: "Manage payment options shown in the app.", icon: <CreditCardOutlined /> },
  { href: "/delivery-information", title: "Delivery Information", desc: "Update delivery charges, areas and information.", icon: <LocalShippingOutlined /> },
  { href: "/faq", title: "FAQ / Help & Support", desc: "Manage frequently asked questions.", icon: <HelpOutline /> },
  { href: "/our-story", title: "Our Story", desc: "Share your brand story and values.", icon: <NatureOutlined /> },
  { href: "/reviews", title: "Reviews", desc: "Manage customer reviews and ratings.", icon: <StarBorderOutlined /> },
  { href: "/notifications", title: "Notifications", desc: "Send and manage app notifications.", icon: <NotificationsNoneOutlined /> },
  { href: "/refer-earn", title: "Refer & Earn", desc: "Manage refer & earn content and rewards.", icon: <PeopleOutline /> },
  { href: "/offers-points", title: "Offers & Points", desc: "Create and manage offers and reward points.", icon: <LocalOfferOutlined /> },
  { href: "/wishlist", title: "Wishlist", desc: "Manage user wishlists and featured products.", icon: <FavoriteBorderOutlined /> },
  { href: "/customers", title: "Profile & Auth", desc: "Manage profile settings, signup and authentication.", icon: <PersonOutline /> },
];

/* ----------------------------------- page ----------------------------------- */

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading, refresh } = useApi<DashboardData>("/api/admin/dashboard");

  async function toggleControlProduct(id: string, field: "isActive" | "isFeatured", value: boolean) {
    try {
      await api(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed.");
    }
  }

  const stats: DashboardStats = data?.stats ?? {
    totalProducts: 0, productsDelta: 0, pendingOrders: 0, pendingDelta: 0,
    totalOrders: 0, ordersDelta: 0, revenue: 0, revenueDelta: 0, activeOffers: 0, offersDelta: 0,
  };

  // Weekly trend for the KPI sparklines (real order data; gentle curve when no data yet).
  const weekRev = (data?.weeklySales ?? []).map((d) => d.revenue);
  const weekOrders = (data?.weeklySales ?? []).map((d) => d.orders);
  const trendRev = weekRev.length && Math.max(...weekRev) > 0 ? weekRev : [2, 3, 2.4, 3.8, 3.2, 4.6, 4];
  const trendOrders = weekOrders.length && Math.max(...weekOrders) > 0 ? weekOrders : [1, 2, 1.5, 2.6, 2.2, 3.2, 2.8];

  const days = data?.weeklySales ?? [];
  const weekTotal = days.reduce((s, d) => s + d.revenue, 0);
  const weekOrderCount = days.reduce((s, d) => s + d.orders, 0);

  return (
    <Box className="flex flex-col gap-5">
      {/* Welcome heading — with script flourish top-right */}
      <Box sx={{ position: "relative" }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: { xs: 30, md: 38 },
            color: "#1b3a28",
            letterSpacing: 0.2,
          }}
        >
          Welcome Tayyaba 👋
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            color: "#57523f",
            mt: 0.8,
            fontSize: 15,
            lineHeight: 1.55,
            maxWidth: 640,
          }}
        >
          Manage your products, orders, and app content for Nourish Spoon. Keep nourishing
          lives with wholesome goodness.
        </Typography>
        <Box sx={{ position: "absolute", right: 0, top: -6, display: { xs: "none", md: "flex" }, alignItems: "flex-start", gap: 1, pointerEvents: "none" }}>
          <Box sx={{ transform: "scaleX(-1)", opacity: 0.9, mt: 1 }}>
            <LeafSprig />
          </Box>
          <Typography
            sx={{
              fontFamily: '"Pinyon Script", cursive',
              color: "#b08a2e",
              fontSize: 30,
              lineHeight: 1.05,
              textAlign: "right",
              pt: 0.5,
            }}
          >
            Good Food
            <br />
            Brighter Tomorrows
          </Typography>
        </Box>
      </Box>

      {/* Hero banner — photo + headline + CTA + script */}
      <Card
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
          border: "1px solid #e7ddc2",
          minHeight: { xs: 220, md: 252 },
        }}
      >
        <Box
          component="img"
          src="/assets/brand/welcome-banner.jpg"
          alt="Nourish Spoon wholesome products"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 42%",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(251,246,231,0.96) 0%, rgba(251,246,231,0.88) 34%, rgba(251,246,231,0.25) 62%, rgba(251,246,231,0) 78%)",
          }}
        />
        <Box sx={{ position: "relative", px: { xs: 2.5, md: 4 }, py: { xs: 2.5, md: 3 }, maxWidth: 520, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.2, minHeight: { xs: 220, md: 252 }, justifyContent: "center" }}>
          <Box component="img" src="/assets/brand/logo-transparent.png" alt="Nourish Spoon" sx={{ width: 108, display: "block" }} />
          <Typography
            sx={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 800,
              fontSize: { xs: 26, md: 34 },
              lineHeight: 1.12,
              color: "#1b3a28",
            }}
          >
            Wholesome Goodness for
            <br />
            Brighter Days
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "#57523f", fontWeight: 600, letterSpacing: 0.2 }}>
            Real Ingredients &nbsp;·&nbsp; Timeless Tradition &nbsp;·&nbsp; Healthier Lives
          </Typography>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            onClick={() => router.push("/products")}
            sx={{ mt: 0.5, borderRadius: 99, px: 2.6, py: 1, fontSize: 13, fontWeight: 700, textTransform: "none" }}
          >
            Craft Goodness
          </Button>
        </Box>
        <Typography
          sx={{
            position: "absolute",
            right: { xs: 14, md: 30 },
            top: { xs: 12, md: 22 },
            fontFamily: '"Pinyon Script", cursive',
            color: "#fffdf7",
            fontSize: { xs: 20, md: 28 },
            lineHeight: 1.1,
            textAlign: "right",
            textShadow: "0 1px 8px rgba(27,58,40,0.55)",
            display: { xs: "none", sm: "block" },
          }}
        >
          Nourishing
          <br />
          Today for a Better
          <br />
          Tomorrow
        </Typography>
      </Card>

      {/* KPI cards */}
      <Box className="grid gap-4" sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" } }}>
        <KpiCard icon={<Inventory2Outlined />} label="Total Products" value={loading ? "…" : num(stats.totalProducts)} delta={stats.productsDelta} caption="vs last month" href="/products" trend={trendRev} tone="green" />
        <KpiCard icon={<ShoppingCartOutlined />} label="Pending Orders" value={loading ? "…" : pad2(stats.pendingOrders)} delta={stats.pendingDelta} caption="vs yesterday" href="/orders" trend={trendOrders} tone="gold" />
        <KpiCard icon={<ReceiptLongOutlined />} label="Total Orders" value={loading ? "…" : num(stats.totalOrders)} delta={stats.ordersDelta} caption="vs last month" href="/orders" trend={trendOrders} tone="green" />
        <KpiCard icon={<AccountBalanceWalletOutlined />} label="Revenue" value={loading ? "…" : rs(stats.revenue)} delta={stats.revenueDelta} caption="vs last month" href="/orders" trend={trendRev} tone="gold" />
        <KpiCard icon={<LocalOfferOutlined />} label="Active Offers" value={loading ? "…" : pad2(stats.activeOffers)} delta={stats.offersDelta} caption="Live now" href="/offers-points" trend={trendRev} tone="gold" />
      </Box>

      {/* Main two-column area */}
      <Box className="grid gap-5" sx={{ gridTemplateColumns: { xs: "1fr", lg: "7fr 5fr" } }}>
        <Box className="flex flex-col gap-5 min-w-0">
          {/* Homepage Sections */}
          <Box>
            <SectionHead
              title="Homepage Sections"
              caption="Manage the content shown on your app home screen."
              action={
                <Button variant="outlined" size="small" startIcon={<SwapVertIcon />} onClick={() => router.push("/home-content")} sx={{ borderRadius: 99 }}>
                  Reorder Sections
                </Button>
              }
            />
            <Box className="grid gap-4" sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
              <HomeSectionCard title="Hero Banner" onEdit={() => router.push("/home-content")} onPreview={() => router.push("/home-content?preview=1")}>
                <Box component="img" src="/assets/brand/hero-branded.jpg" alt="Hero banner" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </HomeSectionCard>
              <HomeSectionCard title="Best Sellers" onEdit={() => router.push("/home-content")} onPreview={() => router.push("/home-content?preview=1")}>
                <Box component="img" src="/assets/brand/bestsellers-branded.jpg" alt="Best sellers" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </HomeSectionCard>
              <HomeSectionCard title="Product Tabs" onEdit={() => router.push("/home-content")} onPreview={() => router.push("/home-content?preview=1")}>
                <Box className="flex flex-col justify-center gap-2 h-full" sx={{ background: "#fbf6e7", px: 1.5, py: 1 }}>
                  <Box className="flex items-center gap-1.5">
                    {[
                      { label: "Panjeeri", icon: <SpaOutlined />, active: true },
                      { label: "Energy Balls", icon: <Inventory2Outlined />, active: false },
                    ].map((t) => (
                      <Box
                        key={t.label}
                        className="flex items-center gap-1"
                        sx={{
                          px: 1.4,
                          py: 0.8,
                          borderRadius: 99,
                          background: t.active ? "#1b3a28" : "#fffdf7",
                          color: t.active ? "#fffdf7" : "#57523f",
                          border: "1px solid #e7ddc2",
                          whiteSpace: "nowrap",
                          "& svg": { fontSize: 14 },
                        }}
                      >
                        {t.icon}
                        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 800 }}>{t.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box className="flex items-center gap-2">
                    <Box component="img" src="/assets/products/sq-panjeeri-bowl-v2.jpg" alt="Panjeeri" sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: "cover", border: "1px solid #ece4cb" }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 12.5, lineHeight: 1.25 }}>Classic Panjeeri</Typography>
                      <Typography variant="caption" sx={{ color: "#8d8670", fontSize: 11 }}>Rs. 1,499 · 250g</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 11, color: "#2e7d4f", background: "#e9f5ec", px: 1, py: 0.4, borderRadius: 1 }}>In stock</Typography>
                  </Box>
                </Box>
              </HomeSectionCard>
              <HomeSectionCard title="Onboarding Slides" onEdit={() => router.push("/onboarding")} onPreview={() => router.push("/onboarding?preview=1")}>
                <Box component="img" src="/assets/brand/onboarding-branded.jpg" alt="Onboarding slides" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </HomeSectionCard>
            </Box>
          </Box>
        </Box>

        <Box className="flex flex-col gap-5 min-w-0">
          {/* Recent Orders */}
          <Box>
            <SectionHead title="Recent Orders" action={<ViewAll href="/orders" />} />
            <Card sx={{ overflow: "hidden" }}>
              <Box className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 560 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                      {["# Order ID", "Customer", "Items", "Amount", "Status"].map((h, i) => (
                        <th key={i} style={{ textAlign: "left", padding: "12px 10px", fontSize: 12.5, fontWeight: 800, color: "#8d8670", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recentOrders ?? []).map((o) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0] cursor-pointer" onClick={() => router.push(`/orders?view=${o.id}`)}>
                        <td style={{ padding: "11px 10px", fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>{o.orderNumber}</td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }}>{o.customer}</td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }} className="tnum">{o.items} {o.items === 1 ? "item" : "items"}</td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }} className="tnum font-bold">{rs(o.amount)}</td>
                        <td style={{ padding: "11px 10px" }}><StatusChip status={o.status} /></td>
                      </tr>
                    ))}
                    {!(data?.recentOrders ?? []).length && (
                      <tr>
                        <td colSpan={5} style={{ padding: "34px 16px", textAlign: "center" }}>
                          {loading ? (
                            <Typography sx={{ color: "#8d8670", fontSize: 13.5 }}>Loading...</Typography>
                          ) : (
                            <Box className="flex flex-col items-center gap-1.5">
                              <Box sx={{ width: 56, height: 56, borderRadius: 2, background: "#f7ecd0", display: "flex", alignItems: "center", justifyContent: "center", color: "#8d8670" }}>
                                <InboxOutlined sx={{ fontSize: 28 }} />
                              </Box>
                              <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#3d3a2c", mt: 0.8 }}>No orders yet.</Typography>
                              <Typography sx={{ color: "#8d8670", fontSize: 12.5 }}>When customers place orders, they&rsquo;ll appear here.</Typography>
                            </Box>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Card>
          </Box>

          {/* Track Order Requests */}
          <Box>
            <SectionHead title="Track Order Requests" action={<ViewAll href="/track-orders" />} />
            <Card sx={{ overflow: "hidden" }}>
              <Box className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 540 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                      {["Tracking ID", "Order ID", "Customer", "Status", "Last Update"].map((h, i) => (
                        <th key={i} style={{ textAlign: "left", padding: "12px 10px", fontSize: 12.5, fontWeight: 800, color: "#8d8670", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.trackRequests ?? []).map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0] cursor-pointer" onClick={() => router.push(`/track-orders?view=${t.id}`)}>
                        <td style={{ padding: "11px 10px", fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>{t.trackingNumber}</td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }}>{t.orderNumber}</td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }}>{t.customer}</td>
                        <td style={{ padding: "11px 10px" }}><StatusChip status={t.status} /></td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap", color: "#57523f" }}>{fmtDate(t.updatedAt)}</td>
                      </tr>
                    ))}
                    {!(data?.trackRequests ?? []).length && (
                      <tr>
                        <td colSpan={5} style={{ padding: "34px 16px", textAlign: "center" }}>
                          {loading ? (
                            <Typography sx={{ color: "#8d8670", fontSize: 13.5 }}>Loading...</Typography>
                          ) : (
                            <Box className="flex flex-col items-center gap-1.5">
                              <Box sx={{ width: 56, height: 56, borderRadius: 2, background: "#f7ecd0", display: "flex", alignItems: "center", justifyContent: "center", color: "#8d8670" }}>
                                <LocationOnOutlined sx={{ fontSize: 28 }} />
                              </Box>
                              <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#3d3a2c", mt: 0.8 }}>No tracking records yet.</Typography>
                              <Typography sx={{ color: "#8d8670", fontSize: 12.5 }}>Track order requests from customers here.</Typography>
                            </Box>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Weekly Sales — line chart + decorative panel */}
      <Box>
        <SectionHead
          title="Weekly Sales"
          action={
            <Select
              value="7"
              size="small"
              sx={{ borderRadius: 99, fontSize: 12.5, fontWeight: 700, background: "#fffdf7", "& .MuiSelect-select": { py: 0.8, pr: 3.5 } }}
              onChange={() => {}}
            >
              <MenuItem value="7">Last 7 Days</MenuItem>
            </Select>
          }
        />
        <Card sx={{ p: { xs: 2, md: 2.5 }, overflow: "hidden" }}>
          <Box className="flex gap-4" sx={{ flexDirection: { xs: "column", md: "row" } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box className="flex items-baseline gap-2 flex-wrap">
                <Typography sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: 26, lineHeight: 1.1 }}>
                  {rs(weekTotal)}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5 }}>
                  {weekOrderCount} order{weekOrderCount === 1 ? "" : "s"} · last 7 days
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 11.5, color: "#2e7d4f", background: "#e9f5ec", px: 1.1, py: 0.4, borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 0.4 }}>
                  <TrendingUpIcon sx={{ fontSize: 13 }} /> 0% <span style={{ fontWeight: 600, color: "#57523f" }}>vs previous week</span>
                </Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <WeeklyLineChart days={days} />
              </Box>
              {weekTotal === 0 && !loading && (
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5, mt: 1, textAlign: "center" }}>
                  No orders this week yet — new orders will appear here automatically.
                </Typography>
              )}
            </Box>
            <Box sx={{ width: { xs: "100%", md: 190 }, flexShrink: 0, display: { xs: "none", md: "flex" }, flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 1, position: "relative" }}>
              <Typography
                sx={{
                  fontFamily: '"Pinyon Script", cursive',
                  color: "#b08a2e",
                  fontSize: 30,
                  lineHeight: 1.05,
                  textAlign: "right",
                }}
              >
                Small Bites
                <br />
                Bigger Wellness
              </Typography>
              <Box component="img" src="/assets/brand/home-hero.jpg" alt="Energy balls" sx={{ width: 150, height: 110, borderRadius: 3, objectFit: "cover", border: "1px solid #ece4cb" }} />
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Product Control Center */}
      <Box>
        <SectionHead
          title="Product Control Center"
          caption="Manage your products, stock, pricing and visibility."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push("/products?new=1")} sx={{ borderRadius: 99 }}>
              Add Product
            </Button>
          }
        />
        <Card sx={{ overflow: "hidden" }}>
          <Box className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                  <th style={{ width: 44, padding: "12px 8px 12px 16px" }}><Checkbox size="small" disabled /></th>
                  {["Product", "Category", "Price", "Stock", "Status", "Featured", "Actions"].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 6 ? "right" : "left", padding: "12px 12px", paddingRight: i === 6 ? 20 : 12, fontSize: 12.5, fontWeight: 800, color: "#8d8670" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.controlProducts ?? []).map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0]">
                    <td style={{ padding: "10px 8px 10px 16px" }}><Checkbox size="small" /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <Box className="flex items-center gap-3">
                        <Thumb src={p.thumb ?? p.image} alt={p.name} circle />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</Typography>
                        </Box>
                      </Box>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#57523f" }}>{p.name.split(" ")[0]}</td>
                    <td style={{ padding: "10px 12px" }} className="tnum font-bold">{rs(p.price)}</td>
                    <td style={{ padding: "10px 12px" }} className="tnum">{p.stock}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <Switch size="small" checked={p.isActive} onChange={() => toggleControlProduct(p.id, "isActive", !p.isActive)} aria-label="Toggle active" />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Switch size="small" checked={p.isFeatured} onChange={() => toggleControlProduct(p.id, "isFeatured", !p.isFeatured)} aria-label="Toggle featured" />
                    </td>
                    <td style={{ padding: "10px 20px 10px 12px", textAlign: "right" }}>
                      <Box className="inline-flex items-center gap-1.5">
                        <Button size="small" variant="text" sx={{ minWidth: 0, p: 0.8 }} onClick={() => router.push(`/products?view=${p.id}`)} aria-label="View product"><VisibilityOutlined sx={{ fontSize: 17 }} /></Button>
                        <Button size="small" variant="text" sx={{ minWidth: 0, p: 0.8 }} onClick={() => router.push(`/products?edit=${p.id}`)} aria-label="Edit product"><EditIcon sx={{ fontSize: 17 }} /></Button>
                        <Button size="small" variant="text" sx={{ minWidth: 0, p: 0.8, color: "#c0392b" }} onClick={() => router.push(`/products?delete=${p.id}`)} aria-label="Delete product"><DeleteOutline sx={{ fontSize: 17 }} /></Button>
                      </Box>
                    </td>
                  </tr>
                ))}
                {!(data?.controlProducts ?? []).length && (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#8d8670" }}>
                      {loading ? "Loading products..." : "No products yet. Add your first product to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
        </Card>
      </Box>

      {/* Manage App Screens */}
      <Box>
        <Box className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <Box className="flex items-baseline gap-3">
            <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: 21 }}>
              Manage App Screens
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5 }}>
              Update content for different app screens and keep your app fresh and engaging.
            </Typography>
          </Box>
        </Box>
        <Box className="grid gap-4" sx={{ gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" } }}>
          {MANAGE_SCREENS.map((s) => (
            <Card key={s.href} sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 1 }}>
              <Box className="flex items-start gap-2.5" sx={{ flexDirection: { xs: "column", sm: "row" } }}>
                <Box sx={{ width: { xs: 36, sm: 42 }, height: { xs: 36, sm: 42 }, borderRadius: "50%", background: "#f7ecd0", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b3a28", flexShrink: 0, "& svg": { fontSize: { xs: 18, sm: 20 } } }}>
                  {s.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.25 }}>
                    {s.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11.5, lineHeight: 1.35, display: { xs: "none", sm: "block" }, mt: 0.4 }}>
                    {s.desc}
                  </Typography>
                </Box>
              </Box>
              <Box className="flex items-center gap-1.5 mt-1" sx={{ flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" } }}>
                <Button variant="contained" size="small" onClick={() => router.push(s.href)} sx={{ px: 2.2, py: 0.6, fontSize: 12, borderRadius: 99 }}>
                  Edit
                </Button>
                <Button variant="outlined" size="small" onClick={() => router.push(`${s.href}?preview=1`)} sx={{ px: 2.2, py: 0.6, fontSize: 12, borderRadius: 99 }}>
                  View
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
