'use client';

import { useEffect, useRef, useState } from 'react';
import {
  gallery as galleryApi,
  type GalleryItem,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';

// ── Upload / Add dialog ───────────────────────────────────────────────────────

function UploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded: (item: GalleryItem) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setTitle('');
    setCaption('');
    setSortOrder(0);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) { setError('Please select an image.'); return; }
    setUploading(true);
    setError(null);
    try {
      const item = await galleryApi.upload(file, title, caption, sortOrder);
      onUploaded(item);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          {/* Image picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center h-44 hover:border-primary transition-colors overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to select image</p>
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP — max 10 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Title
            </label>
            <Input placeholder="e.g. Morning session" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Caption
            </label>
            <textarea
              rows={2}
              placeholder="Short caption shown below the photo…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Sort order */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sort order <span className="normal-case font-normal text-muted-foreground">(lower = shown first)</span>
            </label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-28"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button className="w-full" onClick={handleUpload} disabled={uploading || !file}>
            {uploading
              ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <Plus className="w-3.5 h-3.5 mr-1.5" />
            }
            {uploading ? 'Uploading…' : 'Upload photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: GalleryItem;
  onSaved: (updated: GalleryItem) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.caption);
  const [sortOrder, setSortOrder] = useState(item.sort_order);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(item.title);
    setCaption(item.caption);
    setSortOrder(item.sort_order);
    setError(null);
  }, [item]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await galleryApi.update(item.id, { title, caption, sort_order: sortOrder });
      onSaved(updated);
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <img src={item.image_url} alt={item.title} className="w-full h-40 object-cover rounded-lg" />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Caption</label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort order</label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-28" />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Gallery item card ─────────────────────────────────────────────────────────

function GalleryCard({
  item,
  onEdit,
  onToggleVisibility,
  onDelete,
  actionId,
}: {
  item: GalleryItem;
  onEdit: (item: GalleryItem) => void;
  onToggleVisibility: (item: GalleryItem) => Promise<void>;
  onDelete: (item: GalleryItem) => Promise<void>;
  actionId: string | null;
}) {
  const busy = actionId === item.id;

  return (
    <Card className={`overflow-hidden py-0 transition-opacity ${!item.is_visible ? 'opacity-50' : ''}`}>
      <div className="relative aspect-square bg-muted overflow-hidden">
        <img
          src={item.image_url}
          alt={item.title || 'Gallery photo'}
          className="w-full h-full object-cover"
        />
        {!item.is_visible && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <EyeOff className="w-6 h-6 text-white/80" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge
            variant="outline"
            className={`text-[10px] ${item.is_visible ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
          >
            #{item.sort_order}
          </Badge>
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        {item.title && (
          <p className="text-sm font-medium leading-snug truncate">{item.title}</p>
        )}
        {item.caption && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
        )}
        <div className="flex items-center gap-1.5 pt-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onEdit(item)}
            disabled={busy}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onToggleVisibility(item)}
            disabled={busy}
            title={item.is_visible ? 'Hide' : 'Show'}
          >
            {busy ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : item.is_visible ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
            onClick={() => onDelete(item)}
            disabled={busy}
            title="Delete"
          >
            {busy ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GalleryItem | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await galleryApi.list(false);
      setItems(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleUploaded(item: GalleryItem) {
    setItems((prev) => [item, ...prev]);
  }

  function handleSaved(updated: GalleryItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function handleToggleVisibility(item: GalleryItem) {
    setActionId(item.id);
    try {
      const updated = await galleryApi.update(item.id, { is_visible: !item.is_visible });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError(String(e));
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(item: GalleryItem) {
    if (!confirm(`Delete "${item.title || 'this photo'}"? This also removes the image from storage.`)) return;
    setActionId(item.id);
    try {
      await galleryApi.delete(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setActionId(null);
    }
  }

  const displayed = showHidden ? items : items.filter((i) => i.is_visible);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gallery</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.filter((i) => i.is_visible).length} visible · {items.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHidden((v) => !v)}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
            {showHidden ? 'Hide hidden' : 'Show hidden'}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Upload photo
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground mb-4" />
          <p className="font-medium">No photos yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload your first photo to get started.</p>
          <Button className="mt-4" onClick={() => setUploadOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Upload photo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayed.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              onEdit={setEditTarget}
              onToggleVisibility={handleToggleVisibility}
              onDelete={handleDelete}
              actionId={actionId}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleUploaded}
      />
      {editTarget && (
        <EditDialog
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          item={editTarget}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
