"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, type Resolver } from "react-hook-form";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutlined";
import { useApi, api } from "@/lib/api";
import { PageHeader, ConfirmDialog, FormDrawer, ErrorState, StatusChip, Thumb, FieldError } from "@/components/ui";
import { ImageUpload } from "@/components/forms";
import { productSchema } from "@/lib/schemas";
import { rs, num, fmtDateTime, slugify } from "@/lib/format";
import type { Product, Category } from "@/lib/types";

const BENEFIT_ICONS = ["leaf", "sprout", "droplet", "wheat", "sparkles", "jar", "bowl", "shield"];

type FormValues = {
  name: string;
  slug?: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price?: number;
  compareAtPrice?: number | null;
  variants: { label: string; price?: number; compareAtPrice?: number | null }[];
  weight: string;
  stock?: number;
  images: string[];
  ingredients: { name: string; emoji?: string }[];
  benefits: { icon: string; label: string }[];
  isFeatured: boolean;
  isActive: boolean;
  sortOrder?: number;
};

const EMPTY: FormValues = {
  name: "",
  description: "",
  categoryId: "",
  categoryName: "",
  price: undefined,
  variants: [],
  weight: "",
  stock: 0,
  images: [],
  ingredients: [],
  benefits: [],
  isFeatured: false,
  isActive: true,
};

function MultiImage({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [pending, setPending] = useState<string | null>(null);
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>
        Product images
      </Typography>
      <Box className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <Box key={url + i} sx={{ position: "relative", width: 92, height: 92 }}>
            <Box component="img" src={url} alt="" sx={{ width: 92, height: 92, objectFit: "contain", borderRadius: 2, border: "1px solid #e7ddc2", background: "#f8f4e8" }} />
            {i === 0 && (
              <Chip label="Main" size="small" sx={{ position: "absolute", bottom: 4, left: 4, height: 20, fontSize: 10, background: "#1b3a28", color: "#fff" }} />
            )}
            <IconButton
              size="small"
              aria-label="Remove image"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              sx={{ position: "absolute", top: 2, right: 2, background: "rgba(255,253,247,0.95)", width: 24, height: 24 }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ))}
        <ImageUpload
          value={pending ?? ""}
          label=""
          folder="products"
          onChange={(url) => {
            if (url) {
              onChange([...value, url]);
              setPending(null);
            }
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        First image is the main product photo.
      </Typography>
    </Box>
  );
}

