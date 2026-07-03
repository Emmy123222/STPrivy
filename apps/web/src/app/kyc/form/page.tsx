'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIssueCredential } from '@/hooks/use-credentials';
import { api } from '@/lib/api';

const PROVIDER_NAMES: Record<string, string> = {
  sumsub: 'Sumsub',
  veriff: 'Veriff',
  persona: 'Persona',
};

const schema = z.object({
  country: z.string().length(2, 'Enter a 2-letter country code (e.g. US)').toUpperCase(),
  age: z.coerce.number().min(1, 'Age is required').max(150, 'Invalid age'),
  accredited: z.boolean(),
  expiresAt: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ── Veriff flow ──────────────────────────────────────────────────────────────

type VeriffStatus = 'idle' | 'loading' | 'started' | 'submitted' | 'approved' | 'declined' | 'error';

function VeriffFlow() {
  const router = useRouter();
  const [status, setStatus] = useState<VeriffStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Poll session status after submission until approved/declined
  const startPolling = (sid: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const session = await api.get<{ status: string; credentialId?: string }>(`/veriff/session/${sid}`);
        if (session.status === 'approved') {
          stopPolling();
          setStatus('approved');
        } else if (['declined', 'abandoned', 'expired', 'resubmission_requested'].includes(session.status)) {
          stopPolling();
          setStatus('declined');
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);
  };

  const handleStart = async () => {
    setStatus('loading');
    setError(null);
    try {
      const { sessionUrl, sessionToken, sessionId: sid } =
        await api.post<{ sessionId: string; sessionUrl: string; sessionToken: string }>('/veriff/session');

      setSessionId(sid);

      // Dynamically load Veriff in-context SDK (client-only)
      const { createVeriffFrame, MESSAGES } = await import('@veriff/incontext-sdk');

      setStatus('started');

      createVeriffFrame({
        url: sessionUrl,
        onEvent: (msg: unknown) => {
          const m = msg as { type: string };
          if (m.type === MESSAGES.FINISHED) {
            setStatus('submitted');
            startPolling(sid);
          } else if (m.type === MESSAGES.CANCELED) {
            setStatus('idle');
          }
        },
      });

      void sessionToken; // consumed by SDK via URL
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start Veriff session');
    }
  };

  useEffect(() => () => stopPolling(), []);

  if (status === 'approved') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <h2 className="text-xl font-semibold">Identity Verified</h2>
          <p className="text-sm text-muted-foreground">
            Veriff approved your identity. Your KYC credential has been issued to your DID.
          </p>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => router.push('/credentials')}>View My Credentials</Button>
            <Button variant="outline" onClick={() => router.push('/kyc/generate')}>
              Generate Proof
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'declined') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-14 w-14 text-destructive" />
          <h2 className="text-xl font-semibold">Verification Not Approved</h2>
          <p className="text-sm text-muted-foreground">
            Veriff could not verify your identity. You may try again or choose a different provider.
          </p>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => setStatus('idle')}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push('/kyc/start')}>
              Choose Provider
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'submitted') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Loader2 className="h-14 w-14 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Processing Verification</h2>
          <p className="text-sm text-muted-foreground">
            Veriff is reviewing your submission. This usually takes a few seconds…
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="KYC Verification — Veriff"
        description="Verify your identity with AI-powered document and face verification"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What to expect</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {[
              'Take a photo of your government-issued ID',
              'Take a selfie for liveness detection',
              'Veriff verifies your identity (usually under 60 seconds)',
              'A credential is automatically issued to your DID upon approval',
            ].map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-foreground">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Your document images are processed by Veriff and never stored on-chain.
          Only a hash of your KYC claims is anchored on Stellar.
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={status === 'loading' || status === 'started'}
        onClick={handleStart}
      >
        {status === 'loading' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting session…</>
        ) : (
          <><ShieldCheck className="mr-2 h-4 w-4" />Start Veriff Verification</>
        )}
      </Button>

      <Link
        href="/kyc/start"
        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to provider selection
      </Link>
    </div>
  );
}

// ── Manual KYC form (non-Veriff providers) ───────────────────────────────────

function ManualKYCForm({ providerName }: { providerName: string }) {
  const router = useRouter();
  const issue = useIssueCredential();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accredited: false },
  });

  const onSubmit = (values: FormValues) => {
    issue.mutate({
      country: values.country,
      age: values.age,
      accredited: values.accredited,
      expiresAt: values.expiresAt || undefined,
    });
  };

  if (issue.isSuccess) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <h2 className="text-xl font-semibold">KYC Credential Issued</h2>
            <p className="text-sm text-muted-foreground">
              Your identity has been verified and a credential has been issued to your DID.
            </p>
            <div className="mt-1 rounded-md bg-muted px-4 py-2 font-mono text-xs break-all">
              {(issue.data as { id?: string })?.id}
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => router.push('/credentials')}>View My Credentials</Button>
              <Button variant="outline" onClick={() => router.push('/kyc/generate')}>
                Generate Proof
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={`KYC Verification — ${providerName}`}
        description="Enter your identity details to receive a verifiable credential"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Country of Residence</CardTitle>
            <CardDescription>ISO 3166-1 alpha-2 country code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="country">Country Code</Label>
            <Input id="country" placeholder="US" maxLength={2} className="uppercase" {...register('country')} />
            {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Age</CardTitle>
            <CardDescription>Your current age in years</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" min={1} max={150} placeholder="25" {...register('age')} />
            {errors.age && <p className="text-xs text-destructive">{errors.age.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accredited Investor Status</CardTitle>
            <CardDescription>Check if you meet accredited investor criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4" {...register('accredited')} />
              <span className="text-sm">I am an accredited investor</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expiry Date</CardTitle>
            <CardDescription>Optional — leave blank for no expiry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="expiresAt">Expires At</Label>
            <Input id="expiresAt" type="date" {...register('expiresAt')} />
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Only a hash of your claims is anchored on Stellar. Raw personal data is never stored
            on-chain. Zero-knowledge proofs let you prove specific claims without revealing this
            information.
          </span>
        </div>

        {issue.isError && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {Array.isArray((issue.error as Error).message)
              ? ((issue.error as Error).message as unknown as string[]).join(', ')
              : (issue.error as Error).message}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={issue.isPending}>
          {issue.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuing credential…</>
          ) : (
            <><ShieldCheck className="mr-2 h-4 w-4" />Submit & Issue Credential</>
          )}
        </Button>

        <Link
          href="/kyc/start"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to provider selection
        </Link>
      </form>
    </div>
  );
}

// ── Page entry ───────────────────────────────────────────────────────────────

function KYCForm() {
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider') ?? 'sumsub';
  const providerName = PROVIDER_NAMES[provider] ?? provider;

  if (provider === 'veriff') return <VeriffFlow />;
  return <ManualKYCForm providerName={providerName} />;
}

export default function KYCFormPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl py-12 text-center text-muted-foreground">Loading…</div>}>
      <KYCForm />
    </Suspense>
  );
}
