'use client';

import { ShieldCheck, ExternalLink, RefreshCw, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useProofs } from '@/hooks/use-proofs';
import { cn } from '@/lib/utils';
import type { ZKProof, ProofStatus } from '@/types';
import Link from 'next/link';

function statusIcon(status: ProofStatus) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'FAILED') return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === 'GENERATING') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function statusBadge(status: ProofStatus) {
  const map: Record<ProofStatus, 'success' | 'destructive' | 'warning' | 'secondary'> = {
    COMPLETED: 'success', FAILED: 'destructive', GENERATING: 'warning', PENDING: 'secondary',
  };
  return map[status];
}

const CIRCUIT_LABELS: Record<string, string> = {
  'age-proof': 'Age Verification (18+)',
  'residency-proof': 'US Residency',
  'accredited-investor': 'Accredited Investor',
  'sanctions-check': 'Sanctions Clearance',
};

function ProofRow({ proof }: { proof: ZKProof }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        {statusIcon(proof.status)}
        <div>
          <p className="font-medium text-sm">{CIRCUIT_LABELS[proof.circuitId] ?? proof.circuitId}</p>
          <p className="text-xs text-muted-foreground">
            {proof.generatedAt
              ? `Generated ${new Date(proof.generatedAt).toLocaleString()}`
              : 'Not yet generated'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusBadge(proof.status)}>{proof.status}</Badge>
        {proof.artifact && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View proof">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ProofList({ proofs }: { proofs: ZKProof[] }) {
  if (proofs.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No proofs"
        description="No proofs in this category. Generate a zero-knowledge proof to share verified claims."
        action={
          <Button asChild size="sm">
            <Link href="/kyc/generate">Generate a Proof</Link>
          </Button>
        }
      />
    );
  }
  return <div className="space-y-3">{proofs.map((p) => <ProofRow key={p.id} proof={p} />)}</div>;
}

export default function ProofsPage() {
  const { data: proofs = [], isLoading, refetch } = useProofs();

  const completed = proofs.filter((p) => p.status === 'COMPLETED');
  const pending = proofs.filter((p) => ['PENDING', 'GENERATING'].includes(p.status));
  const failed = proofs.filter((p) => p.status === 'FAILED');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My Proofs"
        description="Zero-knowledge proofs generated from your credentials"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn('mr-1.5 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <Tabs defaultValue="completed">
          <TabsList className="mb-4">
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="pending">In Progress ({pending.length})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="completed"><ProofList proofs={completed} /></TabsContent>
          <TabsContent value="pending"><ProofList proofs={pending} /></TabsContent>
          <TabsContent value="failed"><ProofList proofs={failed} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
