'use client';

import { useEffect, useState } from 'react';
import { serviceBookings, type ServiceBooking, type ManualBookingPayload } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'completed') return 'default';
  if (s === 'cancelled') return 'destructive';
  if (s === 'confirmed') return 'secondary';
  return 'outline';
};

const paymentVariant = (s: string): 'default' | 'outline' | 'destructive' => {
  if (s === 'paid') return 'default';
  if (s === 'refunded') return 'destructive';
  return 'outline';
};

// ── Add Cash Booking form ─────────────────────────────────────────────────────

const SERVICES = [
  { slug: 'yoga-monthly', name: 'Yoga Monthly' },
  { slug: 'meditation-monthly', name: 'Meditation Monthly' },
  { slug: 'pilates-monthly', name: 'Pilates Monthly' },
  { slug: 'wellness-monthly', name: 'Wellness Monthly' },
];

const emptyForm: ManualBookingPayload = {
  service_slug: '',
  service_name: '',
  amount: 0,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  is_subscription: true,
  notes: '',
};

function AddCashBookingDialog({ onAdded }: { onAdded: (b: ServiceBooking) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ManualBookingPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof ManualBookingPayload, value: string | number | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.service_slug || !form.customer_name || !form.customer_phone) {
      setError('Service, customer name, and phone are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const booking = await serviceBookings.createManual(form);
      onAdded(booking);
      setOpen(false);
      setForm(emptyForm);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ Add Cash Booking</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Cash Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Service</label>
            <Select
              value={form.service_slug}
              onValueChange={(v) => {
                if (!v) return;
                const svc = SERVICES.find((s) => s.slug === v);
                set('service_slug', v);
                if (svc) set('service_name', svc.name);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
                ))}
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {form.service_slug === 'custom' && (
              <Input
                className="mt-1"
                placeholder="Service name"
                value={form.service_name}
                onChange={(e) => set('service_name', e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Customer Name</label>
              <Input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} placeholder="+91…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email (optional)</label>
              <Input value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => set('amount', Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Paid for June 2026" />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is-sub"
              type="checkbox"
              checked={form.is_subscription}
              onChange={(e) => set('is_subscription', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is-sub" className="text-sm">Monthly subscription</label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Cash Tracker tab ──────────────────────────────────────────────────────────

function CashTracker({
  allBookings,
  onUpdate,
}: {
  allBookings: ServiceBooking[];
  onUpdate: (updated: ServiceBooking) => void;
}) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  const cashBookings = allBookings.filter((b) => b.payment_method === 'cash');

  const displayed = cashBookings.filter((b) => {
    if (filterPaid === 'paid') return b.payment_status === 'paid';
    if (filterPaid === 'unpaid') return b.payment_status !== 'paid';
    return true;
  });

  const paidCount = cashBookings.filter((b) => b.payment_status === 'paid').length;
  const unpaidCount = cashBookings.filter((b) => b.payment_status !== 'paid').length;
  const totalCollected = cashBookings
    .filter((b) => b.payment_status === 'paid')
    .reduce((s, b) => s + b.amount, 0);
  const totalPending = cashBookings
    .filter((b) => b.payment_status !== 'paid')
    .reduce((s, b) => s + b.amount, 0);

  async function togglePaid(booking: ServiceBooking) {
    setToggling(booking.id);
    try {
      const newStatus = booking.payment_status === 'paid' ? 'unpaid' : 'paid';
      const updated = await serviceBookings.updatePaymentStatus(booking.id, newStatus, 'cash');
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total cash</p>
            <p className="text-2xl font-bold">{cashBookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
            <p className="text-2xl font-bold text-green-600">{paidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Unpaid</p>
            <p className="text-2xl font-bold text-red-500">{unpaidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Collected</p>
            <p className="text-2xl font-bold">₹{totalCollected}</p>
            {totalPending > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">₹{totalPending} pending</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter + table */}
      <Card className="pb-0">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Cash Bookings</CardTitle>
          <div className="flex gap-2">
            {(['all', 'unpaid', 'paid'] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={filterPaid === v ? 'default' : 'outline'}
                onClick={() => setFilterPaid(v)}
                className="capitalize"
              >
                {v}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((b) => (
                  <TableRow key={b.id} className={b.payment_status !== 'paid' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                    <TableCell>
                      <p className="font-medium text-sm">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                      {b.customer_email && (
                        <p className="text-xs text-muted-foreground">{b.customer_email}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{b.service_name}</p>
                      <p className="text-xs text-muted-foreground">{b.service_slug}</p>
                    </TableCell>
                    <TableCell className="font-mono font-bold">₹{b.amount}</TableCell>
                    <TableCell>
                      {b.is_subscription ? (
                        <Badge variant="secondary">Monthly</Badge>
                      ) : (
                        <Badge variant="outline">One-time</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {b.notes || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={b.payment_status === 'paid' ? 'default' : 'outline'}
                        className={b.payment_status === 'paid' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-red-300 text-red-600 hover:bg-red-50'}
                        disabled={toggling === b.id}
                        onClick={() => togglePaid(b)}
                      >
                        {toggling === b.id ? '…' : b.payment_status === 'paid' ? '✓ Paid' : 'Mark Paid'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {displayed.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No cash bookings{filterPaid !== 'all' ? ` with status "${filterPaid}"` : ''}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [bookingList, setBookingList] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    serviceBookings
      .list(filter === 'all' ? undefined : filter)
      .then(setBookingList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  function handleUpdate(updated: ServiceBooking) {
    setBookingList((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  async function changeStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const updated = await serviceBookings.updateStatus(id, status);
      handleUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  }

  const totalRevenue = bookingList
    .filter((b) => b.payment_status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const cashUnpaidCount = bookingList.filter(
    (b) => b.payment_method === 'cash' && b.payment_status !== 'paid',
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Service Bookings</h1>
          <p className="text-muted-foreground text-sm">
            {bookingList.length} booking{bookingList.length !== 1 ? 's' : ''}
            {totalRevenue > 0 && ` · ₹${totalRevenue} collected`}
            {cashUnpaidCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {cashUnpaidCount} cash unpaid</span>
            )}
          </p>
        </div>
        <AddCashBookingDialog onAdded={(b) => setBookingList((prev) => [b, ...prev])} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="p-4 cursor-pointer data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground">All Bookings</TabsTrigger>
          <TabsTrigger value="cash" className="relative p-4 cursor-pointer data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground">
            Cash Tracker
            {cashUnpaidCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {cashUnpaidCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── All Bookings tab ── */}
        <TabsContent value="all" className="mt-4 sm:-mt-8 space-y-4">
          <div className="flex justify-end">
            <Select value={filter} onValueChange={(v) => { if (v) setFilter(v); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Bookings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Update</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingList.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{b.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{b.customer_email}</p>
                            <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{b.service_name}</p>
                            <p className="text-xs text-muted-foreground">{b.service_slug}</p>
                          </TableCell>
                          <TableCell className="font-mono font-medium">₹{b.amount}</TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1.5">
                              <Badge
                                variant={b.payment_method === 'cash' ? 'secondary' : 'outline'}
                                className={b.payment_method === 'cash' ? 'bg-amber-100 text-amber-800 border-amber-300' : ''}
                              >
                                {b.payment_method === 'cash' ? '💵 Cash' : '💳 Online'}
                              </Badge>
                              <Select
                                value={b.payment_status}
                                onValueChange={(val) => {
                                  if (val) {
                                    setUpdating(b.id);
                                    serviceBookings
                                      .updatePaymentStatus(b.id, val as 'unpaid' | 'paid' | 'refunded')
                                      .then(handleUpdate)
                                      .catch(console.error)
                                      .finally(() => setUpdating(null));
                                  }
                                }}
                                disabled={updating === b.id}
                              >
                                <SelectTrigger className={`h-7 text-xs w-24 ${b.payment_status === 'paid' ? 'border-green-400 text-green-700' : b.payment_status === 'refunded' ? 'border-red-400 text-red-600' : 'border-orange-300 text-orange-600'}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unpaid">Unpaid</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(b.created_at).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={b.status}
                              onValueChange={(val) => { if (val) changeStatus(b.id, val); }}
                              disabled={updating === b.id}
                            >
                              <SelectTrigger className="h-7 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                      {bookingList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No bookings found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Cash Tracker tab ── */}
        <TabsContent value="cash" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <CashTracker allBookings={bookingList} onUpdate={handleUpdate} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
