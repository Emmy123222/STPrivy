'use client';

import { useState } from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROVIDERS = [
  {
    id: 'sumsub',
    name: 'Sumsub',
    description: 'Industry-leading KYC platform used by 2000+ companies worldwide.',
    features: ['Identity verification', 'Liveness check', 'Document scan', 'AML screening'],
    badge: 'Recommended',
    url: 'https://sumsub.com',
  },
  {
    id: 'veriff',
    name: 'Veriff',
    description: 'High-accuracy identity verification with 10,000+ document types.',
    features: ['AI-powered verification', 'Fraud detection', '190+ countries', 'Fast results'],
    badge: null,
    url: 'https://veriff.com',
  },
  {
    id: 'persona',
    name: 'Persona',
    description: 'Flexible identity infrastructure for modern compliance.',
    features: ['Custom workflows', 'Multi-step KYC', 'Business verification', 'Developer-friendly'],
    badge: null,
    url: 'https://withpersona.com',
  },
];

const STEPS = [
  { step: '1', title: 'Choose a provider', description: 'Select your preferred KYC provider below.' },
  { step: '2', title: 'Complete verification', description: "You'll be guided through ID scan, selfie, and liveness checks." },
  { step: '3', title: 'Receive credential', description: 'Once verified, a credential is issued to your DID automatically.' },
];

export default function StartKYCPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Start KYC Verification"
        description="Complete identity verification once. Use the credential forever."
      />

      {/* How it works */}
      <Card>
        <CardHeader><CardTitle className="text-base">How it works</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {STEPS.map(({ step, title, description }) => (
              <li key={step} className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Providers */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Select a provider</h2>
        {PROVIDERS.map((p) => (
          <Card
            key={p.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              selected === p.id && 'border-primary ring-1 ring-primary',
            )}
            onClick={() => setSelected(p.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {p.name}
                  {p.badge && <Badge variant="default" className="text-xs">{p.badge}</Badge>}
                </CardTitle>
                {selected === p.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3">
        <Button disabled={!selected} size="lg" className="flex-1">
          Start Verification with {selected ? PROVIDERS.find((p) => p.id === selected)?.name : '…'}
        </Button>
        {selected && (
          <Button variant="ghost" size="icon" asChild>
            <a
              href={PROVIDERS.find((p) => p.id === selected)?.url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Your personal data is processed by the selected provider and never stored on-chain.
        Only a credential hash is anchored on Stellar.
      </p>
    </div>
  );
}
