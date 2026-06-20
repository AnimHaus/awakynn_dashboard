'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  contactMessages, testimonialSubmissions,
  type ContactMessage, type TestimonialSubmission,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCw, Trash2, Mail, CheckCircle2, MessageSquare,
  Star, StarOff, Clock, Eye,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_BADGE: Record<ContactMessage['status'], string> = {
  new:     'bg-blue-50 text-blue-700 border-blue-200',
  read:    'bg-gray-100 text-gray-600 border-gray-200',
  replied: 'bg-green-50 text-green-700 border-green-200',
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [tab, setTab]                   = useState<'messages' | 'testimonials'>('messages');
  const [messages, setMessages]         = useState<ContactMessage[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialSubmission[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg]   = useState<ContactMessage | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestimonialSubmission | null>(null);
  const [actioning, setActioning]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [msgs, tests] = await Promise.all([
        contactMessages.list(),
        testimonialSubmissions.list(),
      ]);
      setMessages(msgs);
      setTestimonials(tests);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Message actions ──

  async function markStatus(id: string, status: ContactMessage['status']) {
    setActioning(id);
    try {
      const updated = await contactMessages.updateStatus(id, status);
      setMessages((prev) => prev.map((m) => m.id === id ? updated : m));
      if (selectedMsg?.id === id) setSelectedMsg(updated);
    } catch (e) { setError(String(e)); }
    finally { setActioning(null); }
  }

  async function deleteMessage(id: string) {
    setActioning(id);
    try {
      await contactMessages.delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMsg?.id === id) setSelectedMsg(null);
    } catch (e) { setError(String(e)); }
    finally { setActioning(null); }
  }

  // ── Testimonial actions ──

  async function toggleApprove(t: TestimonialSubmission) {
    setActioning(t.id);
    try {
      const updated = await testimonialSubmissions.setApproved(t.id, !t.approved);
      setTestimonials((prev) => prev.map((x) => x.id === t.id ? updated : x));
      if (selectedTest?.id === t.id) setSelectedTest(updated);
    } catch (e) { setError(String(e)); }
    finally { setActioning(null); }
  }

  async function deleteTestimonial(id: string) {
    setActioning(id);
    try {
      await testimonialSubmissions.delete(id);
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      if (selectedTest?.id === id) setSelectedTest(null);
    } catch (e) { setError(String(e)); }
    finally { setActioning(null); }
  }

  const newCount = messages.filter((m) => m.status === 'new').length;
  const pendingCount = testimonials.filter((t) => !t.approved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Contact messages and testimonial submissions from the website.
          </p>
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

      {/* Tab bar */}
      <div className="flex items-center gap-0 border w-fit" style={{ borderColor: '#2F4F46' }}>
        <button
          onClick={() => setTab('messages')}
          className="flex items-center gap-2 px-5 py-2 text-[0.68rem] font-medium tracking-[0.18em] uppercase transition-all duration-200"
          style={{
            backgroundColor: tab === 'messages' ? '#2F4F46' : 'transparent',
            color: tab === 'messages' ? '#faf8f5' : '#2F4F46',
          }}
        >
          <Mail className="w-3.5 h-3.5" />
          Messages
          {newCount > 0 && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[10px]">
              {newCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('testimonials')}
          className="flex items-center gap-2 px-5 py-2 text-[0.68rem] font-medium tracking-[0.18em] uppercase transition-all duration-200"
          style={{
            backgroundColor: tab === 'testimonials' ? '#2F4F46' : 'transparent',
            color: tab === 'testimonials' ? '#faf8f5' : '#2F4F46',
          }}
        >
          <Star className="w-3.5 h-3.5" />
          Testimonials
          {pendingCount > 0 && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Messages tab ── */}
      {tab === 'messages' && (
        <div className="space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : messages.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                onClick={() => { setSelectedMsg(m); if (m.status === 'new') markStatus(m.id, 'read'); }}
                className="flex items-start justify-between gap-4 border rounded-lg px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                style={{ borderLeft: m.status === 'new' ? '3px solid #2A61F9' : undefined }}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                    {m.interest && (
                      <Badge variant="outline" className="text-[10px]">{m.interest}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-xl">{m.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[10px] ${STATUS_BADGE[m.status]}`}>{m.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{fmtDate(m.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Testimonials tab ── */}
      {tab === 'testimonials' && (
        <div className="space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          ) : testimonials.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">No testimonials submitted yet.</p>
            </div>
          ) : (
            testimonials.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTest(t)}
                className="flex items-start justify-between gap-4 border rounded-lg px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                style={{ borderLeft: t.approved ? '3px solid #16a34a' : '3px solid #d97706' }}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{t.name}</span>
                    {t.age && <span className="text-xs text-muted-foreground">{t.age} yrs</span>}
                    {t.note && <Badge variant="outline" className="text-[10px]">{t.note}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-xl">{t.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[10px] ${t.approved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {t.approved ? 'Approved' : 'Pending'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{fmtDate(t.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Message detail dialog ── */}
      <Dialog open={!!selectedMsg} onOpenChange={(v) => { if (!v) setSelectedMsg(null); }}>
        {selectedMsg && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Message</span>
              </div>
              <DialogTitle>{selectedMsg.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Email:</span> {selectedMsg.email}</p>
              {selectedMsg.phone && <p><span className="font-medium text-foreground">Phone:</span> {selectedMsg.phone}</p>}
              {selectedMsg.interest && <p><span className="font-medium text-foreground">Interest:</span> {selectedMsg.interest}</p>}
              <p><span className="font-medium text-foreground">Received:</span> {fmtDate(selectedMsg.created_at)}</p>
            </div>
            <Separator />
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedMsg.message}</p>
            <Separator />
            <div className="flex items-center gap-2 flex-wrap">
              {(['new', 'read', 'replied'] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={selectedMsg.status === s ? 'default' : 'outline'}
                  className="text-xs capitalize"
                  disabled={actioning === selectedMsg.id}
                  onClick={() => markStatus(selectedMsg.id, s)}
                >
                  {s === 'read' ? <Eye className="w-3 h-3 mr-1" /> : s === 'replied' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                  {s}
                </Button>
              ))}
              <a
                href={`mailto:${selectedMsg.email}`}
                className="ml-auto text-xs text-blue-600 underline"
              >
                Reply via email
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                disabled={actioning === selectedMsg.id}
                onClick={() => deleteMessage(selectedMsg.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Testimonial detail dialog ── */}
      <Dialog open={!!selectedTest} onOpenChange={(v) => { if (!v) setSelectedTest(null); }}>
        {selectedTest && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Testimonial</span>
              </div>
              <DialogTitle>
                {selectedTest.name}
                {selectedTest.age && <span className="ml-2 text-sm font-normal text-muted-foreground">· {selectedTest.age} yrs</span>}
                {selectedTest.note && <span className="ml-2 text-xs font-normal text-amber-600">{selectedTest.note}</span>}
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">{fmtDate(selectedTest.created_at)}</p>
            <Separator />
            <p className="text-sm leading-[1.85] whitespace-pre-wrap">{selectedTest.message}</p>
            <Separator />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={selectedTest.approved ? 'default' : 'outline'}
                className="text-xs"
                disabled={actioning === selectedTest.id}
                onClick={() => toggleApprove(selectedTest)}
              >
                {selectedTest.approved
                  ? <><StarOff className="w-3 h-3 mr-1" /> Unapprove</>
                  : <><CheckCircle2 className="w-3 h-3 mr-1" /> Approve & publish</>
                }
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs ml-auto"
                disabled={actioning === selectedTest.id}
                onClick={() => deleteTestimonial(selectedTest.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
