'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, ShieldCheck, CheckCircle2, XCircle, Loader2, Clock, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useProofs } from '@/hooks/use-proofs';
import type { ProofRequest, ZKProof, CircuitId } from '@/types';

const CIRCUIT_LABELS: Record<string, string> = {
  'age-proof': 'Age Verification (18+)',
  'residency-proof': 'US Residency',
  'accredited-investor': 'Accredited Investor',
  'sanctions-check': 'Sanctions Clearance',
};

function RequestCard({ req, proofs }: { req: ProofRequest; proofs: ZKProof[] }) {
  const qc = useQueryClient();
  const respond = useMutation({
    mutationFn: (vars: { proofId: string; decision: 'APPROVED' | 'REJECTED' }) =>
      api.post<ProofRequest>(`/proofs/requests/${req.id}/respond`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proof-requests'] }),
  });

  const matchingProofs = proofs.filter(
    (p) => p.status === 'COMPLETED' && p.circuitId === req.circuitId,
  );

  const selectedProofId = matchingProofs[0]?.id ?? '';
  const [chosenProofId, setChosenProofId] = React.useState(selectedProofId);

  const statusVariant =
    req.status === 'APPROVED' ? 'success' :
    req.status === 'REJECTED' ? 'destructive' :
    req.status === 'EXPIRED' ? 'secondary' : 'warning';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{CIRCUIT_LABELS[req.circuitId] ?? req.circuitId}</CardTitle>
            <CardDescription className="mt-0.5 font-mono text-xs truncate max-w-xs">{req.verifierDID}</CardDescription>
          </div>
          <Badge variant={statusVariant}>{req.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium">Requested proof:</span>
            <span>{CIRCUIT_LABELS[req.circuitId]}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>Purpose:</strong> {req.purpose}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Expires {new Date(req.expiresAt).toLocaleString()}
          </div>
        </div>

        {req.status === 'PENDING' && (
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Approving shares a zero-knowledge proof with the requester — your raw personal data is never exposed.
          </div>
        )}

        {req.status === 'PENDING' && matchingProofs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Select proof to share</p>
            <Select value={chosenProofId} onChange={(e) => setChosenProofId(e.target.value)}>
              {matchingProofs.map((p) => (
                <option key={p.id} value={p.id}>
                  {CIRCUIT_LABELS[p.circuitId]} · {p.generatedAt ? new Date(p.generatedAt).toLocaleDateString() : 'recent'}
                </option>
              ))}
            </Select>
          </div>
        )}

        {req.status === 'PENDING' && matchingProofs.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            No completed {CIRCUIT_LABELS[req.circuitId]} proof found. Generate one first.
          </div>
        )}

        {respond.isError && (
          <p className="text-xs text-destructive">{(respond.error as Error).message}</p>
        )}
      </CardContent>

      {req.status === 'PENDING' && (
        <CardFooter className="gap-3">
          <Button
            className="flex-1"
            disabled={respond.isPending || matchingProofs.length === 0 || !chosenProofId}
            onClick={() => respond.mutate({ proofId: chosenProofId, decision: 'APPROVED' })}
          >
            {respond.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
              : <><CheckCircle2 className="mr-2 h-4 w-4" />Approve & Share</>}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={respond.isPending}
            onClick={() => respond.mutate({ proofId: '', decision: 'REJECTED' })}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </CardFooter>
      )}

      {req.status === 'APPROVED' && (
        <CardFooter>
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Proof submitted successfully
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

// Need React for useState inside RequestCard
import React from 'react';

function ProofRespondInner() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');
  const { data: proofs = [] } = useProofs();

  // If deep-linked to a specific request, fetch just that one
  const { data: singleRequest, isLoading: singleLoading } = useQuery<ProofRequest>({
    queryKey: ['proof-request', requestId],
    queryFn: () => api.get<ProofRequest>(`/proofs/requests/${requestId}`),
    enabled: !!requestId,
    retry: false,
  });

  // Otherwise fetch the user's pending inbox
  const { data: pendingRequests = [], isLoading: listLoading } = useQuery<ProofRequest[]>({
    queryKey: ['proof-requests'],
    queryFn: () => api.get<ProofRequest[]>('/proofs/requests/pending'),
    enabled: !requestId,
  });

  const isLoading = requestId ? singleLoading : listLoading;
  const requests: ProofRequest[] = requestId
    ? singleRequest ? [singleRequest] : []
    : pendingRequests;

  const pending = requests.filter((r) => r.status === 'PENDING');
  const past = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Proof Requests"
        description="Approve or reject verification requests from apps and protocols"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 w-full animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No pending requests"
          description="When an app or protocol requests a proof from you, it will appear here."
        />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Pending ({pending.length})</h2>
              {pending.map((r) => <RequestCard key={r.id} req={r} proofs={proofs} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Past Requests</h2>
              {past.map((r) => <RequestCard key={r.id} req={r} proofs={proofs} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProofRespondPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl py-12 text-center text-muted-foreground">Loading…</div>}>
      <ProofRespondInner />
    </Suspense>
  );
}
