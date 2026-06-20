'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  classSessions,
  siteSettings,
  type ClassSession,
  type GenerateSessionPayload,
  type Season,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw, Trash2, Video, Calendar, Clock,
  Tag, ExternalLink, CheckCircle2, AlertCircle, Plus,
} from 'lucide-react';

// ── Schedule definition ───────────────────────────────────────────────────────

const IST_OFFSET_MINS = 330;

type ClassSlot = {
  id: string;
  title: string;
  category: string;
  days: number[];
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  colorKey: 'yoga' | 'meditation' | 'workshop';
};

const SCHEDULE: ClassSlot[] = [
  { id: 'yoga-morning',  title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 8,  startMinute: 0,  durationMinutes: 60, colorKey: 'yoga'       },
  { id: 'workshop',      title: 'Sunday Workshop',           category: 'Community Practice', days: [0],       startHour: 10, startMinute: 0,  durationMinutes: 60, colorKey: 'workshop'   },
  { id: 'yoga-midday',   title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 11, startMinute: 0,  durationMinutes: 60, colorKey: 'yoga'       },
  { id: 'yoga-evening1', title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 17, startMinute: 0,  durationMinutes: 60, colorKey: 'yoga'       },
  { id: 'yoga-evening2', title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 18, startMinute: 15, durationMinutes: 60, colorKey: 'yoga'       },
  { id: 'yoga-evening3', title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 19, startMinute: 30, durationMinutes: 60, colorKey: 'yoga'       },
  { id: 'meditation',    title: 'Breathing & Meditation',   category: 'Inner Stillness',    days: [2,5],     startHour: 20, startMinute: 30, durationMinutes: 45, colorKey: 'meditation' },
];

