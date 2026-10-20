"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from "@mui/material";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import { api, useApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
type Notice = {
  id: string;
  number: string;
  customer: string;
  createdAt: string | null;
  status: string;
  unread: boolean;
};
export function OrderNotifications() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { data, error, loading, refresh } = useApi<{
    items: Notice[];
    unreadCount: number;
  }>("/api/admin/order-notifications", true);
  async function markRead(through: string | null) {
    if (!through) return;
    setSaving(true);
    setSaveError("");
    try {
      await api("/api/admin/order-notifications", {
        method: "POST",
        body: JSON.stringify({ through }),
      });
      await refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not mark notifications read.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <IconButton
        aria-label={`Order notifications, ${data?.unreadCount ?? 0} unread`}
        onClick={(event) => {
          setAnchor(event.currentTarget);
          void refresh();
        }}
        sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7" }}
      >
        <Badge badgeContent={data?.unreadCount ?? 0} color="error" max={99}>
          <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
        </Badge>
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 370,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 3,
              border: "1px solid #e7ddc2",
              background: "#fffdf7",
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography sx={{ fontWeight: 800 }}>Order notifications</Typography>
          {!!data?.unreadCount && (
            <Button
              size="small"
              disabled={saving}
              onClick={() => void markRead(data.items[0]?.createdAt || null)}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {(error || saveError) && (
          <Alert
            severity="error"
            action={<Button onClick={() => void refresh()}>Retry</Button>}
          >
            {error || saveError}
          </Alert>
        )}
        {loading && !data && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <List disablePadding sx={{ maxHeight: 380, overflow: "auto" }}>
          {data?.items.map((notice) => (
            <ListItemButton
              key={notice.id}
              component={Link}
              href={`/orders?view=${notice.id}`}
              onClick={() => {
                setAnchor(null);
                void markRead(notice.createdAt);
              }}
              sx={{
                gap: 1,
                px: 2,
                py: 1.4,
                background: notice.unread ? "#eff4e9" : "transparent",
                borderBottom: "1px solid #f0ead9",
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: notice.unread ? "#a37725" : "transparent",
                  flexShrink: 0,
                }}
              />
              <ListItemText
                primary={`${notice.number} received`}
                secondary={`${notice.customer} · ${fmtDateTime(notice.createdAt)}`}
                slotProps={{
                  primary: {
                    sx: { fontWeight: notice.unread ? 800 : 500, fontSize: 13 },
                  },
                  secondary: { sx: { fontSize: 11.5, mt: 0.5 } },
                }}
              />
            </ListItemButton>
          ))}
        </List>
        {!loading && !data?.items.length && !error && (
          <Typography
            sx={{ p: 3, color: "text.secondary", textAlign: "center" }}
          >
            New customer orders will appear here.
          </Typography>
        )}
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            component={Link}
            href="/orders"
            onClick={() => setAnchor(null)}
          >
            View all orders
          </Button>
        </Box>
      </Popover>
    </>
  );
}
