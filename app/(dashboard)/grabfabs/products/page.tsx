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
  const [isActive, setIsActive] = useState(product.is_active);
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
        is_active: isActive,
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

          {/* Visibility toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FF] border border-[#E4EBFE]">
            <div>
              <p className="text-sm font-medium text-gray-800">Visibility</p>
              <p className="text-xs text-gray-400 mt-0.5">{isActive ? 'Visible to customers' : 'Hidden from store'}</p>
            </div>
            <button
              onClick={() => setIsActive((v) => !v)}
              className={[
                'relative w-11 h-6 rounded-full transition-colors focus:outline-none',
                isActive ? 'bg-[#2A61F9]' : 'bg-gray-200',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  isActive ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>

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
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</label>
            {pricing.map((sku, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={sku.label}
                  onChange={(e) => updateSku(i, 'label', e.target.value)}
                  placeholder="Label"
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    products.list(false)
      .then(setProductList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(updated: Product) {
    setProductList((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-muted-foreground text-sm">{productList.length} products in catalogue</p>
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
                          <div className="w-8 h-8 rounded-md flex-shrink-0" style={{ backgroundColor: p.color }} />
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
    </div>
  );
}