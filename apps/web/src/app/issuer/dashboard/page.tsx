'use client';

import Link from 'next/link';
import { FilePlus, Files, FileCheck, XCircle, Clock, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/layout/stats-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIssuerCredentials } from '@/hooks/use-credentials';

export default function IssuerDashboardPage() {
  const { data: credentials = [], isLoading } = useIssuerCredentials();

  const active = credentials.filter((c) => c.status === 'ACTIVE').length;
  const revoked = credentials.filter((c) => c.status === 'REVOKED').length;
  const expired = credentials.filter((c) => c.status === 'EXPIRED').length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Issuer Dashboard"
        description="Overview of credentials you have issued"
        action={
          <Button asChild>
            <Link href="/issuer/issue">
              <FilePlus className="mr-2 h-4 w-4" />
              Issue Credential
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Total Issued" value={isLoading ? '—' : credentials.length} icon={Files} description="All time" />
        <StatsCard title="Active" value={isLoading ? '—' : active} icon={FileCheck} description="Currently valid" />
        <StatsCard title="Revoked" value={isLoading ? '—' : revoked} icon={XCircle} description="Invalidated credentials" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Issuances</CardTitle>
          <CardDescription>Latest credentials issued by your organisation</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : credentials.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Files className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No credentials issued yet.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/issuer/issue">Issue your first credential</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {credentials.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{c.type.join(', ')}</p>
                    <p className="font-mono text-xs text-muted-foreground truncate max-w-xs">{c.subjectDID}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.issuedAt).toLocaleDateString()}
                    </span>
                    <Badge variant={c.status === 'ACTIVE' ? 'success' : c.status === 'REVOKED' ? 'destructive' : 'warning'}>
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {credentials.length > 5 && (
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/issuer/credentials">View all {credentials.length} credentials</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
