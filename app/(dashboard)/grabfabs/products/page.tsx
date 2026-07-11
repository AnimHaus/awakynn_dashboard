'use client';

import { useEffect, useRef, useState } from 'react';
import { products, uploads, type Product, type Sku } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ── Image upload field ───────────────────────────────────────────────────────

function ImageUploadField({
  label,
  value,
  onChange,
  brand = 'grabfabs',
  folder = 'products',
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  brand?: string;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploads.uploadImage(brand, file, folder);
      onChange(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors p-4 text-center min-h-[100px]',
          dragOver ? 'border-[#2A61F9] bg-[#EEF3FF]' : 'border-[#E4EBFE] hover:border-[#2A61F9] hover:bg-[#F7F9FF]',
          uploading ? 'opacity-60 pointer-events-none' : '',
        ].join(' ')}
      >
        {value ? (
          <img src={value} alt="preview" className="h-24 w-24 object-cover rounded-lg border border-[#E4EBFE]" />
        ) : (
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 3.75h6m0 0v6m0-6L13.5 10.5M3 16.5v.75A2.25 2.25 0 005.25 19.5h13.5A2.25 2.25 0 0021 17.25v-.75" />
          </svg>
        )}
        <p className="text-xs text-gray-400">
          {uploading ? 'Uploading…' : value ? 'Click or drag to replace' : 'Click or drag to upload'}
        </p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
      </div>

      {/* Manual URL fallback */}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="or paste a URL…"
        className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9] text-xs"
      />

      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
    </div>
  );
}

