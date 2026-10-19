"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import { useApi, api } from "@/lib/api";
import { PageHeader, ErrorState, ConfirmDialog, Thumb } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { WishlistItem } from "@/lib/types";

function Page() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<WishlistItem | null>(null);
  const [busy, setBusy] = useState(false);

  const path = `/api/admin/wishlist?limit=300${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`;
  const { data, loading, error, refresh } = useApi<{ items: WishlistItem[] }>(path);
  const rows = useMemo(() => data?.items ?? [], [data]);

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api(
        `/api/admin/wishlist?userId=${encodeURIComponent(removing.userId)}&itemId=${encodeURIComponent(removing.itemId ?? removing.id)}`,
        { method: "DELETE" }
      );
      setRemoving(null);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return (<><PageHeader title="Wishlist" /><ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      <PageHeader title="Wishlist" subtitle="What customers have saved for later." />

      <Card sx={{ mb: 2, p: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search by customer or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 440, width: "100%" }}
          slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#8d8670", fontSize: 19 }} />
                  </InputAdornment>
                ),
              },
              }}
        />
      </Card>

      <Card sx={{ overflow: "hidden" }}>
        <Box className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                {["Customer", "Product", "Saved", "Actions"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 3 ? "right" : "left", padding: "12px 12px", paddingRight: i === 3 ? 20 : 12, fontSize: 12.5, fontWeight: 800, color: "#8d8670" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#8d8670" }}>Loading...</td></tr>}
              {rows.map((w) => (
                <tr key={w.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0]">
                  <td style={{ padding: "10px 12px" }}>
                    <Button
                      variant="text"
                      sx={{ textTransform: "none", color: "inherit", fontWeight: 700, p: 0 }}
                      onClick={() => router.push(`/customers?view=${w.userId}`)}
                    >
                      {w.userName || w.userId.slice(0, 8)}
                    </Button>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <Box className="flex items-center gap-2.5">
                      <Thumb src={w.productImage} alt={w.productName ?? ""} size={40} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{w.productName || w.productId}</Typography>
                    </Box>
                  </td>
                  <td style={{ padding: "11px 12px", color: "#57523f", whiteSpace: "nowrap" }}>{fmtDateTime(w.addedAt).split(",")[0]}</td>
                  <td style={{ padding: "10px 20px 10px 12px", textAlign: "right" }}>
                    <IconButton
                      size="small"
                      aria-label="Remove from wishlist"
                      onClick={() => setRemoving(w)}
                      sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30, color: "#c0392b" }}
                    >
                      <DeleteIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: "#8d8670" }}>No wishlist items found.</td></tr>
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove wishlist item?"
        message={removing ? `Remove "${removing.productName || "this item"}" from ${removing.userName || "the customer"}'s wishlist?` : ""}
        confirmLabel="Remove"
        danger
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </Box>
  );
}

export default function WishlistPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
