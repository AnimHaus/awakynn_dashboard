'use client';

import { useEffect, useState, useCallback } from 'react';
import { users, type UserListItem } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Search, Users } from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const capitalise = (s: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') : '—';

export default function MembersPage() {
  const [members, setMembers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await users.list(0, 200);
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = members.filter((m) => {
    if (m.is_admin) return false;
    const q = query.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[#2A61F9]" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Members</h1>
            <p className="text-xs text-gray-500">
              {loading ? 'Loading…' : `${members.filter((m) => !m.is_admin).length} registered member${members.filter((m) => !m.is_admin).length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 border-0 shadow-none focus-visible:ring-0 pl-0 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">
              {query ? 'No members match your search.' : 'No registered members yet.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">Age</TableHead>
                  <TableHead className="hidden lg:table-cell">Gender</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelected(m)}
                  >
                    <TableCell className="font-medium">{m.full_name || '—'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{m.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                      {m.phone || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-600">
                      {m.age ?? '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-600">
                      {capitalise(m.gender)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                      {fmtDate(m.created_at)}
                    </TableCell>
                    <TableCell>
                      {m.is_active ? (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.is_admin ? (
                        <Badge className="text-xs bg-[#2A61F9]">Admin</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Member</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Showing {filtered.length} of {members.length} members
        </p>
      )}

      {/* Member detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.full_name || 'Member Details'}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="Email" value={selected.email} />
              <Row label="Phone" value={selected.phone || '—'} />
              <Row label="Age" value={selected.age != null ? String(selected.age) : '—'} />
              <Row label="Gender" value={capitalise(selected.gender)} />
              <Row label="Joined" value={fmtDate(selected.created_at)} />
              <Row
                label="Status"
                value={
                  <Badge variant={selected.is_active ? 'outline' : 'destructive'} className={`text-xs ${selected.is_active ? 'text-green-700 border-green-300 bg-green-50' : ''}`}>
                    {selected.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                }
              />
              <Row
                label="Role"
                value={
                  selected.is_admin
                    ? <Badge className="text-xs bg-[#2A61F9]">Admin</Badge>
                    : <Badge variant="secondary" className="text-xs">Member</Badge>
                }
              />
              <div className="pt-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Medical History</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selected.medical_history || 'None provided'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-28 shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider pt-0.5">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}