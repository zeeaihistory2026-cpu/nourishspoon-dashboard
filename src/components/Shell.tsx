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
  Divider,
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
import OpenInNewIcon from "@mui/icons-material/OpenInNewOutlined";
import PhoneIphoneOutlined from "@mui/icons-material/PhoneIphoneOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import { api } from "@/lib/api";

export interface AdminUser {
  name: string;
  email: string;
}

const NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/", label: "Dashboard", icon: <HomeOutlined /> },
  { href: "/home-content", label: "Home Content", icon: <ImageOutlined /> },
  { href: "/onboarding", label: "Onboarding", icon: <SpaOutlined /> },
  { href: "/products", label: "Products", icon: <Inventory2Outlined /> },
  { href: "/orders", label: "Orders", icon: <ShoppingCartOutlined /> },
  { href: "/track-orders", label: "Track Order", icon: <LocationOnOutlined /> },
  { href: "/offers-points", label: "Offers & Points", icon: <LocalOfferOutlined /> },
  { href: "/refer-earn", label: "Refer & Earn", icon: <PeopleOutline /> },
  { href: "/notifications", label: "Notifications", icon: <NotificationsNoneOutlined /> },
  { href: "/payment-methods", label: "Payment Methods", icon: <CreditCardOutlined /> },
  { href: "/delivery-information", label: "Delivery Information", icon: <LocalShippingOutlined /> },
  { href: "/faq", label: "FAQ / Help & Support", icon: <HelpOutline /> },
  { href: "/our-story", label: "Our Story", icon: <NatureOutlined /> },
  { href: "/reviews", label: "Reviews", icon: <StarBorderOutlined /> },
  { href: "/wishlist", label: "Wishlist", icon: <FavoriteBorderOutlined /> },
  { href: "/customers", label: "Profile & Auth", icon: <PersonOutline /> },
];

const SIDEBAR_W = 232;

function LeafSprig() {
  return (
    <svg width="72" height="96" viewBox="0 0 72 96" fill="none" aria-hidden>
      <path d="M36 92 C 34 60, 38 34, 44 8" stroke="#7d9b6a" strokeWidth="2" strokeLinecap="round" />
      {[
        [38, 74, -38], [40, 62, 34], [41, 50, -36], [42, 38, 32], [43, 26, -30], [44, 16, 26],
      ].map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="13"
          ry="5.5"
          fill="#a9c08e"
          opacity="0.85"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <Box className="h-full flex flex-col" sx={{ background: "#f6f1e1" }}>
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, textAlign: "center" }}>
        <Box
          component="img"
          src="/assets/brand/logo.png"
          alt="Nourish Spoon"
          sx={{ width: 132, mx: "auto", display: "block" }}
        />
        <Typography
          sx={{
            fontFamily: '"Pinyon Script", cursive',
            color: "#b08a2e",
            fontSize: 17,
            mt: 0.5,
            lineHeight: 1,
          }}
        >
          Crafted with Love
        </Typography>
      </Box>

      <Box className="flex-1 overflow-y-auto" sx={{ px: 1.5, pb: 2 }}>
        <List disablePadding>
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                onClick={onNavigate}
                sx={{
                  borderRadius: 2,
                  mb: 0.4,
                  py: 1,
                  px: 1.8,
                  color: active ? "#fffdf7" : "#3d3a2c",
                  backgroundColor: active ? "#1b3a28" : "transparent",
                  "&:hover": {
                    backgroundColor: active ? "#1b3a28" : "rgba(27,58,40,0.07)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 34,
                    color: active ? "#fffdf7" : "#57523f",
                    "& svg": { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: active ? 700 : 600 } } }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ px: 2, pb: 2, position: "relative" }}>
        <Typography
          sx={{
            fontFamily: '"Pinyon Script", cursive',
            color: "#b08a2e",
            fontSize: 21,
            lineHeight: 1.25,
          }}
        >
          Real
          <br />
          Ingredients
          <br />
          Real Nutrition
        </Typography>
        <Box sx={{ position: "absolute", right: 6, bottom: -6, opacity: 0.9 }}>
          <LeafSprig />
        </Box>
      </Box>
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState("");

  const initials = admin.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
    <Box className="flex min-h-screen">
      {/* Sidebar */}
      {isDesktop ? (
        <Box
          sx={{
            width: SIDEBAR_W,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            height: "100vh",
            borderRight: "1px solid #e7ddc2",
          }}
        >
          <SidebarBody />
        </Box>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: SIDEBAR_W } }}
        >
          <SidebarBody onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: "rgba(248,244,232,0.92)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid #e7ddc2",
            color: "#2c2a21",
          }}
        >
          <Toolbar sx={{ gap: 2, py: 1, px: { xs: 2, md: 3 } }}>
            {!isDesktop && (
              <IconButton onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <MenuIcon />
              </IconButton>
            )}
            <Box component="form" onSubmit={submitSearch} sx={{ flex: 1, maxWidth: 560 }}>
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
                      <SearchIcon sx={{ color: "#8d8670", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 3, backgroundColor: "#fffdf7" },
              },
            }}
              />
            </Box>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              startIcon={<PhoneIphoneOutlined />}
              endIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
              component="a"
              href="https://nourishspoon.com"
              target="_blank"
              rel="noreferrer"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Preview App
            </Button>
            <IconButton
              aria-label="Notifications"
              onClick={() => router.push("/notifications")}
              sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7" }}
            >
              <Badge variant="dot" color="error" overlap="circular">
                <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
            <Button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ textTransform: "none", color: "inherit", gap: 1.2, px: 1 }}
            >
              <Avatar sx={{ bgcolor: "#1b3a28", width: 36, height: 36, fontSize: 14, fontWeight: 800 }}>
                {initials || "A"}
              </Avatar>
              <Box sx={{ textAlign: "left", display: { xs: "none", md: "block" }, lineHeight: 1.2 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 13 }}>
                  {admin.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 11 }}>
                  Admin
                </Typography>
              </Box>
              <ExpandMoreIcon sx={{ fontSize: 18, color: "#8d8670" }} />
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem disabled>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{admin.name}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>{admin.email}</Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={signOut}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Sign out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          component="main"
          sx={{ flex: 1, px: { xs: 2, md: 3.5 }, py: 3, maxWidth: 1720, width: "100%", mx: "auto" }}
          key={pathname}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
