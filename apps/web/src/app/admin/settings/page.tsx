'use client';

import { Settings, Shield, Bell, Database, Globe } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function ToggleRow({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="System Settings"
        description="Platform-wide configuration and feature flags"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleRow label="Rate Limiting" description="20 requests per 60 seconds per IP" enabled />
          <ToggleRow label="JWT Rotation" description="Rotate signing keys on schedule" enabled={false} />
          <ToggleRow label="Challenge Expiry" description="Nonces expire after 300 seconds" enabled />
          <ToggleRow label="Strict CORS" description="Only allow listed origins" enabled />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ConfigRow label="Database" value="PostgreSQL (Prisma)" />
          <ConfigRow label="Cache" value="Redis (IORedis)" />
          <ConfigRow label="Queue" value="BullMQ" />
          <ConfigRow label="Network" value="Stellar Testnet" />
          <ConfigRow label="ZK Backend" value="Barretenberg (Noir)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            KYC Providers
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleRow label="Sumsub" description="Industry KYC provider" enabled />
          <ToggleRow label="Veriff" description="AI-powered identity verification" enabled={false} />
          <ToggleRow label="Persona" description="Flexible KYC infrastructure" enabled={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ToggleRow label="Credential Expiry Alerts" description="Alert users before credentials expire" enabled />
          <ToggleRow label="New Issuer Alerts" description="Notify admins on new issuer registrations" enabled />
          <ToggleRow label="Proof Failure Alerts" description="Alert on repeated proof generation failures" enabled={false} />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Settings changes require a backend configuration update and restart. Contact the platform team.
      </p>
    </div>
  );
}
