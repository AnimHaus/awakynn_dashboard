'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { LogOut, Users, ChevronDown } from 'lucide-react';

const BRANDS = [
  { label: 'Awakynn',      slug: 'awakynn',  active: true  },
  { label: 'Grabfabs',     slug: 'grabfabs', active: true  },
  { label: 'FÉSTIQ',       slug: 'festiq',   active: false },
  { label: 'ÉSTRÁ Ritual', slug: 'estra',    active: false },
];

const NAV_BY_BRAND: Record<string, { segment: string; label: string }[]> = {
  grabfabs: [
    { segment: 'overview', label: 'Overview' },
    { segment: 'orders',   label: 'Orders'   },
    { segment: 'products', label: 'Products' },
  ],
  awakynn: [
    { segment: 'classes',  label: 'Classes'  },
    { segment: 'events',   label: 'Events'   },
    { segment: 'gallery',  label: 'Gallery'  },
    { segment: 'inbox',    label: 'Inbox'    },
    { segment: 'bookings', label: 'Bookings' },
  ],
};

const DEFAULT_NAV = NAV_BY_BRAND.grabfabs;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Derive active brand slug from pathname e.g. /grabfabs/overview → grabfabs
  const activeBrand = BRANDS.find((b) => pathname.startsWith(`/${b.slug}`))?.slug ?? 'grabfabs';
  const NAV = NAV_BY_BRAND[activeBrand] ?? DEFAULT_NAV;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (!user) return null;

  // Initials from email
  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'AD';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FF]">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-[#E4EBFE] sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 gap-2">

          {/* Brand tabs */}
          <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {BRANDS.map((brand) => {
              const isActive = activeBrand === brand.slug;
              return (
                <button
                  key={brand.label}
                  disabled={!brand.active}
                  onClick={() => {
                    if (!brand.active) return;
                    const defaultSeg = (NAV_BY_BRAND[brand.slug] ?? DEFAULT_NAV)[0].segment;
                    router.push(`/${brand.slug}/${defaultSeg}`);
                  }}
                  className={[
                    'relative shrink-0 px-3 sm:px-4 py-1.5 text-sm font-medium transition-colors duration-150',
                    brand.active
                      ? isActive ? 'text-[#2A61F9] cursor-pointer' : 'text-gray-500 hover:text-gray-700 cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed select-none',
                  ].join(' ')}
                >
                  {brand.label}
                  {isActive && (
                    <span
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        bottom: -4,
                        height: 8,
                        background: 'linear-gradient(to bottom, rgba(42,97,249,0.15) 0%, transparent 100%)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Profile dropdown */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-[#F7F9FF] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#EEF3FF] text-[#2A61F9] text-xs font-bold flex items-center justify-center select-none">
                {initials}
              </div>
              <span className="text-sm text-gray-700 hidden sm:block max-w-[140px] truncate">{user.email}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[#E4EBFE] rounded-xl shadow-lg shadow-black/5 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-[#F0F4FF] mb-1">
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <Link
                  href={`/${activeBrand}/users`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-[#F7F9FF] transition-colors"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  Users
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Page navigation tabs (desktop only) ── */}
        <div className="hidden sm:flex max-w-screen-xl mx-auto px-3 sm:px-6 items-end gap-0.5 mt-2 overflow-x-auto no-scrollbar">
          {NAV.map((item) => {
            const href = `/${activeBrand}/${item.segment}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={item.segment}
                href={href}
                style={active ? {
                  background: '#F7F9FF',
                  border: '1px solid #E4EBFE',
                  borderBottom: '1px solid #F7F9FF',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: '-1px',
                  color: '#2A61F9',
                  fontWeight: 600,
                  padding: '8px 18px',
                  fontSize: '14px',
                  position: 'relative',
                  zIndex: 1,
                } : {
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderBottom: '1px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: '-1px',
                  color: '#6B7280',
                  fontWeight: 500,
                  padding: '8px 18px',
                  fontSize: '14px',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E4EBFE] flex">
        {NAV.map((item) => {
          const href = `/${activeBrand}/${item.segment}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={item.segment}
              href={href}
              className={[
                'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[11px] font-medium transition-colors',
                active ? 'text-[#2A61F9]' : 'text-gray-400',
              ].join(' ')}
            >
              <BottomNavIcon segment={item.segment} active={active} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function BottomNavIcon({ segment, active }: { segment: string; active: boolean }) {
  const cls = `w-5 h-5 ${active ? 'text-[#2A61F9]' : 'text-gray-400'}`;
  if (segment === 'overview') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
  if (segment === 'orders') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
  if (segment === 'products') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
  if (segment === 'classes') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  if (segment === 'events') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;
  if (segment === 'gallery') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  if (segment === 'inbox') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;
  if (segment === 'bookings') return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  return <svg className={cls} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /></svg>;
}