function ProductForm({
  initial,
  categories,
  onSaved,
  onClose,
}: {
  initial: FormValues | null;
  categories: Category[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [catBusy, setCatBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(productSchema) as unknown as Resolver<FormValues>,
    defaultValues: initial ?? EMPTY,
  });
  const { control, handleSubmit, watch, setValue, reset, formState } = form;
  const name = watch("name");

  useEffect(() => {
    reset(initial ?? EMPTY);
  }, [initial, reset]);

  const variants = useFieldArray({ control, name: "variants" });
  const ingredients = useFieldArray({ control, name: "ingredients" });
  const benefits = useFieldArray({ control, name: "benefits" });

  async function addCategory() {
    const n = newCat.trim();
    if (!n || catBusy) return;
    setCatBusy(true);
    try {
      const res = await api<{ item: Category }>("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: n, slug: slugify(n), sortOrder: categories.length }),
      });
      setValue("categoryId", res.item.id, { shouldDirty: true });
      setValue("categoryName", res.item.name, { shouldDirty: true });
      setNewCat("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add category.");
    } finally {
      setCatBusy(false);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...values,
        slug: values.slug?.trim() || slugify(values.name),
        categoryName: categories.find((c) => c.id === values.categoryId)?.name ?? values.categoryName,
      };
      if (initial && (initial as unknown as Product).id) {
        await api(`/api/admin/products/${(initial as unknown as Product).id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  });

  const sectionTitle = (t: string) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1, color: "#1b3a28" }}>{t}</Typography>
  );

  return (
    <Box className="flex flex-col gap-4">
      {error && (
        <Typography variant="body2" sx={{ color: "#c0392b", background: "#fdecea", p: 1.5, borderRadius: 2 }}>
          {error}
        </Typography>
      )}

      {sectionTitle("Basics")}
      <Controller name="name" control={control} render={({ field }) => (
        <Box><TextField fullWidth size="small" label="Product name" required {...field} /><FieldError message={form.formState.errors.name?.message as string} /></Box>
      )} />
      <Box className="grid grid-cols-2 gap-4">
        <FormControl size="small" fullWidth>
          <InputLabel>Category *</InputLabel>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                label="Category *"
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  const c = categories.find((x) => x.id === e.target.value);
                  if (c) setValue("categoryName", c.name, { shouldDirty: true });
                }}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            )}
          />
          <FieldError message={form.formState.errors.categoryId?.message as string} />
        </FormControl>
        <Controller name="weight" control={control} render={({ field }) => (
          <TextField fullWidth size="small" label="Weight / size" placeholder="250g" {...field} />
        )} />
      </Box>
      <Box className="flex gap-2">
        <TextField
          size="small"
          label="New category"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          sx={{ flex: 1 }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
        />
        <Button variant="outlined" onClick={addCategory} disabled={catBusy || !newCat.trim()}>
          {catBusy ? "..." : "Add"}
        </Button>
      </Box>
      <Controller name="description" control={control} render={({ field }) => (
        <TextField fullWidth size="small" label="Description" multiline rows={4} {...field} />
      )} />

      {sectionTitle("Pricing & stock")}
      <Box className="grid grid-cols-3 gap-4">
        <Controller name="price" control={control} render={({ field }) => (
          <Box><TextField fullWidth size="small" label="Price (Rs.)" type="number" required slotProps={{ htmlInput: { min: 0 } }} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} /><FieldError message={form.formState.errors.price?.message as string} /></Box>
        )} />
        <Controller name="compareAtPrice" control={control} render={({ field }) => (
          <TextField fullWidth size="small" label="Compare-at price" type="number" slotProps={{ htmlInput: { min: 0 } }} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
        )} />
        <Controller name="stock" control={control} render={({ field }) => (
          <TextField fullWidth size="small" label="Stock" type="number" slotProps={{ htmlInput: { min: 0 } }} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
        )} />
      </Box>

      <Box>
        <Box className="flex items-center justify-between mb-2">
          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>Variants</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => variants.append({ label: "", price: undefined })}>Add variant</Button>
        </Box>
        {variants.fields.map((f, i) => (
          <Box key={f.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <Controller name={`variants.${i}.label`} control={control} render={({ field }) => (
              <TextField size="small" label="Label" placeholder="500g" {...field} sx={{ gridColumn: "span 5" }} />
            )} />
            <Controller name={`variants.${i}.price`} control={control} render={({ field }) => (
              <TextField size="small" label="Price" type="number" slotProps={{ htmlInput: { min: 0 } }} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} sx={{ gridColumn: "span 4" }} />
            )} />
            <Controller name={`variants.${i}.compareAtPrice`} control={control} render={({ field }) => (
              <TextField size="small" label="Was" type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} sx={{ gridColumn: "span 2" }} />
            )} />
            <IconButton size="small" aria-label="Remove variant" onClick={() => variants.remove(i)} sx={{ gridColumn: "span 1", color: "#c0392b" }}>
              <RemoveCircleOutline fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Controller
        name="images"
        control={control}
        render={({ field }) => <MultiImage value={field.value ?? []} onChange={field.onChange} />}
      />

      {sectionTitle("Ingredients")}
      <Box>
        {ingredients.fields.map((f, i) => (
          <Box key={f.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <Controller name={`ingredients.${i}.name`} control={control} render={({ field }) => (
              <TextField size="small" label="Ingredient" {...field} sx={{ gridColumn: "span 9" }} />
            )} />
            <Controller name={`ingredients.${i}.emoji`} control={control} render={({ field }) => (
              <TextField size="small" label="Emoji" {...field} sx={{ gridColumn: "span 2" }} />
            )} />
            <IconButton size="small" aria-label="Remove ingredient" onClick={() => ingredients.remove(i)} sx={{ gridColumn: "span 1", color: "#c0392b" }}>
              <RemoveCircleOutline fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => ingredients.append({ name: "" })}>Add ingredient</Button>
      </Box>

      {sectionTitle("Benefits")}
      <Box>
        {benefits.fields.map((f, i) => (
          <Box key={f.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <Controller name={`benefits.${i}.icon`} control={control} render={({ field }) => (
              <TextField select size="small" label="Icon" {...field} sx={{ gridColumn: "span 4" }}>
                {BENEFIT_ICONS.map((ic) => <MenuItem key={ic} value={ic}>{ic}</MenuItem>)}
              </TextField>
            )} />
            <Controller name={`benefits.${i}.label`} control={control} render={({ field }) => (
              <TextField size="small" label="Benefit" {...field} sx={{ gridColumn: "span 7" }} />
            )} />
            <IconButton size="small" aria-label="Remove benefit" onClick={() => benefits.remove(i)} sx={{ gridColumn: "span 1", color: "#c0392b" }}>
              <RemoveCircleOutline fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={() => benefits.append({ icon: "leaf", label: "" })}>Add benefit</Button>
      </Box>

      {sectionTitle("Visibility")}
      <Box className="grid grid-cols-2 gap-4">
        <Controller name="isActive" control={control} render={({ field }) => (
          <Box sx={{ border: "1px solid #e7ddc2", borderRadius: 2, px: 2, py: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>Active</Typography>
            <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          </Box>
        )} />
        <Controller name="isFeatured" control={control} render={({ field }) => (
          <Box sx={{ border: "1px solid #e7ddc2", borderRadius: 2, px: 2, py: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>Featured</Typography>
            <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
          </Box>
        )} />
      </Box>
      <Controller name="sortOrder" control={control} render={({ field }) => (
        <TextField size="small" label="Sort order" type="number" sx={{ maxWidth: 200 }} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
      )} />

      <Divider />
      <Box className="flex items-center justify-end gap-2">
        <Button variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy || !formState.isDirty}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {initial ? "Save changes" : "Add product"}
        </Button>
      </Box>
      {!formState.isDirty && initial && (
        <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "right" }}>
          No unsaved changes. Navigating away is safe.
        </Typography>
      )}
    </Box>
  );
}

function ProductDetail({ product, onClose, onEdit }: { product: Product; onClose: () => void; onEdit: () => void }) {
  return (
    <Box className="flex flex-col gap-4">
      <Box className="flex gap-4">
        <Thumb src={product.images?.[0]} alt={product.name} size={96} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{product.name}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{product.categoryName} · {product.weight} · {product.slug}</Typography>
          <Box className="flex gap-2 mt-2">
            <StatusChip status={product.isActive ? "active" : "inactive"} />
            {product.isFeatured && <StatusChip status="featured" />}
          </Box>
        </Box>
      </Box>
      <Box className="grid grid-cols-3 gap-3">
        {[
          ["Price", rs(product.price)],
          ["Compare at", product.compareAtPrice ? rs(product.compareAtPrice) : "—"],
          ["Stock", num(product.stock)],
          ["Rating", `${product.rating ?? 0} (${product.reviewCount ?? 0})`],
          ["Updated", fmtDateTime(product.updatedAt)],
          ["ID", product.id],
        ].map(([k, v]) => (
          <Box key={k} sx={{ background: "#fbf7ea", border: "1px solid #ece4cb", borderRadius: 2, p: 1.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>{k}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }} className="tnum">{v}</Typography>
          </Box>
        ))}
      </Box>
      {product.description && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Description</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-line" }}>{product.description}</Typography>
        </Box>
      )}
      {!!product.variants?.length && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Variants</Typography>
          {product.variants.map((v, i) => (
            <Typography key={i} variant="body2" className="tnum">{v.label} — {rs(v.price)}{v.compareAtPrice ? ` (was ${rs(v.compareAtPrice)})` : ""}</Typography>
          ))}
        </Box>
      )}
      {!!product.ingredients?.length && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Ingredients</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {product.ingredients.map((x) => `${x.emoji ?? ""} ${x.name}`.trim()).join(" · ")}
          </Typography>
        </Box>
      )}
      <Box className="flex justify-end gap-2">
        <Button variant="outlined" onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<EditIcon />} onClick={onEdit}>Edit product</Button>
      </Box>
    </Box>
  );
}

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [stock, setStock] = useState("all");

  const [drawer, setDrawer] = useState<"create" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refresh } = useApi<{ items: Product[] }>("/api/admin/products?limit=500");
  const { data: catData, refresh: refreshCats } = useApi<{ items: Category[] }>("/api/admin/categories?limit=100");
  const categories = useMemo(() => catData?.items ?? [], [catData]);

  const rows = useMemo(() => {
    let list = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => [p.name, p.categoryName, p.slug].some((v) => String(v ?? "").toLowerCase().includes(q)));
    if (category !== "all") list = list.filter((p) => p.categoryId === category);
    if (status !== "all") list = list.filter((p) => (status === "active" ? p.isActive : !p.isActive));
    if (stock === "in") list = list.filter((p) => (p.stock ?? 0) > 0);
    if (stock === "out") list = list.filter((p) => (p.stock ?? 0) <= 0);
    return list;
  }, [data, search, category, status, stock]);

  // Deep links from the dashboard (?new=1, ?edit=, ?view=, ?delete=, ?featured=)
  useEffect(() => {
    if (loading || !data) return;
    const q = searchParams;
    const find = (id: string | null) => (id ? data.items.find((p) => p.id === id) ?? null : null);
    if (q.get("new") === "1") {
      setActive(null);
      setDrawer("create");
    } else if (q.get("edit")) {
      const p = find(q.get("edit"));
      if (p) { setActive(p); setDrawer("edit"); }
    } else if (q.get("view")) {
      const p = find(q.get("view"));
      if (p) { setActive(p); setDrawer("view"); }
    } else if (q.get("delete")) {
      const p = find(q.get("delete"));
      if (p) setDeleting(p);
    } else if (q.get("featured")) {
      const p = find(q.get("featured"));
      if (p) toggleFeatured(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data]);

  function clearParams() {
    router.replace("/products", { scroll: false });
  }

  async function toggleFeatured(p: Product) {
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ isFeatured: !p.isFeatured }) });
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/products/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      clearParams();
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function toForm(p: Product): FormValues {
    return {
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      variants: (p.variants ?? []).map((v) => ({ label: v.label, price: v.price, compareAtPrice: v.compareAtPrice ?? null })),
      weight: p.weight ?? "",
      stock: p.stock ?? 0,
      images: p.images ?? [],
      ingredients: (p.ingredients ?? []).map((x) => ({ name: x.name, emoji: x.emoji ?? "" })),
      benefits: (p.benefits ?? []).map((b) => ({ icon: b.icon, label: b.label })),
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    };
  }

  if (error) return (<><PageHeader title="Products" /><ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Catalog control center — pricing, stock, media and visibility."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => { setActive(null); setDrawer("create"); }}>Add Product</Button>}
      />

      <Card sx={{ mb: 2, p: 1.5 }}>
        <Box className="flex flex-wrap gap-2">
          <TextField
            size="small"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
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
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
              <MenuItem value="all">All categories</MenuItem>
              {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Stock</InputLabel>
            <Select value={stock} label="Stock" onChange={(e) => setStock(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="in">In stock</MenuItem>
              <MenuItem value="out">Out of stock</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

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
              {loading && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#8d8670" }}>Loading products...</td></tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1ebd6" }} className="hover:bg-[#fdfaf0] cursor-pointer" onClick={() => { setActive(p); setDrawer("view"); }}>
                  <td style={{ padding: "10px 8px 10px 16px" }} onClick={(e) => e.stopPropagation()}><Checkbox size="small" /></td>
                  <td style={{ padding: "10px 12px" }}>
                    <Box className="flex items-center gap-3">
                      <Thumb src={p.images?.[0]} alt={p.name} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 12 }}>{p.weight}{p.categoryName ? ` · ${p.categoryName}` : ""}</Typography>
                      </Box>
                    </Box>
                  </td>
                  <td style={{ padding: "10px 12px" }} className="tnum font-bold">{rs(p.price)}</td>
                  <td style={{ padding: "10px 12px" }} className="tnum">
                    <Typography variant="body2" sx={{ fontWeight: 700, color: (p.stock ?? 0) <= 0 ? "#c0392b" : undefined }}>{p.stock ?? 0}</Typography>
                  </td>
                  <td style={{ padding: "10px 12px" }}><StatusChip status={p.isActive ? "active" : "inactive"} /></td>
                  <td style={{ padding: "10px 12px" }} onClick={(e) => e.stopPropagation()}>
                    <Switch size="small" checked={p.isFeatured} onChange={() => toggleFeatured(p)} aria-label="Toggle featured" />
                  </td>
                  <td style={{ padding: "10px 20px 10px 12px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <Box className="inline-flex items-center gap-1.5">
                      <IconButton size="small" aria-label="View" onClick={() => { setActive(p); setDrawer("view"); }} sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30 }}><VisibilityOutlined sx={{ fontSize: 15 }} /></IconButton>
                      <IconButton size="small" aria-label="Edit" onClick={() => { setActive(p); setDrawer("edit"); }} sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30 }}><EditIcon sx={{ fontSize: 15 }} /></IconButton>
                      <IconButton size="small" aria-label="Delete" onClick={() => setDeleting(p)} sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30, color: "#c0392b" }}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton>
                    </Box>
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#8d8670" }}>No products found. Add your first product to get started.</td></tr>
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      <FormDrawer
        open={drawer === "create" || drawer === "edit"}
        wide
        title={drawer === "edit" ? "Edit product" : "Add product"}
        subtitle={drawer === "edit" && active ? active.name : "A new product for the Nourish Spoon catalog."}
        onClose={() => { setDrawer(null); clearParams(); }}
      >
        {(drawer === "create" || drawer === "edit") && (
          <ProductForm
            initial={drawer === "edit" && active ? { ...toForm(active), id: active.id } as unknown as FormValues : null}
            categories={categories}
            onSaved={() => { refresh(); refreshCats(); }}
            onClose={() => { setDrawer(null); clearParams(); }}
          />
        )}
      </FormDrawer>

      <FormDrawer
        open={drawer === "view"}
        wide
        title="Product details"
        onClose={() => { setDrawer(null); clearParams(); }}
      >
        {active && (
          <ProductDetail
            product={active}
            onClose={() => { setDrawer(null); clearParams(); }}
            onEdit={() => setDrawer("edit")}
          />
        )}
      </FormDrawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Deactivate product?"
        message={deleting ? (
          <>Deactivate <b>{deleting.name}</b>? It will be hidden from the app immediately, while past orders keep their records. This is reversible — you can reactivate it anytime.</>
        ) : ""}
        confirmLabel="Deactivate"
        danger
        busy={busy}
        onClose={() => { setDeleting(null); clearParams(); }}
        onConfirm={confirmDelete}
      />

    </Box>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
