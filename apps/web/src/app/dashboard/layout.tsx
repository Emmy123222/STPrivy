'use client';

import { ProtectedLayout } from '@/components/layout/protected-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
