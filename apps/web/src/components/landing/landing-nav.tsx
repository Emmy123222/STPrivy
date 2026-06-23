'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ShieldCheck } from 'lucide-react';

const FONT = 'var(--font-space-mono), "Space Mono", monospace';

const C = {
  pageBg: '#000000',
  purple: '#7F77DD',
  textPrimary: '#F1EFE8',
  textSecondary: '#B4B2A9',
};

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Developers', href: '#for-developers' },
  { label: 'Issuers', href: '#issuers' },
  { label: 'Docs', href: '/docs' },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: C.pageBg,
        borderBottom: '1px solid rgba(83,74,183,0.20)',
      }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6" style={{ height: 72 }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <ShieldCheck className="h-5 w-5" style={{ color: C.purple }} />
          <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '1px' }}>
            zkKYC
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 400,
                color: C.textSecondary,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.purple)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textSecondary)}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:block">
          <Link href="/connect">
            <button
              style={{
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                padding: '10px 22px',
                borderRadius: 4,
                border: `1.5px solid ${C.textPrimary}`,
                background: 'transparent',
                color: C.textPrimary,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(241,239,232,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              Get Started
            </button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-1"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          style={{ color: C.textPrimary, background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          style={{
            background: C.pageBg,
            borderTop: '1px solid rgba(83,74,183,0.15)',
          }}
        >
          <div className="flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 400,
                  color: C.textSecondary,
                  textDecoration: 'none',
                  padding: '10px 0',
                  display: 'block',
                }}
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
            <Link href="/connect" onClick={() => setOpen(false)}>
              <button
                style={{
                  fontFamily: FONT,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  padding: '12px 22px',
                  borderRadius: 4,
                  border: `1.5px solid ${C.textPrimary}`,
                  background: 'transparent',
                  color: C.textPrimary,
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: 8,
                }}
              >
                Get Started
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
