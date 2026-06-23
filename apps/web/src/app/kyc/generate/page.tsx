'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCredentials } from '@/hooks/use-credentials';
import { useGenerateProof } from '@/hooks/use-proofs';
import type { CircuitId, ZKProof } from '@/types';

const CIRCUITS: { id: CircuitId; label: string; description: string }[] = [
  { id: 'age-proof', label: 'Age Verification (18+)', description: 'Proves you are at least 18 without revealing your age.' },
  { id: 'residency-proof', label: 'US Residency', description: 'Proves you are a US resident without revealing your address.' },
  { id: 'accredited-investor', label: 'Accredited Investor', description: 'Proves accredited investor status without revealing net worth.' },
  { id: 'sanctions-check', label: 'Sanctions Clearance', description: 'Proves you are not on any sanctions list.' },
];

const schema = z.object({
  credentialId: z.string().min(1, 'Select a credential'),
  circuitId: z.enum(['age-proof', 'residency-proof', 'accredited-investor', 'sanctions-check']),
});
type FormValues = z.infer<typeof schema>;

function ProofResult({ proof }: { proof: ZKProof }) {
  const statusConfig = {
    COMPLETED: { icon: CheckCircle2, color: 'text-green-600', label: 'Proof Generated' },
    GENERATING: { icon: Loader2, color: 'text-primary', label: 'Generating…' },
    PENDING: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
    FAILED: { icon: AlertCircle, color: 'text-destructive', label: 'Failed' },
  }[proof.status];

  const Icon = statusConfig.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${statusConfig.color} ${proof.status === 'GENERATING' ? 'animate-spin' : ''}`} />
          {statusConfig.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Circuit</span>
          <Badge variant="secondary">{proof.circuitId}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={proof.status === 'COMPLETED' ? 'success' : proof.status === 'FAILED' ? 'destructive' : 'warning'}>
            {proof.status}
          </Badge>
        </div>
        {proof.status === 'COMPLETED' && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            Your proof is ready. Share your Proof ID with verifiers.
            <p className="mt-1 font-mono text-xs break-all">{proof.id}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GenerateProofPage() {
  const searchParams = useSearchParams();
  const defaultCredentialId = searchParams.get('credentialId') ?? '';

  const { data: credentials = [] } = useCredentials();
  const generate = useGenerateProof();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { credentialId: defaultCredentialId, circuitId: 'age-proof' },
  });

  const selectedCircuit = CIRCUITS.find((c) => c.id === watch('circuitId'));
  const activeCredentials = credentials.filter((c) => c.status === 'ACTIVE');

  const onSubmit = (values: FormValues) => generate.mutate(values);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Generate ZK Proof"
        description="Create a zero-knowledge proof from one of your credentials"
      />

      {generate.data ? (
        <ProofResult proof={generate.data} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Credential select */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Credential</CardTitle>
              <CardDescription>Choose which credential to generate a proof from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="credentialId">Credential</Label>
              <Select id="credentialId" {...register('credentialId')}>
                <option value="">— Select a credential —</option>
                {activeCredentials.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type.join(', ')} · {new Date(c.issuedAt).toLocaleDateString()}
                  </option>
                ))}
              </Select>
              {activeCredentials.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active credentials. Complete KYC first.
                </p>
              )}
              {errors.credentialId && (
                <p className="text-xs text-destructive">{errors.credentialId.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Circuit select */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What to Prove</CardTitle>
              <CardDescription>Select what claim you want to prove</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="circuitId">Proof type</Label>
                <Select id="circuitId" {...register('circuitId')}>
                  {CIRCUITS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </Select>
              </div>
              {selectedCircuit && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    {selectedCircuit.label}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{selectedCircuit.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {generate.isError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {(generate.error as Error).message}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={generate.isPending}>
            {generate.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating proof…</>
            ) : (
              <><Zap className="mr-2 h-4 w-4" />Generate Proof</>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Proof generation takes under 5 seconds. The proof reveals only the minimum necessary — never raw personal data.
          </p>
        </form>
      )}
    </div>
  );
}
