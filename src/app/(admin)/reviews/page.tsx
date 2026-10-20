"use client";

import { ErrorState,PageHeader,StatusChip,Thumb } from "@/components/ui";
import { api,useApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { Review,ReviewVisibility } from "@/lib/types";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import StarIcon from "@mui/icons-material/StarOutlined";
import {
Box,
Button,
Card,
Chip,
InputAdornment,
TextField,
Typography
} from "@mui/material";
import { Suspense,useMemo,useState } from "react";

const VIS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "featured", label: "Featured" },
  { value: "removed", label: "Removed" },
];

function Stars({ n }: { n: number }) {
  return (
    <Box className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} sx={{ fontSize: 15, color: i <= n ? "#c9a227" : "#ddd2b2" }} />
      ))}
    </Box>
  );
}

function Page() {
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("");

  const path = `/api/admin/reviews?limit=300${visibility ? `&visibility=${visibility}` : ""}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`;
  const { data, loading, error, refresh } = useApi<{ items: Review[] }>(path);
  const rows = useMemo(() => data?.items ?? [], [data]);

  async function moderate(r: Review, v: ReviewVisibility) {
    try {
      await api(`/api/admin/reviews/${r.id}`, { method: "PATCH", body: JSON.stringify({ visibility: v }) });
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed.");
    }
  }

  if (error) return (<><PageHeader title="Reviews" /><ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      <PageHeader
        title="Reviews"
        subtitle="Moderate customer reviews. Original review text is never altered."
      />

      <Box className="flex flex-wrap gap-2 mb-3">
        {VIS.map((v) => (
          <Chip
            key={v.value || "all"}
            label={v.label}
            clickable
            onClick={() => setVisibility(v.value)}
            sx={{
              fontWeight: 700,
              background: visibility === v.value ? "#1b3a28" : "#fffdf7",
              color: visibility === v.value ? "#fffdf7" : "#57523f",
              border: "1px solid #e7ddc2",
            }}
          />
        ))}
      </Box>

      <Card sx={{ mb: 2, p: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search reviews, customers or products..."
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

      <Box className="grid gap-3" sx={{ gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
        {loading && <Card sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>Loading reviews...</Card>}
        {rows.map((r) => (
          <Card key={r.id} sx={{ p: 2.5 }}>
            <Box className="flex items-start justify-between gap-3">
              <Box className="flex items-center gap-2.5">
                <Thumb src={r.productImage as string} alt={r.productName} size={44} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{r.productName}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {r.userName}{r.city ? ` · ${r.city}` : ""} · {fmtDate(r.createdAt)}
                    {r.verifiedPurchase ? " · Verified purchase" : ""}
                  </Typography>
                </Box>
              </Box>
              <StatusChip status={r.visibility ?? "visible"} />
            </Box>
            <Box sx={{ mt: 1.5 }}><Stars n={r.rating} /></Box>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-line" }}>{r.comment}</Typography>
            <Box className="flex items-center gap-2 mt-3 flex-wrap">
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mr: 1 }}>
                Visibility:
              </Typography>
              {(["visible", "featured", "hidden", "removed"] as ReviewVisibility[]).map((v) => (
                <Button
                  key={v}
                  size="small"
                  variant={(r.visibility ?? "visible") === v ? "contained" : "outlined"}
                  onClick={() => moderate(r, v)}
                  sx={{ py: 0.4, px: 1.5, fontSize: 12 }}
                  color={v === "removed" ? "error" : "primary"}
                >
                  {v}
                </Button>
              ))}
            </Box>
            {r.moderatedAt && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                Moderated {fmtDate(r.moderatedAt)}{r.moderatedBy ? " by admin" : ""}
              </Typography>
            )}
          </Card>
        ))}
        {!loading && !rows.length && (
          <Card sx={{ p: 5, textAlign: "center", color: "text.secondary" }}>No reviews found.</Card>
        )}
      </Box>
    </Box>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
