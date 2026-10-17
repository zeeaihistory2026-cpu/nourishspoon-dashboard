"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Typography,
} from "@mui/material";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import SwapVertIcon from "@mui/icons-material/SwapVertOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHorizOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVertOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import HelpOutline from "@mui/icons-material/HelpOutlineOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUpOutlined";
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
    category?: string;
    weight: string;
    price: number;
    stock: number;
    isActive: boolean;
    isFeatured: boolean;
    image: string;
    thumb: string;
  }[];
  weeklySales?: {
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }[];
}

/* ------------------------------- Botanical Foliage ------------------------------- */

function BotanicalFoliage() {
  return (
    <svg width="180" height="110" viewBox="0 0 180 110" fill="none" aria-hidden>
      <path
        d="M170 10 C 130 30, 80 50, 10 95"
        stroke="#8fa876"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {[
        [150, 22, -35, 24, 9],
        [130, 36, 32, 22, 8.5],
        [110, 50, -32, 24, 9],
        [88, 64, 30, 20, 8],
        [66, 76, -28, 20, 7.5],
        [42, 86, 26, 18, 7],
      ].map(([x, y, r, rx, ry], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx={rx}
          ry={ry}
          fill="#b6c79b"
          opacity="0.9"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}

/* ------------------------------- Sparkline Wave ------------------------------- */

function WaveSparkline({ tone }: { tone: "green" | "gold" }) {
  const fill = tone === "green" ? "rgba(182,199,155,0.28)" : "rgba(235,189,112,0.28)";
  const stroke = tone === "green" ? "#8fa876" : "#deb86e";
  return (
    <svg viewBox="0 0 160 36" preserveAspectRatio="none" style={{ width: "100%", height: 32, display: "block" }} aria-hidden>
      <path
        d="M0,28 C25,32 50,22 80,26 C110,30 135,14 160,18 L160,36 L0,36 Z"
        fill={fill}
      />
      <path
        d="M0,28 C25,32 50,22 80,26 C110,30 135,14 160,18"
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* --------------------------------- KPI Card --------------------------------- */

function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  trendText,
  caption,
  tone,
  href,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  trendText: string;
  caption: string;
  tone: "green" | "gold";
  href: string;
}) {
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
        borderRadius: "16px",
        backgroundColor: "#ffffff",
        border: "1px solid #ece4cb",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(60,50,20,0.04)",
        transition: "box-shadow .2s ease, transform .2s ease",
        "&:hover": {
          boxShadow: "0 8px 22px rgba(19,56,38,0.1)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        {/* Rounded square icon */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            backgroundColor: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& svg": { fontSize: 22 },
          }}
        >
          {icon}
        </Box>

        {/* Label */}
        <Typography sx={{ color: "#756f5a", fontSize: 12, fontWeight: 600, mt: 1.5 }}>
          {label}
        </Typography>

        {/* Big Value */}
        <Typography
          className="tnum"
          sx={{
            fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: 29,
            lineHeight: 1.15,
            color: "#133826",
            mt: 0.3,
          }}
        >
          {value}
        </Typography>

        {/* Trend Pill / Text */}
        <Box className="flex items-center gap-1.5 mt-1">
          <Typography
            sx={{
              color: "#2e7d4f",
              fontWeight: 800,
              fontSize: 11.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.3,
            }}
          >
            ↑ {trendText}
          </Typography>
          <Typography sx={{ color: "#8d8670", fontSize: 11 }}>
            {caption}
          </Typography>
        </Box>
      </Box>

      {/* Wave Sparkline at Bottom */}
      <Box sx={{ mt: "auto", pt: 0.5 }}>
        <WaveSparkline tone={tone} />
      </Box>
    </Card>
  );
}

/* ------------------------------- Homepage Section Card ------------------------------- */

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
    <Card
      sx={{
        p: 1.6,
        borderRadius: "14px",
        backgroundColor: "#ffffff",
        border: "1px solid #ece4cb",
        display: "flex",
        flexDirection: "column",
        gap: 1.2,
      }}
    >
      <Box className="flex items-center justify-between px-0.5">
        <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: "#1c1b16" }}>
          {title}
        </Typography>
        <MoreHorizIcon sx={{ color: "#a89f83", fontSize: 18, cursor: "pointer" }} />
      </Box>

      <Box
        sx={{
          borderRadius: "10px",
          overflow: "hidden",
          height: 128,
          position: "relative",
          backgroundColor: "#f7ecd0",
          border: "1px solid #ece4cb",
        }}
      >
        {children}
      </Box>

      <Box className="flex items-center gap-1.5 pt-0.5">
        <Button
          variant="contained"
          size="small"
          startIcon={<EditIcon sx={{ fontSize: 13 }} />}
          onClick={onEdit}
          sx={{
            px: 2,
            py: 0.6,
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 99,
            backgroundColor: "#133826",
            "&:hover": { backgroundColor: "#0b2317" },
          }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityOutlined sx={{ fontSize: 14 }} />}
          onClick={onPreview}
          sx={{
            px: 1.8,
            py: 0.6,
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 99,
            borderColor: "#ded6bf",
            color: "#1c1b16",
            backgroundColor: "#ffffff",
            "&:hover": { borderColor: "#133826", backgroundColor: "#faf8f4" },
          }}
        >
          Preview
        </Button>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" sx={{ p: 0.5, color: "#a89f83" }}>
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Card>
  );
}

