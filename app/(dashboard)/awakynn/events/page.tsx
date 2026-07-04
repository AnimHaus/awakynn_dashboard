'use client';

import { useEffect, useState, useRef } from 'react';
import {
  awakyynnEvents,
  uploads,
  type AwakyynnEvent,
  type CreateEventPayload,
  type UpdateEventPayload,
} from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Trash2, Plus, ExternalLink, Image as ImageIcon, Play } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isEnded(event: AwakyynnEvent) {
  return new Date(event.end_date) < new Date();
}

// ── Event form dialog ─────────────────────────────────────────────────────────

function EventFormDialog({
  open,
  onOpenChange,
  existing,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: AwakyynnEvent | null;
  onSave: (slug: string | null, payload: CreateEventPayload | UpdateEventPayload) => Promise<void>;
  saving: boolean;
}) {
  const isEdit = !!existing;

  const [slug, setSlug]         = useState('');
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [logoUrl, setLogoUrl]   = useState('');
  const [videoId, setVideoId]   = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate when editing
  useEffect(() => {
    if (existing) {
      setSlug(existing.slug);
      setTitle(existing.title);
      setDesc(existing.description);
      setLogoUrl(existing.logo_url);
      setVideoId(existing.youtube_video_id);
      // Convert ISO to datetime-local format
      setStartDate(existing.start_date.slice(0, 16));
      setEndDate(existing.end_date.slice(0, 16));
    } else {
      setSlug(''); setTitle(''); setDesc(''); setLogoUrl('');
      setVideoId(''); setStartDate(''); setEndDate('');
    }
    setError(null);
  }, [existing, open]);

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploads.uploadImage('awakynn', file, 'events');
      setLogoUrl(url);
    } catch (e) {
      setError(`Logo upload failed: ${String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!title || !startDate || !endDate) {
      setError('Title, start date, and end date are required.');
      return;
    }
    if (!isEdit && !slug) {
      setError('Slug is required.');
      return;
    }
    try {
      if (isEdit) {
        const payload: UpdateEventPayload = {
          title,
          description: desc,
          logo_url: logoUrl,
          youtube_video_id: videoId,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
        };
        await onSave(existing!.slug, payload);
      } else {
        const payload: CreateEventPayload = {
          slug,
          title,
          description: desc,
          logo_url: logoUrl,
          youtube_video_id: videoId,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
        };
        await onSave(null, payload);
      }
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          {/* Slug (create only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. yoga-day-2026"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
              {slug && (
                <p className="text-[11px] text-muted-foreground">
                  Page will be at <code className="bg-muted px-1 rounded">awakynn.com/{slug}</code>
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Title <span className="text-red-500">*</span>
            </label>
            <Input placeholder="International Yoga Day 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of the event…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Logo upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Event Logo (shown in Navbar &amp; hero)
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                }
                {uploading ? 'Uploading…' : 'Upload image'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
              {logoUrl && (
                <img src={logoUrl} alt="logo preview" className="h-8 w-auto rounded object-contain border" />
              )}
            </div>
            {logoUrl && (
              <Input
                className="text-xs"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="CDN URL"
              />
            )}
          </div>

          {/* YouTube video ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> YouTube Video ID
            </label>
            <Input
              placeholder="e.g. dQw4w9WgXcQ"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value.trim())}
            />
            {videoId && (
              <p className="text-[11px] text-muted-foreground">
                Embeds: <code className="bg-muted px-1 rounded">youtube.com/embed/{videoId}</code>
              </p>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Start <span className="text-red-500">*</span>
              </label>
              <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                End <span className="text-red-500">*</span>
              </label>
              <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button className="w-full" onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            {isEdit ? 'Save changes' : 'Create event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({
  event,
  onEdit,
  onDelete,
  deleting,
}: {
  event: AwakyynnEvent;
  onEdit: (e: AwakyynnEvent) => void;
  onDelete: (slug: string) => Promise<void>;
  deleting: string | null;
}) {
  const ended = isEnded(event);
  const isDel = deleting === event.slug;

  return (
    <Card className={`relative overflow-hidden transition-opacity ${ended ? 'opacity-60' : ''}`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${ended ? 'bg-gray-300' : 'bg-teal-500'}`} />
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              {event.logo_url
                ? <img src={event.logo_url} alt={event.title} className="h-6 w-auto object-contain" />
                : <span className="font-semibold text-sm truncate">{event.title}</span>
              }
              {ended
                ? <Badge variant="outline" className="text-[10px] shrink-0">Ended</Badge>
                : <Badge className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 shadow-none shrink-0">Active</Badge>
              }
            </div>
            {event.logo_url && (
              <span className="text-[11px] text-muted-foreground truncate">{event.title}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={`https://awakynn.com/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onEdit(event)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-red-50"
              onClick={() => onDelete(event.slug)}
              disabled={isDel}
            >
              {isDel
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />
              }
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground block">Slug</span>
            <code className="text-[11px]">/{event.slug}</code>
          </div>
          <div>
            <span className="font-medium text-foreground block">Dates</span>
            {fmtDate(event.start_date)} — {fmtDate(event.end_date)}
          </div>
        </div>

        {event.youtube_video_id && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Play className="w-3 h-3" />
            <code>{event.youtube_video_id}</code>
          </div>
        )}

        {event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [events, setEvents]       = useState<AwakyynnEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]     = useState<AwakyynnEvent | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  async function loadEvents() {
    try {
      const data = await awakyynnEvents.list();
      setEvents(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEvents(); }, []);

  async function handleSave(slug: string | null, payload: CreateEventPayload | UpdateEventPayload) {
    setSaving(true);
    try {
      if (slug) {
        await awakyynnEvents.update(slug, payload as UpdateEventPayload);
      } else {
        await awakyynnEvents.create(payload as CreateEventPayload);
      }
      await loadEvents();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Delete event "${slug}"? This cannot be undone.`)) return;
    setDeleting(slug);
    try {
      await awakyynnEvents.delete(slug);
      setEvents((ev) => ev.filter((e) => e.slug !== slug));
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(event: AwakyynnEvent) {
    setEditing(event);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage event pages — each event gets its own URL slug, logo, and YouTube embed.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New event
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Event list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No events yet.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create your first event
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <EventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={editing}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
