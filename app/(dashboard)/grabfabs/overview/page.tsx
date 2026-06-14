'use client';

import { useEffect, useState } from 'react';
import { orders, products, type Order, type Product } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, Package, TrendingUp, IndianRupee } from 'lucide-react';

export default function OverviewPage() {
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([orders.list(), products.list(false)])
      .then(([o, p]) => { setOrderList(o); setProductList(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const revenue = orderList
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = orderList.filter((o) => o.status === 'pending').length;

  const stats = [
    { label: 'Total Orders', value: orderList.length, icon: ShoppingBag, sub: `${pendingCount} pending` },
    { label: 'Products', value: productList.length, icon: Package, sub: `${productList.filter(p => p.is_active).length} active` },
    { label: 'Paid Revenue', value: `₹${revenue.toFixed(0)}`, icon: IndianRupee, sub: 'all time' },
    { label: 'Avg Order', value: orderList.length ? `₹${(orderList.reduce((s, o) => s + o.total, 0) / orderList.length).toFixed(0)}` : '—', icon: TrendingUp, sub: 'per order' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm">Welcome back to Awakynn admin.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : orderList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="divide-y">
              {orderList.slice(0, 8).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{o.shipping_address?.full_name ?? o.guest_email ?? 'Guest'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={o.status === 'delivered' ? 'default' : o.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {o.status}
                    </Badge>
                    <span className="font-mono font-medium">₹{o.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
