'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Loader2,
  Copy, Check, ShieldCheck, ShieldX,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ZKProof, ProofVerification } from '@/types';
import { useState } from 'react';

const CIRCUIT_LABELS: Record<string, string> = {
  'age-proof': 'Age Verification (18+)',
  'residency-proof': 'US Residency',
  'accredited-investor': 'Accredited Investor',
  'sanctions-check': 'Sanctions Clearance',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ProofDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data: proof, isLoading } = useQuery<ZKProof>({
    queryKey: ['proof', id],
    queryFn: () => api.get<ZKProof>(`/proofs/${id}`),
    retry: false,
  });

  const verify = useMutation({
    mutationFn: () => api.post<ProofVerification>('/proofs/verify', { proofId: id }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!proof) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-muted-foreground">
        Proof not found.
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/proofs"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Proofs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    COMPLETED: { icon: CheckCircle2, color: 'text-green-600', label: 'Completed', variant: 'success' as const },
    FAILED: { icon: XCircle, color: 'text-destructive', label: 'Failed', variant: 'destructive' as const },
    GENERATING: { icon: Loader2, color: 'text-primary', label: 'Generating', variant: 'warning' as const },
    PENDING: { icon: Clock, color: 'text-muted-foreground', label: 'Pending', variant: 'secondary' as const },
  }[proof.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/proofs"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
        </Button>
      </div>

      <PageHeader
        title={CIRCUIT_LABELS[proof.circuitId] ?? proof.circuitId}
        description="Zero-knowledge proof details"
      />

      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StatusIcon className={cn('h-5 w-5', statusConfig.color, proof.status === 'GENERATING' && 'animate-spin')} />
            {statusConfig.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Proof ID</span>
            <span className="flex items-center font-mono text-xs">
              {proof.id.slice(0, 16)}…
              <CopyButton text={proof.id} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Circuit</span>
            <Badge variant="secondary">{proof.circuitId}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={statusConfig.variant}>{proof.status}</Badge>
          </div>
          {proof.generatedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Generated</span>
              <span>{new Date(proof.generatedAt).toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Credential ID</span>
            <span className="flex items-center font-mono text-xs">
              {proof.credentialId.slice(0, 16)}…
              <CopyButton text={proof.credentialId} />
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Artifact card */}
      {proof.artifact && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proof Artifact</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed break-all whitespace-pre-wrap">
              {JSON.stringify(proof.artifact, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Verify on-chain */}
      {proof.status === 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On-Chain Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {verify.isSuccess && verify.data ? (
              <div className={cn(
                'flex items-center gap-2 rounded-md p-3 text-sm',
                verify.data.result
                  ? 'bg-green-50 text-green-800'
                  : 'bg-destructive/10 text-destructive',
              )}>
                {verify.data.result
                  ? <ShieldCheck className="h-4 w-4 shrink-0" />
                  : <ShieldX className="h-4 w-4 shrink-0" />}
                {verify.data.result ? 'Proof verified successfully.' : 'Proof verification failed.'}
                {verify.data.onChainTxHash && (
                  <span className="ml-auto font-mono text-xs">{verify.data.onChainTxHash.slice(0, 12)}…</span>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Submit this proof to the Soroban verifier contract and record the result on-chain.
                </p>
                {verify.isError && (
                  <p className="text-sm text-destructive">{(verify.error as Error).message}</p>
                )}
                <Button
                  onClick={() => verify.mutate()}
                  disabled={verify.isPending}
                  className="w-full"
                >
                  {verify.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
                  ) : (
                    <><ShieldCheck className="mr-2 h-4 w-4" />Verify On-Chain</>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
