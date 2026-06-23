'use client';

import Link from 'next/link';
import { FileCheck, ShieldCheck, Zap, Fingerprint, TrendingUp, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/layout/stats-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/context/auth-context';
import { useCredentials } from '@/hooks/use-credentials';
import { useProofs } from '@/hooks/use-proofs';
import { truncateAddress } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { data: credentials = [], isLoading: credsLoading } = useCredentials();
  const { data: proofs = [], isLoading: proofsLoading } = useProofs();

  const activeCredentials = credentials.filter((c) => c.status === 'ACTIVE').length;
  const completedProofs = proofs.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Welcome back`}
        description={user ? truncateAddress(user.stellarAddress, 10) : ''}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Active Credentials"
          value={credsLoading ? '—' : activeCredentials}
          icon={FileCheck}
          description="Verified & ready to use"
        />
        <StatsCard
          title="ZK Proofs"
          value={proofsLoading ? '—' : completedProofs}
          icon={ShieldCheck}
          description="Generated proofs"
        />
        <StatsCard
          title="DID Status"
          value={user?.hasDID ? 'Active' : 'Not created'}
          icon={TrendingUp}
          description={user?.hasDID ? 'Identity anchored on Stellar' : 'Create your DID to start'}
        />
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/kyc/start">
              <Fingerprint className="mr-1.5 h-4 w-4" />
              Start KYC
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/kyc/generate">
              <Zap className="mr-1.5 h-4 w-4" />
              Generate Proof
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/credentials">
              <FileCheck className="mr-1.5 h-4 w-4" />
              View Credentials
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent credentials */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Credentials</CardTitle>
            <CardDescription>Your latest verified credentials</CardDescription>
          </CardHeader>
          <CardContent>
            {credsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : credentials.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No credentials yet.{' '}
                <Link href="/kyc/start" className="text-primary underline-offset-2 hover:underline">
                  Start KYC
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {credentials.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{c.type.join(', ')}</span>
                    <Badge
                      variant={c.status === 'ACTIVE' ? 'success' : c.status === 'REVOKED' ? 'destructive' : 'warning'}
                    >
                      {c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent proofs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Proofs</CardTitle>
            <CardDescription>Latest zero-knowledge proofs</CardDescription>
          </CardHeader>
          <CardContent>
            {proofsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : proofs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No proofs yet.{' '}
                <Link href="/kyc/generate" className="text-primary underline-offset-2 hover:underline">
                  Generate one
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {proofs.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {p.circuitId}
                    </span>
                    <Badge
                      variant={
                        p.status === 'COMPLETED' ? 'success'
                          : p.status === 'FAILED' ? 'destructive'
                          : 'warning'
                      }
                    >
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
