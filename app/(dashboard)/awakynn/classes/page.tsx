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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw, Trash2, Video, Calendar, Clock,
  Users, Tag, ExternalLink, CheckCircle2, AlertCircle,
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
  description: string;
  instructor: string;
  level: string;
};

const SCHEDULE: ClassSlot[] = [
  { id: 'yoga-morning',  title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 8,  startMinute: 0,  durationMinutes: 60, colorKey: 'yoga',       description: 'Morning flow combining asana postures with pranayama breathwork to energise the body and centre the mind.', instructor: 'Awakynn Team', level: 'All levels' },
  { id: 'workshop',      title: 'Sunday Workshop',           category: 'Community Practice', days: [0],       startHour: 10, startMinute: 0,  durationMinutes: 60, colorKey: 'workshop',   description: 'A longer community-led session exploring themed topics — philosophy, seasonal practices, or deep technique dives.', instructor: 'Awakynn Team', level: 'All levels' },
  { id: 'yoga-midday',   title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 11, startMinute: 0,  durationMinutes: 60, colorKey: 'yoga',       description: 'Midday reset — grounding postures and breathwork to restore focus and release midday tension.', instructor: 'Awakynn Team', level: 'All levels' },
  { id: 'yoga-evening1', title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 17, startMinute: 0,  durationMinutes: 60, colorKey: 'yoga',       description: 'Evening practice to unwind from the day — fluid sequences and calming breathwork.', instructor: 'Awakynn Team', level: 'All levels' },
  { id: 'yoga-evening2', title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 18, startMinute: 15, durationMinutes: 60, colorKey: 'yoga',       description: 'Second evening slot — ideal for those who prefer a later practice before dinner.', instructor: 'Awakynn Team', level: 'All levels' },
  { id: 'yoga-evening3', title: 'Yoga — Asana & Pranayama', category: 'Movement & Breath',  days: [2,4,6,0], startHour: 19, startMinute: 30, durationMinutes: 60, colorKey: 'yoga',       description: 'Late evening wind-down — gentle yet structured, preparing body and mind for rest.', instructor: 'Awakynn Team', level: 'All levels' },
  { id: 'meditation',    title: 'Breathing & Meditation',   category: 'Inner Stillness',    days: [2,5],     startHour: 20, startMinute: 30, durationMinutes: 45, colorKey: 'meditation', description: 'Guided breathwork and silent meditation to cultivate inner awareness and stillness before sleep.', instructor: 'Awakynn Team', level: 'All levels' },
];

