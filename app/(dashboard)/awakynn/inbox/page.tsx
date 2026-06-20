'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  contactMessages, testimonialSubmissions,
  type ContactMessage, type TestimonialSubmission,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  RefreshCw, Trash2, Mail, CheckCircle2, MessageSquare,
  Star, StarOff, Clock, Eye,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function msgStatusBadge(status: ContactMessage['status']) {
  if (status === 'new')     return <Badge>new</Badge>;
  if (status === 'replied') return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">replied</Badge>;
  return <Badge variant="secondary">read</Badge>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [tab, setTab] = useState<'messages' | 'testimonials'>('messages');
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

  const newCount     = messages.filter((m) => m.status === 'new').length;
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
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span>{error}</span>
          <button className="ml-2 underline shrink-0" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-8">
        <TabsList>
          <TabsTrigger value="messages" className="flex items-center gap-2 data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground p-4">
            <Mail className="w-3.5 h-3.5" />
            Messages
            {newCount > 0 && <Badge className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">{newCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="flex items-center gap-2 data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground p-4">
            <Star className="w-3.5 h-3.5" />
            Testimonials
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px] bg-amber-100 text-amber-700">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Messages tab ── */}
        <TabsContent value="messages">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((m) => (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => { setSelectedMsg(m); if (m.status === 'new') markStatus(m.id, 'read'); }}
                    >
                      <TableCell>
                        <p className="font-medium text-sm">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs text-muted-foreground truncate">{m.message}</p>
                      </TableCell>
                      <TableCell>
                        {m.interest && <Badge variant="outline" className="text-[10px]">{m.interest}</Badge>}
                      </TableCell>
                      <TableCell>{msgStatusBadge(m.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(m.created_at)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                          disabled={actioning === m.id}
                          onClick={() => deleteMessage(m.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        {/* ── Testimonials tab ── */}
        <TabsContent value="testimonials">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testimonials</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : testimonials.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">No testimonials submitted yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Testimonial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedTest(t)}
                    >
                      <TableCell>
                        <p className="font-medium text-sm">{t.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {t.age && <span className="text-xs text-muted-foreground">{t.age} yrs</span>}
                          {t.note && <Badge variant="outline" className="text-[10px]">{t.note}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs text-muted-foreground truncate">{t.message}</p>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={actioning === t.id}
                          onClick={() => toggleApprove(t)}
                          className="disabled:opacity-50"
                          title={t.approved ? 'Click to unapprove' : 'Click to approve'}
                        >
                          {t.approved
                            ? <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors">Approved</Badge>
                            : <Badge variant="secondary" className="bg-amber-100 text-amber-700 cursor-pointer hover:bg-green-50 hover:text-green-700 transition-colors">Pending</Badge>
                          }
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(t.created_at)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            disabled={actioning === t.id}
                            onClick={() => toggleApprove(t)}
                          >
                            {t.approved
                              ? <><StarOff className="w-3.5 h-3.5 mr-1" />Unapprove</>
                              : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</>
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                            disabled={actioning === t.id}
                            onClick={() => deleteTestimonial(t.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

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
                className="ml-auto text-xs text-primary underline underline-offset-2"
              >
                Reply via email
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{fmtDate(selectedTest.created_at)}</p>
              {selectedTest.approved
                ? <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-[10px]">Approved</Badge>
                : <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">Pending review</Badge>
              }
            </div>
            <Separator />
            <p className="text-sm leading-[1.85] whitespace-pre-wrap">{selectedTest.message}</p>
            <Separator />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={selectedTest.approved ? 'outline' : 'default'}
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
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs ml-auto"
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
