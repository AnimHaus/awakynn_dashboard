'use client';

import { useEffect, useState } from 'react';
import { orders, type Order } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'delivered') return 'default';
  if (s === 'cancelled') return 'destructive';
  if (s === 'shipped') return 'secondary';
  return 'outline';
};

export default function OrdersPage() {
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    orders.list(filter === 'all' ? undefined : filter)
      .then(setOrderList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  async function changeStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const updated = await orders.updateStatus(id, status);
      setOrderList((prev) => prev.map((o) => o.id === id ? updated : o));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">{orderList.length} orders</p>
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
        <CardHeader><CardTitle className="text-base">All Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderList.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{o.shipping_address?.full_name ?? 'Guest'}</p>
                        <p className="text-xs text-muted-foreground">{o.guest_email ?? o.user_id?.slice(0, 8)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {o.items.map((i) => i.name).join(', ')}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono font-medium">₹{o.total}</TableCell>
                      <TableCell>
                        <Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'}>
                          {o.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.status)}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={o.status}
                          onValueChange={(val) => { if (val) changeStatus(o.id, val); }}
                          disabled={updating === o.id}
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
                  {orderList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No orders found.
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
