'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { WalletConnect } from '@/components/wallet-connect';

export default function ConnectPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: '#000000' }}
    >
      {/* Logo */}
      <Link href="/" className="mb-10 flex items-center gap-2 no-underline">
        <ShieldCheck className="h-5 w-5" style={{ color: '#7F77DD' }} />
        <span
          style={{
            fontFamily: 'var(--font-space-mono), "Space Mono", monospace',
            fontSize: 20,
            fontWeight: 700,
            color: '#F1EFE8',
            letterSpacing: '1px',
          }}
        >
          zkKYC
        </span>
      </Link>

      {/* Heading */}
      <div className="mb-8 text-center">
        <h1
          style={{
            fontFamily: 'var(--font-space-mono), "Space Mono", monospace',
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 700,
            color: '#F1EFE8',
            marginBottom: 12,
            letterSpacing: '-0.5px',
          }}
        >
          Connect your wallet
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-space-mono), "Space Mono", monospace',
            fontSize: 14,
            color: '#B4B2A9',
            lineHeight: 1.6,
            maxWidth: 380,
          }}
        >
          Sign in with your Stellar wallet to access the zkKYC platform.
          Your private data never leaves your device.
        </p>
      </div>

      {/* Wallet connect card */}
      <div className="w-full max-w-md">
        <WalletConnect />
      </div>

      {/* Back link */}
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-space-mono), "Space Mono", monospace',
          fontSize: 13,
          color: '#888780',
          marginTop: 32,
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#7F77DD')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#888780')}
      >
        ← Back to home
      </Link>
    </div>
  );
}
