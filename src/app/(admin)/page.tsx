"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Switch,
  Typography,
} from "@mui/material";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicatorOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHorizOutlined";
import SwapVertIcon from "@mui/icons-material/SwapVertOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
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
import { useApi } from "@/lib/api";
import { rs, num, pad2, fmtDate } from "@/lib/format";
import { StatusChip, Thumb } from "@/components/ui";
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
    stock: number | null;
    isActive: boolean;
    isFeatured: boolean;
    image: string;
  }[];
}

/* ------------------------------- decorations ------------------------------- */

function LeafBranch({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="150"
      height="120"
      viewBox="0 0 150 120"
      fill="none"
      aria-hidden
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <path
        d="M10 110 C 40 80, 70 60, 135 25"
        stroke="#8fa876"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {[
        [30, 92, -32, 26, 11],
        [52, 76, 28, 24, 10],
        [72, 62, -30, 26, 11],
        [94, 48, 30, 24, 10],
        [114, 36, -28, 22, 9],
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

/* --------------------------------- KPI card --------------------------------- */

function KpiCard({
  icon,
  label,
  value,
  delta,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: number;
  caption: string;
}) {
  const up = delta >= 0;
  return (
    <Card sx={{ p: 0, flex: 1, minWidth: 0 }}>
      <CardContent
        sx={{ p: 2.2, display: "flex", alignItems: "center", gap: 1.8, "&:last-child": { pb: 2.2 } }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#f7ecd0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1b3a28",
            flexShrink: 0,
            "& svg": { fontSize: 24 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>
            {label}
          </Typography>
          <Box className="flex items-baseline gap-2 flex-wrap">
            <Typography
              className="tnum"
              sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 29, lineHeight: 1.15 }}
            >
              {value}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: up ? "#2e7d4f" : "#c0392b",
                fontWeight: 800,
                fontSize: 11.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.3,
              }}
            >
              {up ? <TrendingUpIcon sx={{ fontSize: 13 }} /> : <TrendingDownIcon sx={{ fontSize: 13 }} />}
              +{delta}%
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11 }}>
            {caption}
          </Typography>
        </Box>
        <ChevronRightIcon sx={{ color: "#b3a983", fontSize: 20, flexShrink: 0 }} />
      </CardContent>
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
          sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21 }}
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
          height: 118,
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
          sx={{ px: 2, py: 0.7, fontSize: 12.5 }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityOutlined sx={{ fontSize: 14 }} />}
          onClick={onPreview}
          sx={{ px: 1.6, py: 0.7, fontSize: 12.5 }}
        >
          Preview
        </Button>
        <Box sx={{ flex: 1 }} />
        <DragIndicatorIcon sx={{ color: "#b3a983", fontSize: 18, cursor: "grab" }} />
      </Box>
    </Card>
  );
}

/* --------------------------------- manage screens --------------------------------- */

