'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { useProofs, useVerifyProof } from '@/hooks/use-proofs';

const MOCK_REQUESTS = [
  {
    id: 'req-001',
    verifierDID: 'did:stellar:GVERIFIER123...',
    verifierName: 'DeFi Protocol X',
    circuitId: 'age-proof',
    circuitLabel: 'Age Verification (18+)',
    purpose: 'Required to access trading features',
    requestedAt: new Date(Date.now() - 300_000).toISOString(),
    status: 'pending' as const,
  },
];

type RequestStatus = 'pending' | 'approved' | 'rejected';

interface ProofRequest {
  id: string;
  verifierDID: string;
  verifierName: string;
  circuitId: string;
  circuitLabel: string;
  purpose: string;
  requestedAt: string;
  status: RequestStatus;
}

function RequestCard({
  req,
  onApprove,
  onReject,
  isLoading,
}: {
  req: ProofRequest;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{req.verifierName}</CardTitle>
            <CardDescription className="mt-0.5 font-mono text-xs">{req.verifierDID}</CardDescription>
          </div>
          <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'destructive'}>
            {req.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-medium">Requested proof:</span>
            <span>{req.circuitLabel}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>Purpose:</strong> {req.purpose}
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>Requested:</strong> {new Date(req.requestedAt).toLocaleString()}
          </div>
        </div>
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Approving will generate a zero-knowledge proof and share it with the verifier.
          Your raw personal data is never shared.
        </div>
      </CardContent>
      {req.status === 'pending' && (
        <CardFooter className="gap-3">
          <Button
            className="flex-1"
            onClick={onApprove}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Approve & Prove
          </Button>
          <Button variant="outline" className="flex-1" onClick={onReject} disabled={isLoading}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </CardFooter>
      )}
      {req.status === 'approved' && (
        <CardFooter>
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Proof submitted successfully
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function ProofRespondPage() {
  const [requests, setRequests] = useState<ProofRequest[]>(MOCK_REQUESTS);
  const { data: proofs = [] } = useProofs();
  const verify = useVerifyProof();

  const handleApprove = (id: string) => {
    const completedProof = proofs.find((p) => p.status === 'COMPLETED');
    if (completedProof) {
      verify.mutate(completedProof.id, {
        onSuccess: () =>
          setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)),
          ),
      });
    } else {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)),
      );
    }
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)),
    );
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const past = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Proof Requests"
        description="Approve or reject verification requests from apps and protocols"
      />

      {pending.length === 0 && past.length === 0 ? (
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
              {pending.map((r) => (
                <RequestCard
                  key={r.id}
                  req={r}
                  onApprove={() => handleApprove(r.id)}
                  onReject={() => handleReject(r.id)}
                  isLoading={verify.isPending}
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Past Requests</h2>
              {past.map((r) => (
                <RequestCard
                  key={r.id}
                  req={r}
                  onApprove={() => {}}
                  onReject={() => {}}
                  isLoading={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
