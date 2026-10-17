"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutlineOutlined";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import CreditCardOutlined from "@mui/icons-material/CreditCardOutlined";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import HelpOutline from "@mui/icons-material/HelpOutlineOutlined";
import NatureOutlined from "@mui/icons-material/NatureOutlined";
import StarBorderOutlined from "@mui/icons-material/StarBorderOutlined";
import FavoriteBorderOutlined from "@mui/icons-material/FavoriteBorderOutlined";
import PersonOutline from "@mui/icons-material/PersonOutlineOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import MenuIcon from "@mui/icons-material/MenuOutlined";
import MenuOpenIcon from "@mui/icons-material/MenuOpenOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNewOutlined";
import PhoneIphoneOutlined from "@mui/icons-material/PhoneIphoneOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import { api } from "@/lib/api";

export interface AdminUser {
  name: string;
  email: string;
  role?: "admin" | "child";
}

const NAV: { href: string; label: string; icon: React.ReactNode; badge?: string }[] = [
  { href: "/", label: "Dashboard", icon: <HomeOutlined /> },
  { href: "/home-content", label: "Home Content", icon: <ImageOutlined /> },
  { href: "/onboarding", label: "Onboarding", icon: <SpaOutlined /> },
  { href: "/products", label: "Products", icon: <Inventory2Outlined /> },
  { href: "/orders", label: "Orders", icon: <ShoppingCartOutlined /> },
  { href: "/track-orders", label: "Track Order", icon: <LocationOnOutlined /> },
  { href: "/offers-points", label: "Offers & Points", icon: <LocalOfferOutlined /> },
  { href: "/refer-earn", label: "Refer & Earn", icon: <PeopleOutline /> },
  { href: "/notifications", label: "Notifications", icon: <NotificationsNoneOutlined />, badge: "3" },
  { href: "/payment-methods", label: "Payment Methods", icon: <CreditCardOutlined /> },
  { href: "/delivery-information", label: "Delivery Information", icon: <LocalShippingOutlined /> },
  { href: "/faq", label: "FAQ / Help & Support", icon: <HelpOutline /> },
  { href: "/our-story", label: "Our Story", icon: <NatureOutlined /> },
  { href: "/reviews", label: "Reviews", icon: <StarBorderOutlined /> },
  { href: "/wishlist", label: "Wishlist", icon: <FavoriteBorderOutlined /> },
  { href: "/customers", label: "Profile & Auth", icon: <PersonOutline /> },
  { href: "/user-access", label: "User Access", icon: <PeopleOutline /> },
];

const SIDEBAR_W = 240;
const SIDEBAR_COLLAPSED_W = 74;

