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
    { segment: 'inbox',    label: 'Inbox'    },
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
        <div className="max-w-screen-xl mx-auto px-6 relative flex items-center h-14">

          {/* Brand tabs — absolutely centered so profile dropdown doesn't shift them */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
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
                    'relative px-4 py-1.5 text-sm font-medium transition-colors duration-150',
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
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#F7F9FF] transition-colors"
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

        {/* ── Page navigation tabs ── */}
        <div className="max-w-screen-xl mx-auto px-6 flex items-end gap-0.5 mt-2">
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
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}