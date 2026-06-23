'use client';

import Link from 'next/link';
import { Search, PlusCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/layout/stats-card';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProofVerifications } from '@/hooks/use-proofs';

export default function VerifierDashboardPage() {
  const { data: verifications = [], isLoading } = useProofVerifications();

  const passed = verifications.filter((v) => v.result).length;
  const failed = verifications.filter((v) => !v.result).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Verifier Dashboard"
        description="Proof requests and verification results"
        action={
          <Button asChild>
            <Link href="/verifier/create-request">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Request
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Total Requests" value={verifications.length} icon={Search} description="All time" />
        <StatsCard title="Verified" value={passed} icon={CheckCircle2} description="Successful verifications" />
        <StatsCard title="Failed" value={failed} icon={XCircle} description="Failed or rejected" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Verifications</CardTitle>
          <CardDescription>Latest proof verification results</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : verifications.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No verifications yet"
              description="Create a proof request to start verifying user credentials."
              action={
                <Button asChild size="sm">
                  <Link href="/verifier/create-request">Create Proof Request</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {verifications.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    {v.result
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <XCircle className="h-4 w-4 text-destructive" />}
                    <div>
                      <p className="font-mono text-xs">{v.proofId.slice(0, 16)}…</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.verifiedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={v.result ? 'success' : 'destructive'}>
                    {v.result ? 'PASSED' : 'FAILED'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
