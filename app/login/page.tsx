'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/grabfabs/overview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F7F9FF]">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative overflow-hidden">
        {/* Hero image */}
        <div className="absolute inset-0">
          <img
            src="https://cdn.awakynn.com/hero2.avif"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'grayscale(0.3) brightness(0.75) contrast(1.1)' }}
          />
          {/* Amber halftone dots — solid dots over the image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(195,138,18,0.13) 1px, transparent 1px)`,
              backgroundSize: '4px 4px',
            }}
          />
          {/* Offset second layer for staggered grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(195,138,18,0.13) 1px, transparent 1px)`,
              backgroundSize: '4px 4px',
              backgroundPosition: '2px 2px',
            }}
          />
          {/* Bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0800]/90 via-[#0a0800]/20 to-transparent" />
          {/* Right edge fade into form panel */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#F7F9FF]/60" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Image src="/logo_gold.png" alt="Awakynn" width={140} height={48} className="object-contain drop-shadow-lg" />
        </div>

        {/* Quote */}
        <div className="relative z-10 max-w-xs">
          <p className="text-[#C8A86B]/80 text-sm leading-relaxed italic mb-3">
            "Awaken within. Every session, every sale, every story — managed from here."
          </p>
          <span className="text-[#C8A86B]/40 text-xs tracking-widest uppercase">Admin Portal</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-[#F7F9FF]">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Image src="/logo_gold.png" alt="Awakynn" width={110} height={38} className="object-contain" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to the Awakynn dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@awakynn.com"
                className="w-full rounded-xl border border-[#E4EBFE] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-[#2A61F9] focus:ring-2 focus:ring-[#2A61F9]/10 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E4EBFE] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-[#2A61F9] focus:ring-2 focus:ring-[#2A61F9]/10 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold tracking-wide text-white transition-all disabled:opacity-60 mt-1"
              style={{ background: 'linear-gradient(135deg, #2A61F9 0%, #1A4FD4 100%)' }}
            >
              <span className="relative z-10">{loading ? 'Signing in…' : 'Sign in'}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-300">
            Awakynn Admin · Internal use only
          </p>
        </div>
      </div>
    </div>
  );
}