const COLOR_MAP = {
  yoga:       { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-200',    bar: 'bg-amber-400'  },
  meditation: { dot: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700 border-teal-200',       bar: 'bg-teal-500'   },
  workshop:   { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-400' },
};

const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextOccurrence(dayOfWeek: number, istH: number, istM: number): Date {
  const nowUtcMins = ((new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + IST_OFFSET_MINS) % 1440);
  const nowIstDay  = new Date().getUTCDay();
  let daysAhead    = (dayOfWeek - nowIstDay + 7) % 7;
  if (daysAhead === 0 && istH * 60 + istM <= nowUtcMins) daysAhead = 7;
  const totalUtcMins = ((istH * 60 + istM - IST_OFFSET_MINS) % 1440 + 1440) % 1440;
  const d = new Date();
  d.setUTCHours(Math.floor(totalUtcMins / 60), totalUtcMins % 60, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d;
}

type SlotPayload = GenerateSessionPayload & { slotMeta: ClassSlot };

function upcomingSlots(): SlotPayload[] {
  const result: SlotPayload[] = [];
  for (const slot of SCHEDULE) {
    for (const day of slot.days) {
      const start = getNextOccurrence(day, slot.startHour, slot.startMinute);
      const end   = new Date(start.getTime() + slot.durationMinutes * 60000);
      result.push({ slot_id: slot.id, day_of_week: day, occurrence_date: start.toISOString(), end_date: end.toISOString(), title: slot.title, slotMeta: slot });
    }
  }
  return result.sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtIst  = (h: number, m: number) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm} IST`;
};

// ── Session dialog ────────────────────────────────────────────────────────────

type SlotWithSession = { payload: SlotPayload; existing: ClassSession | undefined };

function SessionDialog({ item, open, onOpenChange, onGenerate, onDelete, generating, deleting }: {
  item: SlotWithSession;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGenerate: (p: GenerateSessionPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  generating: string | null;
  deleting: string | null;
}) {
  const { payload, existing } = item;
  const slot    = payload.slotMeta;
  const colors  = COLOR_MAP[slot.colorKey];
  const key     = `${payload.slot_id}-${payload.occurrence_date}`;
  const isGen   = generating === key;
  const isDel   = existing ? deleting === existing.id : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{slot.category}</span>
          </div>
          <DialogTitle className="text-lg leading-snug">{slot.title}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed -mt-1">{slot.description}</p>

        <Separator />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Next class</p>
              <p className="font-medium">{DAY_FULL[payload.day_of_week]}</p>
              <p className="text-muted-foreground text-xs">{fmtDate(payload.occurrence_date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Time</p>
              <p className="font-medium">{fmtTime(payload.occurrence_date)}</p>
              <p className="text-muted-foreground text-xs">{fmtIst(slot.startHour, slot.startMinute)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Duration</p>
              <p className="font-medium">{slot.durationMinutes} min</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Level</p>
              <p className="font-medium">{slot.level}</p>
              <p className="text-muted-foreground text-xs">{slot.instructor}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Runs on</p>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_SHORT.map((d, i) => (
              <span key={d} className={`px-2 py-0.5 rounded-md text-xs font-medium border ${slot.days.includes(i) ? colors.badge : 'bg-transparent text-muted-foreground/30 border-transparent'}`}>
                {d}
              </span>
            ))}
          </div>
        </div>

        <Separator />

        {existing?.meet_link ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Meeting link ready
            </div>
            <a href={existing.meet_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EEF3FF] text-[#2A61F9] text-xs font-medium hover:bg-[#dce8ff] transition-colors">
              <Video className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{existing.meet_link}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            {existing.generated_at && (
              <p className="text-[10px] text-muted-foreground">Generated {new Date(existing.generated_at).toLocaleString()}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" /> No meeting link yet — generate one below.
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button className="flex-1" variant={existing ? 'outline' : 'default'} size="sm" disabled={isGen} onClick={() => onGenerate(payload)}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isGen ? 'animate-spin' : ''}`} />
            {existing ? 'Regenerate link' : 'Generate link'}
          </Button>
          {existing && (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" disabled={isDel} onClick={() => onDelete(existing.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AwakyynnClassesPage() {
  const [sessions,      setSessions]      = useState<ClassSession[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [generating,    setGenerating]    = useState<string | null>(null);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [selected,      setSelected]      = useState<SlotWithSession | null>(null);
  const [season,        setSeason]        = useState<Season | null>(null);
  const [seasonSaving,  setSeasonSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionData, seasonData] = await Promise.all([
        classSessions.list(false),
        siteSettings.getSeason(),
      ]);
      setSessions(sessionData);
      setSeason(seasonData.season);
    }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
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

  async function handleGenerate(payload: GenerateSessionPayload) {
    const key = `${payload.slot_id}-${payload.occurrence_date}`;
    setGenerating(key);
    try {
      const session = await classSessions.generate(payload);
      setSessions((prev) => {
        const filtered = prev.filter((s) => !(s.slot_id === session.slot_id && s.occurrence_date === session.occurrence_date));
        return [...filtered, session].sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));
      });
      setSelected((prev) => prev ? { ...prev, existing: session } : prev);
    } catch (e) { setError(String(e)); }
    finally { setGenerating(null); }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await classSessions.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSelected((prev) => prev ? { ...prev, existing: undefined } : prev);
    } catch (e) { setError(String(e)); }
    finally { setDeleting(null); }
  }

  const sessionMap = new Map<string, ClassSession>(sessions.map((s) => [`${s.slot_id}|${s.occurrence_date}`, s]));

  function findExisting(slotId: string, occDate: string): ClassSession | undefined {
    return Array.from(sessionMap.entries()).find(([k]) =>
      k.startsWith(`${slotId}|`) &&
      new Date(k.split('|')[1]).toISOString().slice(0, 16) === new Date(occDate).toISOString().slice(0, 16),
    )?.[1];
  }

  const upcoming = upcomingSlots();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Class Sessions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage Google Meet links for Awakynn classes. Click any card for details.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
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
            Controls the colour palette on the Awakynn website and page transition strips.
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
            const meta    = SEASON_META[s];
            const active  = season === s;
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

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Next occurrence per slot
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcoming.map((slot) => {
              const existing = findExisting(slot.slot_id, slot.occurrence_date);
              const colors   = COLOR_MAP[slot.slotMeta.colorKey];

              return (
                <Card
                  key={`${slot.slot_id}-${slot.occurrence_date}`}
                  className="relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
                  onClick={() => setSelected({ payload: slot, existing })}
                >
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${colors.bar}`} />
                  <CardContent className="pt-4 pb-4 flex flex-col gap-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{slot.slotMeta.category}</span>
                      </div>
                      {existing ? (
                        <Badge className="shrink-0 text-[10px] bg-green-50 text-green-700 border border-green-200 shadow-none">Ready</Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-[10px]">No link</Badge>
                      )}
                    </div>

                    {/* Title + description */}
                    <div>
                      <p className="font-semibold text-sm leading-snug">{slot.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{slot.slotMeta.description}</p>
                    </div>

                    {/* Date / time / duration */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{DAY_SHORT[slot.day_of_week]}, {fmtDate(slot.occurrence_date)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(slot.occurrence_date)}</span>
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{slot.slotMeta.durationMinutes} min</span>
                    </div>

                    {/* Day pills */}
                    <div className="flex gap-1 flex-wrap">
                      {DAY_SHORT.map((d, i) => (
                        <span key={d} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${slot.slotMeta.days.includes(i) ? colors.badge : 'bg-transparent text-muted-foreground/30 border-transparent'}`}>
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Meet link preview */}
                    {existing?.meet_link && (
                      <div className="flex items-center gap-1.5 text-xs text-[#2A61F9] bg-[#EEF3FF] rounded-lg px-2.5 py-1.5">
                        <Video className="w-3 h-3 shrink-0" />
                        <span className="truncate">{existing.meet_link}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <SessionDialog
          item={selected}
          open={!!selected}
          onOpenChange={(v) => { if (!v) setSelected(null); }}
          onGenerate={handleGenerate}
          onDelete={handleDelete}
          generating={generating}
          deleting={deleting}
        />
      )}
    </div>
  );
}
