'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useAuthContext } from '@/context/auth-context';

export function Navbar() {
  const { token } = useAuthContext();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link
          href={token ? '/dashboard' : '/'}
          className="flex items-center gap-2 font-semibold"
        >
          <ShieldCheck className="h-5 w-5 text-primary" />
          STPrivy
        </Link>

        {!token && (
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/status" className="hover:text-foreground transition-colors">
              Status
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