const MANAGE_SCREENS: { href: string; title: string; desc: string; icon: React.ReactNode }[] = [
  { href: "/payment-methods", title: "Payment Methods", desc: "Manage payment options shown in the app.", icon: <CreditCardOutlined /> },
  { href: "/delivery-information", title: "Delivery Information", desc: "Update delivery charges, areas and information.", icon: <LocalShippingOutlined /> },
  { href: "/faq", title: "FAQ / Help & Support", desc: "Manage frequently asked questions.", icon: <HelpOutline /> },
  { href: "/our-story", title: "Our Story", desc: "Edit your brand story and values.", icon: <NatureOutlined /> },
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
  const { data, loading } = useApi<DashboardData>("/api/admin/dashboard");

  const stats: DashboardStats = data?.stats ?? {
    totalProducts: 0, productsDelta: 0, pendingOrders: 0, pendingDelta: 0,
    totalOrders: 0, ordersDelta: 0, revenue: 0, revenueDelta: 0, activeOffers: 0, offersDelta: 0,
  };

  return (
    <Box className="flex flex-col gap-5">
      {/* Hero banner */}
      <Card
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(100deg, #fbf6e7 0%, #f6efda 55%, #f1e7cc 100%)",
          border: "1px solid #e7ddc2",
        }}
      >
        <Box sx={{ position: "absolute", left: -8, bottom: -10, opacity: 0.9 }}>
          <LeafBranch />
        </Box>
        <Box className="flex items-center" sx={{ position: "relative", minHeight: 232 }}>
          <Box sx={{ flex: "1 1 42%", pl: { xs: 3, md: 5 }, pr: 2, py: 4, zIndex: 1 }}>
            <Typography
              variant="h3"
              sx={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: { xs: 32, md: 44 },
                color: "#1b3a28",
                letterSpacing: 0.2,
              }}
            >
              Welcome Back, Admin!
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "#57523f", mt: 1.2, maxWidth: 460, fontSize: 15, lineHeight: 1.55 }}
            >
              Manage your products, orders, and app content for Nourish Spoon. Keep nourishing
              lives with wholesome goodness.
            </Typography>
          </Box>
          <Box
            sx={{
              flex: "1 1 58%",
              alignSelf: "stretch",
              position: "relative",
              display: { xs: "none", sm: "block" },
              minHeight: 232,
            }}
          >
            <Box
              component="img"
              src="/assets/brand/bowl.jpg"
              alt="Nourish Spoon wholesome products"
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 65%",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent 0, #000 20%, #000 82%, transparent 100%)",
                maskImage:
                  "linear-gradient(90deg, transparent 0, #000 20%, #000 82%, transparent 100%)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 250,
                background:
                  "linear-gradient(90deg, rgba(251,246,231,0) 0%, rgba(251,246,231,0.92) 60%)",
              }}
            />
            <Typography
              sx={{
                position: "absolute",
                right: 24,
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: 'var(--font-script)',
                color: "#b08a2e",
                fontSize: 24,
                lineHeight: 1.45,
                textAlign: "center",
                width: 150,
              }}
            >
              Wholesome
              <br />
              Nutrition
              <br />
              for a Healthier
              <br />
              Tomorrow
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* KPI cards */}
      <Box className="grid gap-4" sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "repeat(5, 1fr)" } }}>
        <KpiCard icon={<Inventory2Outlined />} label="Total Products" value={loading ? "…" : num(stats.totalProducts)} delta={stats.productsDelta} caption="vs last month" />
        <KpiCard icon={<ShoppingCartOutlined />} label="Pending Orders" value={loading ? "…" : pad2(stats.pendingOrders)} delta={stats.pendingDelta} caption="vs yesterday" />
        <KpiCard icon={<ReceiptLongOutlined />} label="Total Orders" value={loading ? "…" : num(stats.totalOrders)} delta={stats.ordersDelta} caption="vs last month" />
        <KpiCard icon={<AccountBalanceWalletOutlined />} label="Revenue" value={loading ? "…" : rs(stats.revenue)} delta={stats.revenueDelta} caption="vs last month" />
        <KpiCard icon={<LocalOfferOutlined />} label="Active Offers" value={loading ? "…" : pad2(stats.activeOffers)} delta={stats.offersDelta} caption="Live now" />
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
                <Button variant="outlined" size="small" startIcon={<SwapVertIcon />} onClick={() => router.push("/home-content")}>
                  Reorder Sections
                </Button>
              }
            />
            <Box className="grid gap-4" sx={{ gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
              <HomeSectionCard title="Hero Banner" onEdit={() => router.push("/home-content")} onPreview={() => router.push("/home-content?preview=1")}>
                <Box component="img" src="/assets/brand/panjeeri.jpg" alt="Hero banner" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <Box sx={{ position: "absolute", left: 10, top: 10, color: "#fffdf7", textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}>
                  <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                    Traditional
                    <br />
                    Panjeeri
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 11 }}>from Sargodha</Typography>
                </Box>
              </HomeSectionCard>
              <HomeSectionCard title="Best Sellers" onEdit={() => router.push("/home-content")} onPreview={() => router.push("/home-content?preview=1")}>
                <Box component="img" src="/assets/brand/energy-balls.jpg" alt="Best sellers" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </HomeSectionCard>
              <HomeSectionCard title="Product Tabs" onEdit={() => router.push("/home-content")} onPreview={() => router.push("/home-content?preview=1")}>
                <Box className="flex items-center justify-center gap-3 h-full" sx={{ background: "#fbf6e7" }}>
                  {[
                    { label: "Panjeeri", icon: <SpaOutlined /> },
                    { label: "Energy Balls", icon: <Inventory2Outlined /> },
                    { label: "Combos", icon: <ShoppingCartOutlined /> },
                  ].map((t) => (
                    <Box key={t.label} className="flex flex-col items-center gap-1">
                      <Box sx={{ width: 44, height: 44, borderRadius: "50%", background: "#f4e9c8", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b3a28", border: "1px solid #e7ddc2" }}>
                        {t.icon}
                      </Box>
                      <Typography variant="caption" sx={{ fontSize: 10.5, fontWeight: 700, color: "#57523f" }}>{t.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </HomeSectionCard>
              <HomeSectionCard title="Onboarding Slides" onEdit={() => router.push("/onboarding")} onPreview={() => router.push("/onboarding?preview=1")}>
                <Box component="img" src="/assets/brand/story.jpg" alt="Onboarding slides" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(248,244,232,0.35)" }}>
                  <Typography sx={{ fontFamily: 'var(--font-script)', color: "#1b3a28", fontSize: 19, textAlign: "center", lineHeight: 1.3 }}>
                    Real Ingredients
                    <br />
                    Real Nutrition
                  </Typography>
                </Box>
              </HomeSectionCard>
            </Box>
          </Box>

          {/* Product Control Center */}
          <Box>
            <SectionHead
              title="Product Control Center"
              caption="Manage your products, stock, pricing and visibility."
              action={
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push("/products?new=1")}>
                  Add Product
                </Button>
              }
            />
            <Card sx={{ overflow: "hidden" }}>
              <Box className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                      <th style={{ width: 44, padding: "12px 8px 12px 16px" }}><Checkbox size="small" disabled /></th>
                      {["Product", "Price", "Stock", "Status", "Featured", "Actions"].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 5 ? "right" : "left", padding: "12px 12px", paddingRight: i === 5 ? 20 : 12, fontSize: 12.5, fontWeight: 800, color: "#8d8670" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.controlProducts ?? []).map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0]">
                        <td style={{ padding: "10px 8px 10px 16px" }}><Checkbox size="small" /></td>
                        <td style={{ padding: "10px 12px" }}>
                          <Box className="flex items-center gap-3">
                            <Thumb src={p.image} alt={p.name} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>{p.weight}</Typography>
                            </Box>
                          </Box>
                        </td>
                        <td style={{ padding: "10px 12px" }} className="tnum font-bold">{rs(p.price)}</td>
                        <td style={{ padding: "10px 12px" }} className="tnum">{p.stock == null ? "Not tracked" : p.stock}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <StatusChip status={p.isActive ? "active" : "inactive"} />
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <Switch size="small" checked={p.isFeatured} onChange={() => router.push(`/products?featured=${p.id}`)} />
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
                        <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#8d8670" }}>
                          {loading ? "Loading products..." : "No products yet. Add your first product to get started."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Card>
          </Box>
        </Box>

        <Box className="flex flex-col gap-5 min-w-0">
          {/* Recent Orders */}
          <Box>
            <SectionHead title="Recent Orders" action={<ViewAll href="/orders" />} />
            <Card sx={{ overflow: "hidden" }}>
              <Box className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                      {["# Order ID", "Customer", "Items", "Amount", "Status", "Date", ""].map((h, i) => (
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
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap", color: "#57523f" }}>{fmtDate(o.date)}</td>
                        <td style={{ padding: "11px 10px" }}><MoreHorizIcon sx={{ color: "#b3a983", fontSize: 18 }} /></td>
                      </tr>
                    ))}
                    {!(data?.recentOrders ?? []).length && (
                      <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: "#8d8670" }}>{loading ? "Loading..." : "No orders yet."}</td></tr>
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
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                      {["Tracking ID", "Order ID", "Customer", "Status", "Last Update", "Actions"].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 5 ? "right" : "left", padding: "12px 10px", paddingRight: i === 5 ? 16 : 10, fontSize: 12.5, fontWeight: 800, color: "#8d8670", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.trackRequests ?? []).map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0]">
                        <td style={{ padding: "11px 10px", fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" }}>{t.trackingNumber}</td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }}>{t.orderNumber}</td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap" }}>{t.customer}</td>
                        <td style={{ padding: "11px 10px" }}><StatusChip status={t.status} /></td>
                        <td style={{ padding: "11px 10px", whiteSpace: "nowrap", color: "#57523f" }}>{fmtDate(t.updatedAt)}</td>
                        <td style={{ padding: "11px 16px 11px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <Box className="inline-flex items-center gap-1.5">
                            <Button size="small" variant="text" sx={{ minWidth: 0, p: 0.8 }} onClick={() => router.push(`/track-orders?view=${t.id}`)} aria-label="View tracking"><VisibilityOutlined sx={{ fontSize: 17 }} /></Button>
                            <MoreHorizIcon sx={{ color: "#b3a983", fontSize: 18 }} />
                          </Box>
                        </td>
                      </tr>
                    ))}
                    {!(data?.trackRequests ?? []).length && (
                      <tr><td colSpan={6} style={{ padding: 28, textAlign: "center", color: "#8d8670" }}>{loading ? "Loading..." : "No tracking records yet."}</td></tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Manage App Screens */}
      <Box>
        <Box className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <Box className="flex items-baseline gap-3">
            <Typography variant="h5" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21 }}>
              Manage App Screens
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5 }}>
              Update content for different app screens and keep your app fresh and engaging.
            </Typography>
          </Box>
          <Button variant="text" startIcon={<SettingsOutlined sx={{ fontSize: 16 }} />} sx={{ color: "#1b3a28", fontWeight: 700, fontSize: 13 }}>
            Quick Actions
          </Button>
        </Box>
        <Box className="grid gap-4" sx={{ gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", xl: "repeat(5, 1fr)" } }}>
          {MANAGE_SCREENS.map((s) => (
            <Card key={s.href} sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              <Box className="flex items-start gap-2.5">
                <Box sx={{ width: 42, height: 42, borderRadius: "50%", background: "#f7ecd0", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b3a28", flexShrink: 0, "& svg": { fontSize: 20 } }}>
                  {s.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.25 }}>
                    {s.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11.5, lineHeight: 1.35, display: "block", mt: 0.4 }}>
                    {s.desc}
                  </Typography>
                </Box>
              </Box>
              <Box className="flex items-center gap-1.5 mt-1">
                <Button variant="contained" size="small" onClick={() => router.push(s.href)} sx={{ px: 2.2, py: 0.6, fontSize: 12 }}>
                  Edit
                </Button>
                <Button variant="outlined" size="small" onClick={() => router.push(`${s.href}?preview=1`)} sx={{ px: 2.2, py: 0.6, fontSize: 12 }}>
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
