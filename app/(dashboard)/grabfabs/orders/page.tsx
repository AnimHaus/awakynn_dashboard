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
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

const PAGE_SIZE = 20;
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'delivered') return 'default';
  if (s === 'cancelled') return 'destructive';
  if (s === 'shipped') return 'secondary';
  return 'outline';
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function OrderDetailPanel({ order }: { order: Order }) {
  const addr = order.shipping_address;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-muted/40 text-sm">
      {/* Items */}
      <div className="md:col-span-2 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Items</p>
        <div className="rounded-lg border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left px-3 py-2 font-medium">Product</th>
                <th className="text-left px-3 py-2 font-medium">SKU</th>
                <th className="text-right px-3 py-2 font-medium">Qty</th>
                <th className="text-right px-3 py-2 font-medium">Unit</th>
                <th className="text-right px-3 py-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.sku_label}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right font-mono">₹{item.unit_price}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">₹{item.unit_price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-end gap-1 pt-1 pr-1">
          <span className="text-xs text-muted-foreground">Subtotal: <span className="font-mono font-medium text-foreground">₹{order.subtotal}</span></span>
          <span className="text-xs text-muted-foreground">
            Shipping: <span className="font-mono font-medium text-foreground">
              {order.shipping_fee === 0 ? 'Free' : `₹${order.shipping_fee}`}
            </span>
          </span>
          <span className="text-sm font-bold">Total: <span className="font-mono">₹{order.total}</span></span>
        </div>
      </div>

      {/* Right panel: address + meta */}
      <div className="space-y-4">
        {addr?.full_name && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Shipping Address</p>
            <div className="rounded-lg border bg-background p-3 space-y-0.5 text-sm">
              <p className="font-medium">{addr.full_name}</p>
              {addr.phone && <p className="text-muted-foreground">{addr.phone}</p>}
              <p className="text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
              <p className="text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
              {addr.country && <p className="text-muted-foreground">{addr.country}</p>}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Order Info</p>
          <div className="rounded-lg border bg-background p-3 space-y-1.5 text-xs">
            {order.razorpay_order_id && (
              <div className="flex justify-between gap-2 items-center">
                <span className="text-muted-foreground">Order #</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono truncate max-w-[120px]" title={order.razorpay_order_id}>{order.razorpay_order_id}</span>
                  <CopyButton value={order.razorpay_order_id} />
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Internal ID</span>
              <span className="font-mono truncate max-w-[120px] text-muted-foreground" title={order.id}>{order.id}</span>
            </div>
            {order.guest_email && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate max-w-[140px]" title={order.guest_email}>{order.guest_email}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Placed</span>
              <span>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(order.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
            {order.notes && (
              <div className="pt-1 border-t">
                <span className="text-muted-foreground block mb-0.5">Notes</span>
                <span>{order.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({
  order,
  updating,
  onStatusChange,
}: {
  order: Order;
  updating: string | null;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell className="w-8 pl-4 pr-2">
          {open
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </TableCell>
        <TableCell>
          <p className="font-medium text-sm">{order.shipping_address?.full_name ?? 'Guest'}</p>
          <p className="text-xs text-muted-foreground">{order.guest_email ?? order.user_id?.slice(0, 8)}</p>
        </TableCell>
        <TableCell>
          <p className="text-sm">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[160px]">
            {order.items.map((i) => i.name).join(', ')}
          </p>
        </TableCell>
        <TableCell className="font-mono font-medium">₹{order.total}</TableCell>
        <TableCell>
          <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
            {order.payment_status}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString('en-IN')}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Select
            value={order.status}
            onValueChange={(val) => { if (val) onStatusChange(order.id, val); }}
            disabled={updating === order.id}
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
      {open && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="p-0 border-b">
            <OrderDetailPanel order={order} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function OrdersPage() {
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    const skip = (page - 1) * PAGE_SIZE;
    orders
      .list(filter === 'all' ? undefined : filter, skip, PAGE_SIZE)
      .then((data) => {
        setOrderList(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, page]);

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
          <p className="text-muted-foreground text-sm">
            Page {page} · {orderList.length} orders shown
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
                    <TableHead className="w-8" />
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
                    <OrderRow
                      key={o.id}
                      order={o}
                      updating={updating}
                      onStatusChange={changeStatus}
                    />
                  ))}
                  {orderList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