// ── Product edit modal ───────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [stock, setStock] = useState(String(product.stock));
  const [pricing, setPricing] = useState<Sku[]>(product.pricing.map((s) => ({ ...s })));
  const [imageUrl, setImageUrl] = useState(product.image);
  const [heroImageUrl, setHeroImageUrl] = useState(product.hero_image);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const updated = await products.update(product.slug, {
        stock: Number(stock),
        pricing,
        image: imageUrl,
        hero_image: heroImageUrl,
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function updateSku(index: number, field: 'label' | 'price', value: string) {
    setPricing((prev) =>
      prev.map((s, i) => i === index ? { ...s, [field]: field === 'price' ? Number(value) : value } : s)
    );
  }

  return (
    <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex-shrink-0" style={{ backgroundColor: product.color }} />
          <div>
            <DialogTitle className="text-base">{product.name}</DialogTitle>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{product.slug}</p>
          </div>
        </div>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-6 pt-2">

        {/* ── Left column: settings ── */}
        <div className="flex flex-col gap-5">

          {/* Stock */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</label>
            <Input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]"
            />
          </div>

          {/* Pricing SKUs */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</label>
              <button
                type="button"
                onClick={() => setPricing((prev) => [...prev, { label: '', price: 0 }])}
                className="flex items-center gap-1 text-xs text-[#2A61F9] hover:underline font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add tier
              </button>
            </div>
            {pricing.map((sku, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={sku.label}
                  onChange={(e) => updateSku(i, 'label', e.target.value)}
                  placeholder="Label (e.g. 100g)"
                  className="flex-1 border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                  <Input
                    type="number"
                    min={0}
                    value={sku.price}
                    onChange={(e) => updateSku(i, 'price', e.target.value)}
                    className="pl-7 w-28 border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPricing((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remove tier"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column: images ── */}
        <div className="flex flex-col gap-5">
          <ImageUploadField
            label="Product image"
            value={imageUrl}
            onChange={setImageUrl}
          />
          <ImageUploadField
            label="Hero image (full-bleed)"
            value={heroImageUrl}
            onChange={setHeroImageUrl}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-[#E4EBFE] mt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-[#E4EBFE] text-sm font-medium text-gray-600 hover:bg-[#F7F9FF] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-[#2A61F9] text-white text-sm font-medium hover:bg-[#1A4FD4] disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </DialogContent>
  );
}

// ── Create product modal ─────────────────────────────────────────────────────

const BLANK_PRODUCT: Omit<Product, 'id'> = {
  slug: '',
  name: '',
  tagline: '',
  description: '',
  long_description: '',
  highlights: [],
  nutrition_note: '',
  pricing: [{ label: '', price: 0 }],
  color: '#1a5c28',
  accent: '#c87c2e',
  image: '',
  hero_image: '',
  stock: 100,
  is_active: true,
};

function CreateProductModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (p: Product) => void;
}) {
  const [form, setForm] = useState<Omit<Product, 'id'>>({ ...BLANK_PRODUCT });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSku(index: number, field: 'label' | 'price', value: string) {
    setForm((prev) => ({
      ...prev,
      pricing: prev.pricing.map((s, i) =>
        i === index ? { ...s, [field]: field === 'price' ? Number(value) : value } : s
      ),
    }));
  }

  async function save() {
    if (!form.slug || !form.name) { setError('Slug and name are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await products.create(form);
      onCreated(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base">New Product</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-6 pt-2">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-4">

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug <span className="text-red-400">*</span></label>
            <Input value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="e.g. peanut-butter" className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]" />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name <span className="text-red-400">*</span></label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Product name" className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]" />
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tagline</label>
            <Input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Short tagline" className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]" />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Short description"
              className="w-full rounded-md border border-[#E4EBFE] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A61F9]/30 focus:border-[#2A61F9] resize-none"
            />
          </div>

          {/* Stock */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</label>
            <Input type="number" min={0} value={form.stock} onChange={(e) => set('stock', Number(e.target.value))} className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]" />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Brand color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-[#E4EBFE]" />
                <Input value={form.color} onChange={(e) => set('color', e.target.value)} className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9] font-mono text-xs" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accent color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent} onChange={(e) => set('accent', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-[#E4EBFE]" />
                <Input value={form.accent} onChange={(e) => set('accent', e.target.value)} className="border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9] font-mono text-xs" />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, pricing: [...prev.pricing, { label: '', price: 0 }] }))}
                className="flex items-center gap-1 text-xs text-[#2A61F9] hover:underline font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add tier
              </button>
            </div>
            {form.pricing.map((sku, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={sku.label}
                  onChange={(e) => updateSku(i, 'label', e.target.value)}
                  placeholder="Label (e.g. 100g)"
                  className="flex-1 border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                  <Input
                    type="number"
                    min={0}
                    value={sku.price}
                    onChange={(e) => updateSku(i, 'price', e.target.value)}
                    className="pl-7 w-28 border-[#E4EBFE] focus-visible:ring-[#2A61F9]/30 focus-visible:border-[#2A61F9]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, pricing: prev.pricing.filter((_, idx) => idx !== i) }))}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column: images ── */}
        <div className="flex flex-col gap-5">
          <ImageUploadField label="Product image" value={form.image} onChange={(url) => set('image', url)} />
          <ImageUploadField label="Hero image (full-bleed)" value={form.hero_image} onChange={(url) => set('hero_image', url)} />

          {/* Visibility */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FF] border border-[#E4EBFE]">
            <div>
              <p className="text-sm font-medium text-gray-800">Visibility</p>
              <p className="text-xs text-gray-400 mt-0.5">{form.is_active ? 'Visible to customers' : 'Hidden from store'}</p>
            </div>
            <button
              onClick={() => set('is_active', !form.is_active)}
              className={['relative w-11 h-6 rounded-full transition-colors focus:outline-none', form.is_active ? 'bg-[#2A61F9]' : 'bg-gray-200'].join(' ')}
            >
              <span className={['absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.is_active ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      <div className="flex gap-2 pt-3 border-t border-[#E4EBFE] mt-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#E4EBFE] text-sm font-medium text-gray-600 hover:bg-[#F7F9FF] transition-colors">
          Cancel
        </button>
        <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#2A61F9] text-white text-sm font-medium hover:bg-[#1A4FD4] disabled:opacity-60 transition-colors">
          {saving ? 'Creating…' : 'Create product'}
        </button>
      </div>
    </DialogContent>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    products.list(false)
      .then(setProductList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(updated: Product) {
    setProductList((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  }

  function handleCreated(created: Product) {
    setProductList((prev) => [created, ...prev]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm">{productList.length} products in catalogue</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A61F9] text-white text-sm font-medium hover:bg-[#1A4FD4] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add product
        </button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Catalogue</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productList.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-[#F7F9FF] transition-colors"
                      onClick={() => setSelected(p)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#E4EBFE]" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 border border-[#E4EBFE]" style={{ backgroundColor: p.color }} />
                          )}
                          <div>
                            <p className="font-medium text-sm text-[#2A61F9] hover:underline">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.tagline}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {p.pricing.map((s) => (
                            <span key={s.label} className="text-xs">{s.label} — ₹{s.price}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-sm ${p.stock < 10 ? 'text-destructive font-bold' : ''}`}>
                          {p.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? 'default' : 'secondary'}>
                          {p.is_active ? 'Active' : 'Hidden'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <ProductModal
            product={selected}
            onClose={() => setSelected(null)}
            onSaved={handleSaved}
          />
        )}
      </Dialog>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        {creating && (
          <CreateProductModal
            onClose={() => setCreating(false)}
            onCreated={handleCreated}
          />
        )}
      </Dialog>
    </div>
  );
}