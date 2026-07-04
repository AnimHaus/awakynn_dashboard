'use client';

import { useEffect, useState } from 'react';
import { serviceBookings, type ServiceBooking } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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

  async function changeStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const updated = await serviceBookings.updateStatus(id, status);
      setBookingList((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  }

  const totalRevenue = bookingList
    .filter((b) => b.payment_status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Bookings</h1>
          <p className="text-muted-foreground text-sm">
            {bookingList.length} booking{bookingList.length !== 1 ? 's' : ''}
            {totalRevenue > 0 && ` · ₹${totalRevenue} collected`}
          </p>
        </div>
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
                        <Badge variant={paymentVariant(b.payment_status)}>
                          {b.payment_status}
                        </Badge>
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
    </div>
  );
}