const COLOR_MAP = {
  yoga:       { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200',    bar: 'bg-amber-400'  },
  meditation: { dot: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700 border-teal-200',       bar: 'bg-teal-500'   },
  workshop:   { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-400' },
};

const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

// Convert IST h:m to UTC datetime on a given local date string (YYYY-MM-DD)
function istToUtcIso(dateStr: string, istH: number, istM: number): string {
  const totalUtcMins = ((istH * 60 + istM - IST_OFFSET_MINS) % 1440 + 1440) % 1440;
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCHours(Math.floor(totalUtcMins / 60), totalUtcMins % 60, 0, 0);
  return d.toISOString();
}

// ── Schedule dialog ────────────────────────────────────────────────────────────

function ScheduleDialog({
  open,
  onOpenChange,
  onSchedule,
  scheduling,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSchedule: (p: GenerateSessionPayload) => Promise<void>;
  scheduling: boolean;
}) {
  const [slotId, setSlotId]     = useState(SCHEDULE[0].id);
  const [dateStr, setDateStr]   = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError]       = useState<string | null>(null);

  const slot = SCHEDULE.find((s) => s.id === slotId)!;

  async function handleSubmit() {
    setError(null);
    const start = istToUtcIso(dateStr, slot.startHour, slot.startMinute);
    const end   = new Date(new Date(start).getTime() + slot.durationMinutes * 60000).toISOString();
    const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
    try {
      await onSchedule({ slot_id: slot.id, day_of_week: dayOfWeek, occurrence_date: start, end_date: end, title: slot.title });
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule a Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class slot</label>
            <Select value={slotId} onValueChange={(v) => { if (v) setSlotId(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[360px]">
                {SCHEDULE.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="items-start py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{s.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {String(s.startHour).padStart(2,'0')}:{String(s.startMinute).padStart(2,'0')} IST · {s.durationMinutes} min · {s.category}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</label>
            <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
            <p><span className="font-medium text-foreground">Time (IST):</span> {String(slot.startHour).padStart(2,'0')}:{String(slot.startMinute).padStart(2,'0')} — {slot.durationMinutes} min</p>
            <p><span className="font-medium text-foreground">Category:</span> {slot.category}</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button className="w-full" onClick={handleSubmit} disabled={!dateStr || scheduling}>
            {scheduling ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Generate Meet link & publish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onRegenerate,
  onDelete,
  regenerating,
  deleting,
}: {
  session: ClassSession;
  onRegenerate: (s: ClassSession) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  regenerating: string | null;
  deleting: string | null;
}) {
  const slot   = SCHEDULE.find((s) => s.id === session.slot_id);
  const colors = COLOR_MAP[slot?.colorKey ?? 'yoga'];
  const isPast = new Date(session.occurrence_date) < new Date();
  const isRegen = regenerating === session.id;
  const isDel   = deleting === session.id;

  return (
    <Card className={`relative overflow-hidden transition-opacity ${isPast ? 'opacity-50' : ''}`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${colors.bar}`} />
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {slot?.category ?? 'Class'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isPast && <Badge variant="outline" className="text-[10px]">Past</Badge>}
            {session.meet_link
              ? <Badge className="text-[10px] bg-green-50 text-green-700 border border-green-200 shadow-none">Live</Badge>
              : <Badge variant="outline" className="text-[10px]">No link</Badge>
            }
          </div>
        </div>

        {/* Title + date/time */}
        <div>
          <p className="font-semibold text-sm leading-snug">{session.title}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(session.occurrence_date)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(session.occurrence_date)}</span>
            {slot && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{slot.durationMinutes} min</span>}
          </div>
        </div>

        {/* Meet link */}
        {session.meet_link ? (
          <a
            href={session.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#2A61F9] bg-[#EEF3FF] rounded-lg px-2.5 py-1.5 hover:bg-[#dce8ff] transition-colors"
          >
            <Video className="w-3 h-3 shrink-0" />
            <span className="truncate flex-1">{session.meet_link}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" /> No meeting link
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            disabled={isRegen}
            onClick={() => onRegenerate(session)}
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isRegen ? 'animate-spin' : ''}`} />
            {session.meet_link ? 'Regenerate' : 'Generate link'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
            disabled={isDel}
            onClick={() => onDelete(session.id)}
          >
            <Trash2 className="w-3 h-3 mr-1.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AwakyynnClassesPage() {
  const [sessions,      setSessions]      = useState<ClassSession[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [scheduling,    setScheduling]    = useState(false);
  const [regenerating,  setRegenerating]  = useState<string | null>(null);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [showSchedule,  setShowSchedule]  = useState(false);
  const [season,        setSeason]        = useState<Season | null>(null);
  const [seasonSaving,  setSeasonSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionData, seasonData] = await Promise.all([
        classSessions.list(false),
        siteSettings.getSeason(),
      ]);
      // Sort newest scheduled first (by created_at)
      setSessions([...sessionData].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setSeason(seasonData.season);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSeasonChange(s: Season) {
    setSeasonSaving(true);
    try {
      const data = await siteSettings.setSeason(s);
      setSeason(data.season);
    } catch (e) {
      setError(String(e));
    } finally {
      setSeasonSaving(false);
    }
  }

  async function handleSchedule(payload: GenerateSessionPayload) {
    setScheduling(true);
    try {
      const session = await classSessions.generate(payload);
      setSessions((prev) => [session, ...prev]);
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setScheduling(false);
    }
  }

  async function handleRegenerate(session: ClassSession) {
    setRegenerating(session.id);
    try {
      const updated = await classSessions.generate({
        slot_id: session.slot_id,
        day_of_week: session.day_of_week,
        occurrence_date: session.occurrence_date,
        end_date: session.end_date,
        title: session.title,
      });
      setSessions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch (e) {
      setError(String(e));
    } finally {
      setRegenerating(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await classSessions.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(null);
    }
  }

  const upcoming = sessions.filter((s) => new Date(s.occurrence_date) >= new Date());
  const past     = sessions.filter((s) => new Date(s.occurrence_date) < new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Class Schedule</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Schedule classes and generate Google Meet links. Published instantly to the public board.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowSchedule(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule Class
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span>{error}</span>
          <button className="ml-2 underline shrink-0" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* ── Season picker ── */}
      <div className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold">Frontend Season</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controls the colour palette on the Awakynn website.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['summer', 'monsoon', 'autumn', 'winter'] as Season[]).map((s) => {
            const SEASON_META: Record<Season, { label: string; dot: string }> = {
              summer:  { label: 'Summer',  dot: '#D4A54B' },
              monsoon: { label: 'Monsoon', dot: '#6D8A73' },
              autumn:  { label: 'Autumn',  dot: '#B86A3B' },
              winter:  { label: 'Winter',  dot: '#9EB8C7' },
            };
            const meta   = SEASON_META[s];
            const active = season === s;
            return (
              <button
                key={s}
                disabled={seasonSaving}
                onClick={() => handleSeasonChange(s)}
                className={[
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  active
                    ? 'border-[#2A61F9] text-[#2A61F9] bg-[#EEF3FF]'
                    : 'border-transparent text-muted-foreground hover:bg-muted/40',
                ].join(' ')}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
                {meta.label}
              </button>
            );
          })}
        </div>
        {seasonSaving && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
      </div>

      {/* ── Upcoming ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Upcoming ({upcoming.length})
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No upcoming classes scheduled.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowSchedule(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule first class
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcoming.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onRegenerate={handleRegenerate}
                onDelete={handleDelete}
                regenerating={regenerating}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Past ── */}
      {!loading && past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Past ({past.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {past.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onRegenerate={handleRegenerate}
                onDelete={handleDelete}
                regenerating={regenerating}
                deleting={deleting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Schedule dialog */}
      <ScheduleDialog
        open={showSchedule}
        onOpenChange={setShowSchedule}
        onSchedule={handleSchedule}
        scheduling={scheduling}
      />
    </div>
  );
}