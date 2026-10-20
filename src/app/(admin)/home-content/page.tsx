"use client";

import { ImageUpload } from "@/components/forms";
import { ErrorState,PageHeader,Thumb } from "@/components/ui";
import { api,useApi } from "@/lib/api";
import { rs } from "@/lib/format";
import type { HomeContent,Product } from "@/lib/types";
import AddIcon from "@mui/icons-material/AddOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicatorOutlined";
import {
Box,
Button,
Card,
Checkbox,
CircularProgress,
Dialog,
DialogContent,
FormControlLabel,
IconButton,
Switch,
TextField,
Typography
} from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense,useEffect,useMemo,useState } from "react";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Banner",
  bestSellers: "Best Sellers",
  productTabs: "Product Tabs",
  onboarding: "Onboarding Slides",
};

function PhonePreview({ content, products }: { content: HomeContent; products: Product[] }) {
  const best = content.bestSellerIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[];
  return (
    <Box
      sx={{
        width: 300,
        height: 620,
        borderRadius: 7,
        border: "10px solid #1b3a28",
        overflow: "hidden",
        background: "#f8f4e8",
        mx: "auto",
      }}
    >
      <Box sx={{ height: 200, position: "relative", background: "#f4e9c8" }}>
        {content.hero.imageUrl && (
          <Box component="img" src={content.hero.imageUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <Box sx={{ position: "absolute", inset: 0, p: 2.5, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "linear-gradient(transparent 40%, rgba(27,58,40,0.55))" }}>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: "#fff", fontSize: 18, lineHeight: 1.25 }}>
            {content.hero.heading || "Hero heading"}
          </Typography>
          {content.hero.ctaLabel && (
            <Box sx={{ mt: 1, background: "#1b3a28", color: "#fff", borderRadius: 2, px: 2, py: 0.8, alignSelf: "flex-start", fontSize: 12, fontWeight: 700 }}>
              {content.hero.ctaLabel}
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Best Sellers</Typography>
        <Box className="flex gap-2 overflow-hidden">
          {best.slice(0, 3).map((p) => (
            <Box key={p.id} sx={{ minWidth: 80, background: "#fffdf7", borderRadius: 2, border: "1px solid #ece4cb", p: 1 }}>
              <Thumb src={p.images?.[0]} alt={p.name} size={56} />
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </Typography>
              <Typography variant="caption" className="tnum" sx={{ fontWeight: 800 }}>{rs(p.price)}</Typography>
            </Box>
          ))}
          {!best.length && <Typography variant="caption" sx={{ color: "text.secondary" }}>No best sellers selected.</Typography>}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 2, mb: 1 }}>Shop by type</Typography>
        <Box className="flex gap-2">
          {content.productTabs.filter((t) => t.isActive).map((t) => (
            <Box key={t.key} sx={{ background: "#f4e9c8", borderRadius: 2, px: 1.5, py: 1, fontSize: 11, fontWeight: 700 }}>
              {t.label}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function Page() {
  const searchParams = useSearchParams();
  const { data, loading, error, refresh } = useApi<{ item: HomeContent }>("/api/admin/home-content");
  const { data: prodData } = useApi<{ items: Product[] }>("/api/admin/products?limit=500");

  const [draft, setDraft] = useState<HomeContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (data?.item && !draft) setDraft(JSON.parse(JSON.stringify(data.item)));
  }, [data, draft]);

  const products = useMemo(() => prodData?.items ?? [], [prodData]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(data?.item),
    [draft, data]
  );

  useEffect(() => {
    if (searchParams.get("preview") === "1" && draft) setPreview(true);
  }, [searchParams, draft]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/admin/home-content", { method: "PUT", body: JSON.stringify(draft) });
      setMsg("Home content published. The app will show the new content on its next refresh.");
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function setHero(patch: Partial<HomeContent["hero"]>) {
    setDraft((d) => (d ? { ...d, hero: { ...d.hero, ...patch } } : d));
  }

  function moveBest(id: string, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.bestSellerIds];
      const i = arr.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, bestSellerIds: arr };
    });
  }

  function moveSection(key: string, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d;
      const arr = [...d.sectionOrder];
      const i = arr.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, sectionOrder: arr };
    });
  }

  if (error) return (<><PageHeader title="Home Content" /><ErrorState message={error} onRetry={refresh} /></>);
  if (loading || !draft) return (<><PageHeader title="Home Content" /><Card sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Card></>);

  return (
    <Box>
      <PageHeader
        title="Home Content"
        subtitle="Hero banner, best sellers, product tabs and section order for the app home screen."
        action={
          <>
            <Button variant="outlined" onClick={() => setPreview(true)}>Preview</Button>
            <Button
              variant="contained"
              disabled={saving || !dirty}
              onClick={save}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? "Publishing..." : "Publish changes"}
            </Button>
          </>
        }
      />

      {msg && (
        <Typography variant="body2" sx={{ mb: 2, background: msg.includes("failed") ? "#fdecea" : "#e7f4ea", color: msg.includes("failed") ? "#c0392b" : "#2e7d4f", p: 1.5, borderRadius: 2 }}>
          {msg}
        </Typography>
      )}
      {dirty && (
        <Typography variant="body2" sx={{ mb: 2, color: "#8f6b1f", background: "#faf3dd", border: "1px solid #e7ddc2", p: 1.5, borderRadius: 2 }}>
          You have unpublished changes. They are only visible in the app after you press “Publish changes”.
        </Typography>
      )}

      <Box className="grid gap-5" sx={{ gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <Box className="flex flex-col gap-5">
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, mb: 2 }}>
              Hero Banner
            </Typography>
            <Box className="flex flex-col gap-3">
              <TextField size="small" fullWidth label="Heading" value={draft.hero.heading} onChange={(e) => setHero({ heading: e.target.value })} />
              <TextField size="small" fullWidth label="Supporting copy" multiline rows={2} value={draft.hero.copy} onChange={(e) => setHero({ copy: e.target.value })} />
              <Box className="grid grid-cols-2 gap-3">
                <TextField size="small" label="Button label" value={draft.hero.ctaLabel} onChange={(e) => setHero({ ctaLabel: e.target.value })} />
                <TextField size="small" label="Button destination" value={draft.hero.ctaDestination} onChange={(e) => setHero({ ctaDestination: e.target.value })} placeholder="/products" />
              </Box>
              <ImageUpload label="Hero image" folder="app-content" value={draft.hero.imageUrl ?? ""} onChange={(url) => setHero({ imageUrl: url })} />
              <FormControlLabel
                control={<Switch checked={draft.hero.isActive} onChange={(e) => setHero({ isActive: e.target.checked })} />}
                label={<Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>Show hero in app</Typography>}
              />
            </Box>
          </Card>

          <Card sx={{ p: 3 }}>
            <Box className="flex items-center justify-between mb-2">
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                Product Tabs
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              The Panjeeri / Energy Balls / Combos shortcuts on the home screen.
            </Typography>
            <Box className="flex flex-col gap-2">
              {draft.productTabs.map((t, i) => (
                <Box key={t.key} sx={{ border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }} className="flex items-center gap-2">
                  <TextField size="small" label="Label" value={t.label} sx={{ flex: 1 }}
                    onChange={(e) => setDraft((d) => d ? { ...d, productTabs: d.productTabs.map((x, j) => j === i ? { ...x, label: e.target.value } : x) } : d)} />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={t.isActive}
                        onChange={(e) => setDraft((d) => d ? { ...d, productTabs: d.productTabs.map((x, j) => j === i ? { ...x, isActive: e.target.checked } : x) } : d)}
                      />
                    }
                    label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Active</Typography>}
                  />
                </Box>
              ))}
            </Box>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, mb: 1 }}>
              Section Order
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              The order sections appear in on the home screen.
            </Typography>
            <Box className="flex flex-col gap-2">
              {draft.sectionOrder.map((key, i) => (
                <Box key={key} sx={{ border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }} className="flex items-center gap-2">
                  <DragIndicatorIcon sx={{ color: "#b3a983" }} />
                  <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                    {i + 1}. {SECTION_LABELS[key] ?? key}
                  </Typography>
                  <IconButton size="small" disabled={i === 0} onClick={() => moveSection(key, -1)} aria-label="Move up"><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" disabled={i === draft.sectionOrder.length - 1} onClick={() => moveSection(key, 1)} aria-label="Move down"><ArrowDownwardIcon fontSize="small" /></IconButton>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>

        <Box>
          <Card sx={{ p: 3 }}>
            <Box className="flex items-center justify-between mb-2">
              <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                Best Sellers
              </Typography>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
                Choose products
              </Button>
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Pick products and arrange their order.
            </Typography>
            <Box className="flex flex-col gap-2">
              {draft.bestSellerIds.map((pid, i) => {
                const p = products.find((x) => x.id === pid);
                if (!p) return null;
                return (
                  <Box key={pid} sx={{ border: "1px solid #ece4cb", borderRadius: 2, p: 1 }} className="flex items-center gap-2">
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", width: 22 }}>{i + 1}</Typography>
                    <Thumb src={p.images?.[0]} alt={p.name} size={40} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</Typography>
                      <Typography variant="caption" className="tnum" sx={{ color: "text.secondary" }}>{rs(p.price)}</Typography>
                    </Box>
                    <IconButton size="small" disabled={i === 0} onClick={() => moveBest(pid, -1)} aria-label="Move up"><ArrowUpwardIcon fontSize="small" /></IconButton>
                    <IconButton size="small" disabled={i === draft.bestSellerIds.length - 1} onClick={() => moveBest(pid, 1)} aria-label="Move down"><ArrowDownwardIcon fontSize="small" /></IconButton>
                    <IconButton size="small" aria-label="Remove" sx={{ color: "#c0392b" }}
                      onClick={() => setDraft((d) => d ? { ...d, bestSellerIds: d.bestSellerIds.filter((x) => x !== pid) } : d)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
              {!draft.bestSellerIds.length && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>No best sellers chosen yet.</Typography>
              )}
            </Box>
          </Card>
        </Box>
      </Box>

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, mb: 2 }}>
            Choose best sellers
          </Typography>
          <Box className="flex flex-col gap-1" sx={{ maxHeight: 420, overflowY: "auto" }}>
            {products.filter((p) => p.isActive).map((p) => {
              const selected = draft.bestSellerIds.includes(p.id);
              return (
                <Box
                  key={p.id}
                  onClick={() => setDraft((d) => d ? { ...d, bestSellerIds: selected ? d.bestSellerIds.filter((x) => x !== p.id) : [...d.bestSellerIds, p.id] } : d)}
                  sx={{ border: "1px solid #ece4cb", borderRadius: 2, p: 1, cursor: "pointer", background: selected ? "#f4e9c8" : undefined }}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selected} size="small" />
                  <Thumb src={p.images?.[0]} alt={p.name} size={36} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</Typography>
                    <Typography variant="caption" className="tnum" sx={{ color: "text.secondary" }}>{rs(p.price)}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Box className="flex justify-end mt-3">
            <Button variant="contained" onClick={() => setPickerOpen(false)}>Done</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={preview} onClose={() => setPreview(false)} maxWidth="xs">
        <DialogContent sx={{ pt: 3 }}>
          <Box className="flex justify-end mb-2">
            <IconButton size="small" onClick={() => setPreview(false)} aria-label="Close preview"><CloseIcon /></IconButton>
          </Box>
          <PhonePreview content={draft} products={products} />
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center", mt: 2 }}>
            Preview at a representative mobile size
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default function HomeContentPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
