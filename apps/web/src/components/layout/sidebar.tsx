'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileCheck, ShieldCheck, User, Fingerprint, Zap,
  Building2, FilePlus, Files, Settings, Search, PlusCircle, CheckSquare,
  BarChart3, Users, ScrollText, Sliders, LogOut, ChevronDown, ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/context/auth-context';
import { truncateAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: string[]; // undefined = all authenticated users
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'My Account',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/credentials', label: 'My Credentials', icon: FileCheck },
      { href: '/proofs', label: 'My Proofs', icon: ShieldCheck },
      { href: '/profile', label: 'Profile & DID', icon: User },
    ],
  },
  {
    title: 'Verification',
    items: [
      { href: '/kyc/start', label: 'Start KYC', icon: Fingerprint },
      { href: '/kyc/generate', label: 'Generate Proof', icon: Zap },
      { href: '/kyc/respond', label: 'Proof Requests', icon: MessageSquare },
    ],
  },
  {
    title: 'Issuer',
    roles: ['ISSUER', 'ADMIN'],
    items: [
      { href: '/issuer/dashboard', label: 'Issuer Dashboard', icon: Building2 },
      { href: '/issuer/issue', label: 'Issue Credential', icon: FilePlus },
      { href: '/issuer/credentials', label: 'Manage Credentials', icon: Files },
      { href: '/issuer/settings', label: 'Issuer Settings', icon: Settings },
    ],
  },
  {
    title: 'Verifier',
    roles: ['ISSUER', 'ADMIN'],
    items: [
      { href: '/verifier/dashboard', label: 'Verifier Dashboard', icon: Search },
      { href: '/verifier/create-request', label: 'Create Request', icon: PlusCircle },
      { href: '/verifier/results', label: 'Results', icon: CheckSquare },
    ],
  },
  {
    title: 'Admin',
    roles: ['ADMIN'],
    items: [
      { href: '/admin/dashboard', label: 'Admin Dashboard', icon: BarChart3 },
      { href: '/admin/issuers', label: 'Issuer Registry', icon: Users },
      { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
      { href: '/admin/settings', label: 'System Settings', icon: Sliders },
    ],
  },
];

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function NavSection({ title, items, roles }: NavSection) {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(true);

  if (roles && user && !roles.includes(user.role)) return null;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {title}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthContext();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
    onClose?.();
  };

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-background">
      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_SECTIONS.map((section) => (
          <NavSection key={section.title} {...section} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t p-3">
        {user && (
          <div className="mb-2 rounded-md bg-muted px-3 py-2">
            <p className="text-xs font-medium">{user.role}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {truncateAddress(user.stellarAddress, 8)}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