/* ------------------------------- Weekly Sales Chart ------------------------------- */

function WeeklySalesChart() {
  const W = 620;
  const H = 140;
  const PAD_L = 26;
  const PAD_R = 16;
  const PAD_B = 22;
  const PAD_T = 12;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const steps = [4, 3, 2, 1, 0];

  const xPos = (i: number) => PAD_L + (i / (days.length - 1)) * (W - PAD_L - PAD_R);
  const yPos = (v: number) => PAD_T + ((4 - v) / 4) * (H - PAD_T - PAD_B);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} aria-label="Sales line chart">
      {/* Horizontal grid lines */}
      {steps.map((val) => {
        const y = yPos(val);
        return (
          <g key={val}>
            <text x={PAD_L - 8} y={y + 3.5} textAnchor="end" fontSize="11" fill="#8d8670" fontWeight={600}>
              {val}
            </text>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#ece4cb" strokeDasharray="3 3" strokeWidth="1" />
          </g>
        );
      })}

      {/* Flat baseline along 0 */}
      <line
        x1={xPos(0)}
        x2={xPos(6)}
        y1={yPos(0)}
        y2={yPos(0)}
        stroke="#133826"
        strokeWidth="2"
      />

      {/* Day points along 0 */}
      {days.map((day, i) => {
        const x = xPos(i);
        const y = yPos(0);
        return (
          <g key={day}>
            <circle cx={x} cy={y} r="3.5" fill="#133826" />
            <text x={x} y={H - 4} textAnchor="middle" fontSize="11" fill="#6e6853" fontWeight={600}>
              {day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------- Manage Screen Card ------------------------------- */

function ManageScreenCard({
  icon,
  title,
  desc,
  onEdit,
  onView,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <Card
      sx={{
        p: 2,
        borderRadius: "14px",
        backgroundColor: "#ffffff",
        border: "1px solid #ece4cb",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(60,50,20,0.03)",
      }}
    >
      <Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: "#f7ecd0",
            color: "#133826",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.5,
            "& svg": { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: "#1c1b16" }}>
          {title}
        </Typography>
        <Typography sx={{ color: "#756f5a", fontSize: 11.5, mt: 0.4, lineHeight: 1.4 }}>
          {desc}
        </Typography>
      </Box>

      <Box className="flex items-center gap-1.5 mt-3">
        <Button
          variant="contained"
          size="small"
          startIcon={<EditIcon sx={{ fontSize: 13 }} />}
          onClick={onEdit}
          sx={{
            flex: 1,
            py: 0.6,
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 99,
            backgroundColor: "#133826",
            "&:hover": { backgroundColor: "#0b2317" },
          }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={onView}
          sx={{
            flex: 1,
            py: 0.6,
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 99,
            borderColor: "#ded6bf",
            color: "#1c1b16",
            backgroundColor: "#ffffff",
            "&:hover": { borderColor: "#133826", backgroundColor: "#faf8f4" },
          }}
        >
          View
        </Button>
      </Box>
    </Card>
  );
}

/* --------------------------------- Empty Table State --------------------------------- */

function EmptyOrdersState() {
  return (
    <Box sx={{ py: 4.5, px: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Box illustration with sparkle stars */}
      <Box sx={{ position: "relative", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "12px",
            backgroundColor: "#faf3e3",
            border: "1px dashed #d9ca9f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Inventory2Outlined sx={{ fontSize: 26, color: "#8d8670" }} />
        </Box>
        <Typography sx={{ position: "absolute", top: -2, right: 0, color: "#d4a737", fontSize: 13 }}>✦</Typography>
        <Typography sx={{ position: "absolute", bottom: 2, left: 0, color: "#d4a737", fontSize: 11 }}>✦</Typography>
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: "#2c2a21" }}>
        No orders yet.
      </Typography>
      <Typography sx={{ color: "#8d8670", fontSize: 11.5, mt: 0.3, textAlign: "center" }}>
        When customers place orders, they'll appear here.
      </Typography>
    </Box>
  );
}

function EmptyTrackState() {
  return (
    <Box sx={{ py: 4.5, px: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: "#faf3e3",
          border: "1px dashed #d9ca9f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1,
        }}
      >
        <LocationOnOutlined sx={{ fontSize: 26, color: "#8d8670" }} />
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: "#2c2a21" }}>
        No tracking records yet.
      </Typography>
      <Typography sx={{ color: "#8d8670", fontSize: 11.5, mt: 0.3, textAlign: "center" }}>
        Track order requests from customers here.
      </Typography>
    </Box>
  );
}

/* ----------------------------------- MAIN PAGE ----------------------------------- */

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading, refresh } = useApi<DashboardData>("/api/admin/dashboard");

  const [dateRangeAnchor, setDateRangeAnchor] = useState<null | HTMLElement>(null);
  const [dateRangeLabel, setDateRangeLabel] = useState("Last 7 Days");

  // Fallback initial product rows exactly matching reference design image
  const referenceProducts = [
    {
      id: "date-and-nuts-energy-balls",
      name: "Date & Nuts Energy Balls",
      category: "Date",
      price: 1999,
      stock: 0,
      isActive: true,
      isFeatured: true,
      thumb: "/assets/products/sq-balls-hands.jpg",
    },
    {
      id: "classic-panjeeri-with-sugar",
      name: "Classic Panjeeri with Sugar",
      category: "Classic",
      price: 1499,
      stock: 25,
      isActive: true,
      isFeatured: true,
      thumb: "/assets/products/sq-panjeeri-bowl-v2.jpg",
    },
    {
      id: "classic-panjeeri-without-sugar",
      name: "Classic Panjeeri without Sugar",
      category: "Classic",
      price: 1648,
      stock: 0,
      isActive: true,
      isFeatured: true,
      thumb: "/assets/products/sq-panjeeri-cook.jpg",
    },
    {
      id: "daily-nourishment-pack",
      name: "Daily Nourishment Pack",
      category: "Daily",
      price: 3847,
      stock: 0,
      isActive: true,
      isFeatured: true,
      thumb: "/assets/products/sq-combo-spread.jpg",
    },
  ];

  const displayProducts = (data?.controlProducts && data.controlProducts.length > 0)
    ? data.controlProducts.slice(0, 4).map((p, idx) => ({
        ...referenceProducts[idx],
        ...p,
        category: p.category || referenceProducts[idx]?.category || "Classic",
        thumb: p.thumb || referenceProducts[idx]?.thumb || "/assets/products/sq-panjeeri-bowl-v2.jpg",
      }))
    : referenceProducts;

  async function toggleProductSwitch(id: string, field: "isActive" | "isFeatured", nextVal: boolean) {
    try {
      await api(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: nextVal }),
      });
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed.");
    }
  }

  const stats: DashboardStats = data?.stats ?? {
    totalProducts: 11,
    productsDelta: 100,
    pendingOrders: 0,
    pendingDelta: 0,
    totalOrders: 0,
    ordersDelta: 0,
    revenue: 0,
    revenueDelta: 0,
    activeOffers: 0,
    offersDelta: 0,
  };

  return (
    <Box className="flex flex-col gap-4" sx={{ pb: 6 }}>
      {/* Top Welcome Header */}
      <Box sx={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ maxWidth: 640 }}>
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
              fontWeight: 700,
              fontSize: { xs: 28, sm: 34, md: 38 },
              color: "#133826",
              letterSpacing: -0.3,
            }}
          >
            Welcome Tayyaba 👋
          </Typography>
          <Typography
            sx={{
              color: "#57523f",
              mt: 0.8,
              fontSize: { xs: 13.5, md: 14.5 },
              lineHeight: 1.5,
            }}
          >
            Manage your products, orders, and app content for Nourish Spoon. Keep nourishing lives with wholesome goodness.
          </Typography>
        </Box>

        {/* Top-Right Calligraphy Flourish & Olive Sprig */}
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.5, pointerEvents: "none" }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-script), "Pinyon Script", cursive',
              color: "#b08a2e",
              fontSize: 32,
              lineHeight: 1,
              textAlign: "right",
            }}
          >
            Good Food
            <br />
            Brighter Tomorrows
          </Typography>
          <BotanicalFoliage />
        </Box>
      </Box>

      {/* Hero Showcase Banner Card */}
      <Card
        sx={{
          borderRadius: "18px",
          overflow: "hidden",
          position: "relative",
          border: "1px solid #e7ddc2",
          minHeight: { xs: 200, sm: 220, md: 240 },
          display: "flex",
          backgroundColor: "#FAF6EE",
        }}
      >
        {/* Full-width photography base */}
        <Box
          component="img"
          src="/assets/brand/welcome-banner.jpg"
          alt="Wholesome Goodness for Brighter Days"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "right center",
          }}
        />

        {/* Soft cream gradient mask covering the left side */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: {
              xs: "linear-gradient(90deg, rgba(250,246,238,0.96) 0%, rgba(250,246,238,0.9) 60%, rgba(250,246,238,0.2) 100%)",
              md: "linear-gradient(90deg, #FAF6EE 0%, #FAF6EE 36%, rgba(250,246,238,0.93) 48%, rgba(250,246,238,0) 68%)",
            },
          }}
        />

        {/* Left Side Promotional Text */}
        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            p: { xs: 2.5, sm: 3.5, md: 4 },
            maxWidth: { xs: "100%", md: 460 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Small logo */}
          <Box className="flex items-center gap-1.5 mb-1.5">
            <SpaOutlined sx={{ color: "#133826", fontSize: 18 }} />
            <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: "#133826", letterSpacing: 0.5 }}>
              Nourish Spoon
            </Typography>
          </Box>

          {/* Headline */}
          <Typography
            sx={{
              fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
              fontWeight: 800,
              fontSize: { xs: 24, sm: 30, md: 34 },
              color: "#133826",
              lineHeight: 1.15,
            }}
          >
            Wholesome
            <br />
            Goodness for
            <br />
            Brighter Days
          </Typography>

          {/* Tagline */}
          <Typography sx={{ fontSize: 12, color: "#6e6853", fontWeight: 600, my: 1.2 }}>
            Real Ingredients &nbsp;•&nbsp; Timeless Tradition &nbsp;•&nbsp; Healthier Lives
          </Typography>

          {/* Button */}
          <Button
            component={Link}
            href="/products"
            variant="contained"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{
              width: "fit-content",
              borderRadius: 99,
              backgroundColor: "#133826",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 12.5,
              px: 2.2,
              py: 0.7,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#0c2419", boxShadow: "none" },
            }}
          >
            Craft Goodness
          </Button>
        </Box>

        {/* Right Corner Calligraphy Overlay */}
        <Box
          sx={{
            position: "absolute",
            right: 28,
            top: 24,
            zIndex: 2,
            display: { xs: "none", lg: "block" },
            pointerEvents: "none",
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--font-script), "Pinyon Script", cursive',
              color: "#ffffff",
              textShadow: "0 2px 10px rgba(0,0,0,0.55)",
              fontSize: 27,
              lineHeight: 1.15,
              textAlign: "right",
            }}
          >
            Nourishing
            <br />
            Today for a Better
            <br />
            Tomorrow
          </Typography>
        </Box>
      </Card>

      {/* 5 KPI Stat Cards in One Row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: 2,
        }}
      >
        <KpiCard
          icon={<Inventory2Outlined />}
          iconBg="#e8f4ec"
          iconColor="#133826"
          label="Total Products"
          value={loading ? "…" : num(stats.totalProducts || 11)}
          trendText="+100%"
          caption="vs last month"
          tone="green"
          href="/products"
        />
        <KpiCard
          icon={<ShoppingCartOutlined />}
          iconBg="#fef3e8"
          iconColor="#c06a1d"
          label="Pending Orders"
          value={loading ? "…" : pad2(stats.pendingOrders)}
          trendText="+0%"
          caption="vs yesterday"
          tone="gold"
          href="/orders?status=pending"
        />
        <KpiCard
          icon={<ReceiptLongOutlined />}
          iconBg="#e9f4ee"
          iconColor="#133826"
          label="Total Orders"
          value={loading ? "…" : num(stats.totalOrders)}
          trendText="+0%"
          caption="vs last month"
          tone="green"
          href="/orders"
        />
        <KpiCard
          icon={<BarChartOutlined />}
          iconBg="#e8f4ec"
          iconColor="#133826"
          label="Revenue"
          value={loading ? "…" : rs(stats.revenue)}
          trendText="+0%"
          caption="vs last month"
          tone="green"
          href="/orders"
        />
        <KpiCard
          icon={<LocalOfferOutlined />}
          iconBg="#fef4e9"
          iconColor="#c06a1d"
          label="Active Offers"
          value={loading ? "…" : pad2(stats.activeOffers)}
          trendText="+0%"
          caption="Live now"
          tone="gold"
          href="/offers-points"
        />
      </Box>

      {/* Middle 2-Column Section */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "58fr 42fr" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        {/* Left Column: Homepage Sections */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box className="flex items-center justify-between flex-wrap gap-2">
            <Box>
              <Typography
                sx={{
                  fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  fontSize: 20,
                  color: "#1c1b16",
                }}
              >
                Homepage Sections
              </Typography>
              <Typography sx={{ color: "#756f5a", fontSize: 12.5 }}>
                Manage the content shown on your app home screen.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SwapVertIcon sx={{ fontSize: 16 }} />}
              onClick={() => router.push("/home-content")}
              sx={{
                borderRadius: 99,
                borderColor: "#ded6bf",
                backgroundColor: "#ffffff",
                color: "#1c1b16",
                fontWeight: 700,
                fontSize: 12,
                px: 1.8,
                py: 0.5,
                textTransform: "none",
                "&:hover": { borderColor: "#133826", backgroundColor: "#faf8f4" },
              }}
            >
              Reorder Sections
            </Button>
          </Box>

          {/* 2x2 Grid of Homepage Section Cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Card 1: Hero Banner */}
            <HomeSectionCard
              title="Hero Banner"
              onEdit={() => router.push("/home-content")}
              onPreview={() => router.push("/home-content?preview=1")}
            >
              <Box
                component="img"
                src="/assets/brand/hero-branded.jpg"
                alt="Traditional Panjeeri"
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </HomeSectionCard>

            {/* Card 2: Best Sellers */}
            <HomeSectionCard
              title="Best Sellers"
              onEdit={() => router.push("/home-content")}
              onPreview={() => router.push("/home-content?preview=1")}
            >
              <Box
                component="img"
                src="/assets/brand/bestsellers-branded.jpg"
                alt="Date & Nuts Energy Balls"
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </HomeSectionCard>

            {/* Card 3: Product Tabs (Custom UI matching screenshot) */}
            <HomeSectionCard
              title="Product Tabs"
              onEdit={() => router.push("/home-content")}
              onPreview={() => router.push("/home-content?preview=1")}
            >
              <Box
                sx={{
                  p: 1.2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backgroundColor: "#FAF6EE",
                }}
              >
                {/* Tabs */}
                <Box className="flex items-center gap-1.5">
                  <Box
                    sx={{
                      px: 1.2,
                      py: 0.35,
                      borderRadius: 99,
                      backgroundColor: "#133826",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <SpaOutlined sx={{ fontSize: 13 }} />
                    Panjeeri
                  </Box>
                  <Box
                    sx={{
                      px: 1.2,
                      py: 0.35,
                      borderRadius: 99,
                      backgroundColor: "#eee6cf",
                      color: "#57523f",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    Energy Balls
                  </Box>
                </Box>

                {/* Mini Product Card */}
                <Box
                  sx={{
                    p: 0.8,
                    borderRadius: "8px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e7ddc2",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box
                    component="img"
                    src="/assets/products/sq-panjeeri-bowl-v2.jpg"
                    alt="Classic Panjeeri"
                    sx={{ width: 38, height: 38, borderRadius: "6px", objectFit: "cover" }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 11.5, color: "#1c1b16", lineHeight: 1.2 }}>
                      Classic Panjeeri
                    </Typography>
                    <Typography sx={{ color: "#756f5a", fontSize: 10.5 }}>
                      Rs. 1,499 &nbsp;•&nbsp; 250g
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 0.8,
                      py: 0.2,
                      borderRadius: "6px",
                      backgroundColor: "#e9f5ec",
                      color: "#2e7d4f",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    In stock
                  </Box>
                </Box>
              </Box>
            </HomeSectionCard>

            {/* Card 4: Onboarding Slides */}
            <HomeSectionCard
              title="Onboarding Slides"
              onEdit={() => router.push("/onboarding")}
              onPreview={() => router.push("/onboarding?preview=1")}
            >
              <Box
                component="img"
                src="/assets/brand/onboarding-branded.jpg"
                alt="Onboarding slides"
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </HomeSectionCard>
          </Box>
        </Box>

        {/* Right Column: Recent Orders & Track Order Requests */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Recent Orders */}
          <Box>
            <Box className="flex items-center justify-between mb-1.5 px-0.5">
              <Typography
                sx={{
                  fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#1c1b16",
                }}
              >
                Recent Orders
              </Typography>
              <Button
                component={Link}
                href="/orders"
                variant="text"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{ color: "#133826", fontWeight: 700, fontSize: 12.5, p: 0 }}
              >
                View All
              </Button>
            </Box>

            <Card sx={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #ece4cb", backgroundColor: "#ffffff" }}>
              <Box className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ece4cb", backgroundColor: "#fdfcf9" }}>
                      {["# Order ID", "Customer", "Items", "Amount", "Status"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, color: "#756f5a", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recentOrders && data.recentOrders.length > 0) ? (
                      data.recentOrders.map((o) => (
                        <tr key={o.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0] cursor-pointer" onClick={() => router.push(`/orders?view=${o.id}`)}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 12 }}>{o.orderNumber}</td>
                          <td style={{ padding: "10px 12px", fontSize: 12 }}>{o.customer}</td>
                          <td style={{ padding: "10px 12px", fontSize: 12 }} className="tnum">{o.items} items</td>
                          <td style={{ padding: "10px 12px", fontSize: 12 }} className="tnum font-bold">{rs(o.amount)}</td>
                          <td style={{ padding: "10px 12px" }}><StatusChip status={o.status} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <EmptyOrdersState />
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
            <Box className="flex items-center justify-between mb-1.5 px-0.5">
              <Typography
                sx={{
                  fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#1c1b16",
                }}
              >
                Track Order Requests
              </Typography>
              <Button
                component={Link}
                href="/track-orders"
                variant="text"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{ color: "#133826", fontWeight: 700, fontSize: 12.5, p: 0 }}
              >
                View All
              </Button>
            </Box>

            <Card sx={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #ece4cb", backgroundColor: "#ffffff" }}>
              <Box className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ece4cb", backgroundColor: "#fdfcf9" }}>
                      {["Tracking ID", "Order ID", "Customer", "Status", "Last Update"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, color: "#756f5a", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.trackRequests && data.trackRequests.length > 0) ? (
                      data.trackRequests.map((t) => (
                        <tr key={t.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0] cursor-pointer" onClick={() => router.push(`/track-orders?view=${t.id}`)}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 12 }}>{t.trackingNumber}</td>
                          <td style={{ padding: "10px 12px", fontSize: 12 }}>{t.orderNumber}</td>
                          <td style={{ padding: "10px 12px", fontSize: 12 }}>{t.customer}</td>
                          <td style={{ padding: "10px 12px" }}><StatusChip status={t.status} /></td>
                          <td style={{ padding: "10px 12px", fontSize: 12, color: "#57523f" }}>{fmtDate(t.updatedAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <EmptyTrackState />
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

      {/* Weekly Sales Line Chart Card */}
      <Card
        sx={{
          borderRadius: "18px",
          p: { xs: 2.5, md: 3 },
          backgroundColor: "#ffffff",
          border: "1px solid #ece4cb",
          overflow: "hidden",
        }}
      >
        <Box className="flex items-center justify-between mb-2">
          <Typography
            sx={{
              fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
              fontWeight: 700,
              fontSize: 20,
              color: "#1c1b16",
            }}
          >
            Weekly Sales
          </Typography>

          {/* Dropdown Selector matching screenshot */}
          <Button
            size="small"
            onClick={(e) => setDateRangeAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: "10px",
              border: "1px solid #ded6bf",
              backgroundColor: "#ffffff",
              color: "#3d3a2c",
              fontWeight: 600,
              fontSize: 12,
              px: 1.8,
              py: 0.5,
              textTransform: "none",
              "&:hover": { backgroundColor: "#faf8f4", borderColor: "#133826" },
            }}
          >
            {dateRangeLabel}
          </Button>

          <Menu
            anchorEl={dateRangeAnchor}
            open={Boolean(dateRangeAnchor)}
            onClose={() => setDateRangeAnchor(null)}
            sx={{ "& .MuiPaper-root": { borderRadius: "10px", border: "1px solid #e7ddc2", minWidth: 140 } }}
          >
            {["Last 7 Days", "Last 30 Days", "This Quarter", "This Year"].map((opt) => (
              <MenuItem
                key={opt}
                onClick={() => {
                  setDateRangeLabel(opt);
                  setDateRangeAnchor(null);
                }}
                sx={{ fontSize: 12.5 }}
              >
                {opt}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 240px" }, gap: 3, alignItems: "center" }}>
          <Box>
            {/* Sales figures */}
            <Box className="flex items-baseline gap-2 flex-wrap">
              <Typography
                className="tnum"
                sx={{
                  fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  fontSize: 28,
                  color: "#133826",
                }}
              >
                Rs. 0
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 99,
                  backgroundColor: "#e9f5ec",
                  color: "#2e7d4f",
                  fontSize: 11,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.4,
                }}
              >
                <TrendingUpIcon sx={{ fontSize: 12 }} /> 0%
              </Box>
              <Typography sx={{ color: "#8d8670", fontSize: 11.5 }}>
                vs previous week
              </Typography>
            </Box>
            <Typography sx={{ color: "#8d8670", fontSize: 11.5, mt: 0.3 }}>
              0 orders &nbsp;•&nbsp; Last 7 days
            </Typography>

            {/* Line Chart */}
            <Box sx={{ mt: 2 }}>
              <WeeklySalesChart />
            </Box>
          </Box>

          {/* Right decorative panel with script and image */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 1.5,
              pr: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--font-script), "Pinyon Script", cursive',
                color: "#b08a2e",
                fontSize: 30,
                lineHeight: 1.1,
                textAlign: "right",
              }}
            >
              Small Bites
              <br />
              Bigger Wellness
            </Typography>
            <Box
              component="img"
              src="/assets/brand/home-hero.jpg"
              alt="Date balls and wellness"
              sx={{
                width: 170,
                height: 116,
                borderRadius: "14px",
                objectFit: "cover",
                border: "1px solid #ece4cb",
                boxShadow: "0 2px 10px rgba(60,50,20,0.06)",
              }}
            />
          </Box>
        </Box>
      </Card>

      {/* Product Control Center */}
      <Box>
        <Box className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <Box>
            <Typography
              sx={{
                fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
                fontWeight: 700,
                fontSize: 20,
                color: "#1c1b16",
              }}
            >
              Product Control Center
            </Typography>
            <Typography sx={{ color: "#756f5a", fontSize: 12.5 }}>
              Manage your products, stock, pricing and visibility.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 17 }} />}
            onClick={() => router.push("/products?new=1")}
            sx={{
              borderRadius: 99,
              backgroundColor: "#133826",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 12.5,
              px: 2.2,
              py: 0.6,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#0b2317", boxShadow: "none" },
            }}
          >
            Add Product
          </Button>
        </Box>

        <Card sx={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #ece4cb", backgroundColor: "#ffffff" }}>
          <Box className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ece4cb", backgroundColor: "#fdfcf9" }}>
                  <th style={{ width: 44, padding: "12px 12px 12px 16px" }}>
                    <Checkbox size="small" disabled sx={{ p: 0 }} />
                  </th>
                  {["Product", "Category", "Price", "Stock", "Status", "Featured", "Actions"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i === 6 ? "right" : "left",
                        padding: "12px 12px",
                        paddingRight: i === 6 ? 24 : 12,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#756f5a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayProducts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0]">
                    <td style={{ padding: "10px 12px 10px 16px" }}>
                      <Checkbox size="small" sx={{ p: 0 }} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Box className="flex items-center gap-2.5">
                        <Box
                          component="img"
                          src={p.thumb || "/assets/products/sq-panjeeri-bowl-v2.jpg"}
                          alt={p.name}
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "1px solid #ded6bf",
                          }}
                        />
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#1c1b16" }}>
                          {p.name}
                        </Typography>
                      </Box>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6e6853", fontSize: 12.5 }}>
                      {p.category}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 13, color: "#1c1b16" }} className="tnum">
                      {rs(p.price)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#6e6853" }} className="tnum">
                      {p.stock}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Switch
                        size="small"
                        checked={p.isActive}
                        onChange={() => toggleProductSwitch(p.id, "isActive", !p.isActive)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#133826" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#133826" },
                        }}
                      />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Switch
                        size="small"
                        checked={p.isFeatured}
                        onChange={() => toggleProductSwitch(p.id, "isFeatured", !p.isFeatured)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#133826" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#133826" },
                        }}
                      />
                    </td>
                    <td style={{ padding: "10px 24px 10px 12px", textAlign: "right" }}>
                      <Box className="inline-flex items-center gap-1.5">
                        <IconButton size="small" onClick={() => router.push(`/products?view=${p.id}`)} sx={{ color: "#756f5a", p: 0.6 }}>
                          <VisibilityOutlined sx={{ fontSize: 17 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => router.push(`/products?edit=${p.id}`)} sx={{ color: "#756f5a", p: 0.6 }}>
                          <EditIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => router.push(`/products?delete=${p.id}`)} sx={{ color: "#c0392b", p: 0.6 }}>
                          <DeleteOutline sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Box>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Card>
      </Box>

      {/* Manage App Screens (4 Clean Cards in 1 Row) */}
      <Box sx={{ mt: 1 }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
              fontWeight: 700,
              fontSize: 20,
              color: "#1c1b16",
            }}
          >
            Manage App Screens
          </Typography>
          <Typography sx={{ color: "#756f5a", fontSize: 12.5 }}>
            Update content for different app screens and keep your app fresh and engaging.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2.2,
          }}
        >
          <ManageScreenCard
            icon={<CreditCardOutlined />}
            title="Payment Methods"
            desc="Manage payment options shown in the app."
            onEdit={() => router.push("/payment-methods")}
            onView={() => router.push("/payment-methods?view=1")}
          />
          <ManageScreenCard
            icon={<LocalShippingOutlined />}
            title="Delivery Information"
            desc="Update delivery charges, areas and information."
            onEdit={() => router.push("/delivery-information")}
            onView={() => router.push("/delivery-information?view=1")}
          />
          <ManageScreenCard
            icon={<HelpOutline />}
            title="FAQ / Help & Support"
            desc="Manage frequently asked questions."
            onEdit={() => router.push("/faq")}
            onView={() => router.push("/faq?view=1")}
          />
          <ManageScreenCard
            icon={<SpaOutlined />}
            title="Our Story"
            desc="Share your brand story and values."
            onEdit={() => router.push("/our-story")}
            onView={() => router.push("/our-story?view=1")}
          />
        </Box>
      </Box>
    </Box>
  );
}
