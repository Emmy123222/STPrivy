'use client';

import { Copy, CheckCircle2, Settings, ShieldCheck, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/context/auth-context';

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
      <code className="flex-1 truncate text-xs">{value}</code>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copy}>
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export default function IssuerSettingsPage() {
  const { user } = useAuthContext();

  if (!user) return null;

  const did = `did:stellar:${user.stellarAddress}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Issuer Settings" description="Your issuer identity and configuration" />

      {/* Issuer identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Issuer Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Issuer DID</p>
            <CopyField value={did} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Stellar Address</p>
            <CopyField value={user.stellarAddress} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">On-chain status</p>
              <p className="text-xs text-muted-foreground">Registered in the Issuer Registry contract</p>
            </div>
            <Badge variant="warning">Pending</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Signing key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing Key</CardTitle>
          <CardDescription>Ed25519 key pair used to sign credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Keys are managed by your connected Stellar wallet. Never share your secret key.
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Public Key</p>
            <CopyField value={user.stellarAddress} />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Credential expiry notifications', description: 'Notify before credentials expire', enabled: true },
            { label: 'On-chain anchoring', description: 'Anchor credential hashes to Stellar automatically', enabled: true },
            { label: 'Revocation alerts', description: 'Alert when a subject requests revocation', enabled: false },
          ].map(({ label, description, enabled }) => (
            <div key={label} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'On' : 'Off'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