export function LeafSprig() {
  return (
    <svg width="76" height="100" viewBox="0 0 76 100" fill="none" aria-hidden>
      <path d="M38 96 C 36 62, 40 36, 46 8" stroke="#7d9b6a" strokeWidth="2.2" strokeLinecap="round" />
      {[
        [40, 78, -36, 14, 6],
        [42, 65, 34, 13, 5.5],
        [43, 52, -34, 13, 5.5],
        [44, 40, 32, 12, 5],
        [45, 27, -28, 11, 4.5],
        [46, 16, 26, 10, 4],
      ].map(([x, y, r, rx, ry], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx={rx}
          ry={ry}
          fill="#a9c08e"
          opacity="0.88"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}

function SidebarBody({
  onNavigate,
  collapsed = false,
  role,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  role?: "admin" | "child";
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => !(item as any).adminOnly || role === "admin");

  return (
    <Box
      className="h-full flex flex-col"
      sx={{
        background: "#f8f5ea",
        borderRight: "1px solid #e7ddc2",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Brand logo */}
      <Box sx={{ px: collapsed ? 1 : 2.5, pt: 2.8, pb: 2, textAlign: "center" }}>
        <Box
          component="img"
          src="/assets/brand/logo-transparent.png"
          alt="Nourish Spoon"
          sx={{
            width: collapsed ? 44 : 138,
            mx: "auto",
            display: "block",
            transition: "width 0.2s ease",
          }}
        />
        {!collapsed && (
          <Typography
            sx={{
              fontFamily: 'var(--font-script), "Pinyon Script", cursive',
              color: "#b08a2e",
              fontSize: 18,
              mt: 0.5,
              lineHeight: 1,
            }}
          >
            Crafted with Love
          </Typography>
        )}
      </Box>

      {/* Nav List */}
      <Box className="flex-1 overflow-y-auto" sx={{ px: collapsed ? 1 : 1.6, pb: 1.5 }}>
        <List disablePadding>
          {items.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                sx={{
                  borderRadius: "10px",
                  mb: 0.3,
                  py: 0.9,
                  px: collapsed ? 0 : 1.6,
                  justifyContent: collapsed ? "center" : "flex-start",
                  color: active ? "#ffffff" : "#3d3a2c",
                  backgroundColor: active ? "#133826" : "transparent",
                  "&:hover": {
                    backgroundColor: active ? "#133826" : "rgba(19,56,38,0.08)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 32,
                    justifyContent: "center",
                    color: active ? "#ffffff" : "#57523f",
                    "& svg": { fontSize: 19 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: 13,
                          fontWeight: active ? 700 : 500,
                          color: active ? "#ffffff" : "#3d3a2c",
                          whiteSpace: "nowrap",
                        },
                      },
                    }}
                  />
                )}
                {!collapsed && item.badge && (
                  <Box
                    sx={{
                      minWidth: 19,
                      height: 19,
                      px: 0.5,
                      borderRadius: 99,
                      background: "#e8bd70",
                      color: "#4e3609",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ml: "auto",
                    }}
                  >
                    {item.badge}
                  </Box>
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* Sidebar bottom foliage & quote card */}
      {!collapsed && (
        <Box sx={{ px: 2, pb: 2.2, pt: 1, position: "relative" }}>
          <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", mb: 1.5, px: 0.5 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-script), "Pinyon Script", cursive',
                color: "#b08a2e",
                fontSize: 22,
                lineHeight: 1.2,
              }}
            >
              Real Ingredients
              <br />
              Happier Lives
            </Typography>
            <Box sx={{ opacity: 0.85, flexShrink: 0, transform: "scale(0.85)", originX: "right" }}>
              <LeafSprig />
            </Box>
          </Box>

          {/* Card: Good Food Builds Brighter Days */}
          <Box
            sx={{
              p: 1.6,
              borderRadius: "14px",
              background: "#ffffff",
              border: "1px solid #e7ddc2",
              boxShadow: "0 2px 8px rgba(60,50,20,0.04)",
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--font-display), "Playfair Display", Georgia, serif',
                fontWeight: 700,
                fontSize: 13.5,
                color: "#133826",
                lineHeight: 1.3,
              }}
            >
              Good Food Builds
              <br />
              Brighter Days
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#8d8670", mt: 0.5, lineHeight: 1.35 }}>
              Keep nourishing lives together.
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function Shell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width:1100px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState("");

  const initials = (admin?.name || "Tayyaba")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 1)
    .join("")
    .toUpperCase();

  const displayName = admin?.name || "Tayyaba";

  async function signOut() {
    setAnchorEl(null);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/products?search=${encodeURIComponent(q)}`);
  }

  return (
    <Box className="flex min-h-screen" sx={{ backgroundColor: "#faf8f4" }}>
      {/* Sidebar */}
      {isDesktop ? (
        <Box
          sx={{
            width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            height: "100vh",
            zIndex: 100,
            transition: "width 0.25s ease",
            overflow: "hidden",
          }}
        >
          <SidebarBody collapsed={collapsed} role={admin?.role} />
        </Box>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: SIDEBAR_W, borderRight: "none" } }}
        >
          <SidebarBody onNavigate={() => setMobileOpen(false)} role={admin?.role} />
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: "rgba(250, 248, 244, 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #e7ddc2",
            color: "#2c2a21",
            zIndex: 90,
          }}
        >
          <Toolbar sx={{ gap: 2, py: 1, px: { xs: 2, md: 3.5 } }}>
            {/* Sidebar toggle button (collapses on desktop, opens drawer on mobile) */}
            <IconButton
              onClick={() => {
                if (isDesktop) setCollapsed((c) => !c);
                else setMobileOpen(true);
              }}
              aria-label={isDesktop ? (collapsed ? "Expand sidebar" : "Collapse sidebar") : "Open menu"}
              sx={{
                border: "1px solid #e7ddc2",
                borderRadius: "10px",
                p: 0.8,
                backgroundColor: "#ffffff",
                color: "#2c2a21",
                "&:hover": { backgroundColor: "#f4eedb" },
              }}
            >
              {isDesktop && !collapsed ? (
                <MenuOpenIcon sx={{ fontSize: 20 }} />
              ) : (
                <MenuIcon sx={{ fontSize: 20 }} />
              )}
            </IconButton>

            {/* Search Bar with ⌘ K */}
            <Box component="form" onSubmit={submitSearch} sx={{ flex: 1, maxWidth: 520 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search products, orders, customers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#8d8670", fontSize: 19 }} />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      fontSize: 13,
                      "& fieldset": { borderColor: "#e2dac0" },
                      "&:hover fieldset": { borderColor: "#133826" },
                      "&.Mui-focused fieldset": { borderColor: "#133826", borderWidth: "1.5px" },
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* Preview App Button */}
            <Button
              variant="outlined"
              startIcon={<PhoneIphoneOutlined sx={{ fontSize: 17 }} />}
              endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              component="a"
              href="https://nourishspoon.com"
              target="_blank"
              rel="noreferrer"
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                borderRadius: "10px",
                borderColor: "#ded6bf",
                backgroundColor: "#ffffff",
                color: "#133826",
                fontWeight: 700,
                fontSize: 12.5,
                px: 1.8,
                py: 0.7,
                "&:hover": {
                  borderColor: "#133826",
                  backgroundColor: "rgba(19,56,38,0.04)",
                },
              }}
            >
              Preview App
            </Button>

            {/* Notification Bell with Red Badge */}
            <IconButton
              component={Link}
              href="/notifications"
              aria-label="Notifications"
              sx={{
                border: "1px solid #ded6bf",
                borderRadius: "10px",
                backgroundColor: "#ffffff",
                p: 0.8,
              }}
            >
              <Badge
                badgeContent={1}
                color="error"
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: 10,
                    height: 16,
                    minWidth: 16,
                    backgroundColor: "#e03e2d",
                  },
                }}
              >
                <NotificationsNoneOutlined sx={{ fontSize: 20, color: "#474335" }} />
              </Badge>
            </IconButton>

            {/* User Profile */}
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                cursor: "pointer",
                p: 0.5,
                borderRadius: "10px",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.03)" },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  backgroundColor: "#133826",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
              <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "left", lineHeight: 1.2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#1c1b16" }}>
                  {displayName}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#8d8670", fontWeight: 500 }}>
                  Admin
                </Typography>
              </Box>
              <ExpandMoreIcon sx={{ fontSize: 17, color: "#8d8670", ml: -0.5 }} />
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              sx={{
                "& .MuiPaper-root": {
                  borderRadius: "12px",
                  border: "1px solid #e7ddc2",
                  boxShadow: "0 8px 24px rgba(60,50,20,0.1)",
                  minWidth: 160,
                  p: 0.5,
                },
              }}
            >
              <MenuItem
                component={Link}
                href="/customers"
                onClick={() => setAnchorEl(null)}
                sx={{ fontSize: 13, py: 1, borderRadius: "8px" }}
              >
                Profile & Auth
              </MenuItem>
              <MenuItem
                onClick={signOut}
                sx={{ fontSize: 13, py: 1, borderRadius: "8px", color: "#c0392b" }}
              >
                <LogoutIcon sx={{ fontSize: 17, mr: 1 }} />
                Sign Out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content Body */}
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 3.5 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
