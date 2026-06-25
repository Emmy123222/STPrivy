'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { PlusCircle, Copy, CheckCircle2, Share2, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { CircuitId, ProofRequest } from '@/types';

const CIRCUIT_OPTIONS: { id: CircuitId; label: string }[] = [
  { id: 'age-proof', label: 'Age Verification (18+)' },
  { id: 'residency-proof', label: 'US Residency' },
  { id: 'accredited-investor', label: 'Accredited Investor' },
  { id: 'sanctions-check', label: 'Sanctions Clearance' },
];

const schema = z.object({
  circuitId: z.enum(['age-proof', 'residency-proof', 'accredited-investor', 'sanctions-check']),
  purpose: z.string().min(5, 'Describe the purpose'),
  callbackUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  expiresInMinutes: z.coerce.number().min(1).max(10080).default(60),
});
type FormValues = z.infer<typeof schema>;

export default function CreateProofRequestPage() {
  const [copied, setCopied] = useState(false);

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      api.post<ProofRequest>('/proofs/requests', {
        circuitId: values.circuitId,
        purpose: values.purpose,
        callbackUrl: values.callbackUrl || undefined,
        expiresAt: new Date(Date.now() + values.expiresInMinutes * 60_000).toISOString(),
      }),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { circuitId: 'age-proof', expiresInMinutes: 60 },
  });

  const deepLink = create.data
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/kyc/respond?requestId=${create.data.id}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (create.isSuccess && create.data) {
    const req = create.data;
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <PageHeader title="Request Created" description="Share this link with the user to request proof" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">Proof request ready</span>
              <Badge variant="secondary" className="ml-auto">
                {CIRCUIT_OPTIONS.find((c) => c.id === req.circuitId)?.label}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Request ID</p>
              <code className="text-xs">{req.id}</code>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Purpose</p>
              <p className="text-sm">{req.purpose}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Expires</p>
              <p className="text-sm">{new Date(req.expiresAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Proof request link</p>
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <code className="flex-1 truncate text-xs">{deepLink}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyLink}>
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={copyLink}>
                <Share2 className="mr-2 h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button variant="outline" onClick={() => create.reset()}>New Request</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Create Proof Request" description="Define the compliance requirement and generate a shareable request link" />
      <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proof Requirements</CardTitle>
            <CardDescription>Specify what the user must prove</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="circuitId">Proof Type</Label>
              <Select id="circuitId" {...register('circuitId')}>
                {CIRCUIT_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" placeholder="e.g. Required to access DeFi trading features" {...register('purpose')} />
              {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="callbackUrl">Callback URL (optional)</Label>
              <Input id="callbackUrl" type="url" placeholder="https://yourapp.com/webhook/proof" {...register('callbackUrl')} />
              {errors.callbackUrl && <p className="text-xs text-destructive">{errors.callbackUrl.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiresInMinutes">Request expires in (minutes)</Label>
              <Input id="expiresInMinutes" type="number" min={1} max={10080} {...register('expiresInMinutes')} />
            </div>
          </CardContent>
        </Card>

        {create.isError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {(create.error as Error).message}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
          {create.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
          ) : (
            <><PlusCircle className="mr-2 h-4 w-4" />Generate Proof Request</>
          )}
        </Button>
      </form>
    </div>
  );
}
