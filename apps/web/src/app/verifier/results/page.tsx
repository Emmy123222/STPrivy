'use client';

import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProofVerifications } from '@/hooks/use-proofs';

export default function VerificationResultsPage() {
  const { data: verifications = [], isLoading, refetch } = useProofVerifications();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Verification Results"
        description="Proof verification history"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : verifications.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No results yet"
          description="Verification results will appear here once users respond to proof requests."
        />
      ) : (
        <div className="space-y-2">
          {verifications.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {v.result
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                <div>
                  <p className="text-sm font-medium font-mono">{v.proofId.slice(0, 20)}…</p>
                  <p className="text-xs text-muted-foreground">
                    Verifier: <span className="font-mono">{v.verifierDID.slice(0, 24)}…</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.verifiedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={v.result ? 'success' : 'destructive'}>
                  {v.result ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
