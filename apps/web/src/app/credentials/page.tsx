'use client';

import Link from 'next/link';
import { FileCheck, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCredentials } from '@/hooks/use-credentials';
import type { Credential, CredentialStatus } from '@/types';

function statusVariant(status: CredentialStatus) {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'REVOKED') return 'destructive' as const;
  return 'warning' as const;
}

function CredentialRow({ cred }: { cred: Credential }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{cred.type.join(', ')}</p>
          <Badge variant={statusVariant(cred.status)} className="shrink-0">
            {cred.status}
          </Badge>
        </div>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
          {cred.subjectDID}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>Issued {new Date(cred.issuedAt).toLocaleDateString()}</span>
          {cred.expiresAt && (
            <span>Expires {new Date(cred.expiresAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        {cred.status === 'ACTIVE' && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/kyc/generate?credentialId=${cred.id}`}>
              <Zap className="mr-1.5 h-3 w-3" />
              Prove
            </Link>
          </Button>
        )}
        {cred.onChainTxHash && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View on chain">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CredentialList({ credentials }: { credentials: Credential[] }) {
  if (credentials.length === 0) {
    return (
      <EmptyState
        icon={FileCheck}
        title="No credentials"
        description="You don't have any credentials in this category yet."
        action={
          <Button asChild size="sm">
            <Link href="/kyc/start">Start KYC Verification</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      {credentials.map((c) => <CredentialRow key={c.id} cred={c} />)}
    </div>
  );
}

export default function CredentialsPage() {
  const { data: credentials = [], isLoading, refetch } = useCredentials();

  const active = credentials.filter((c) => c.status === 'ACTIVE');
  const revoked = credentials.filter((c) => c.status === 'REVOKED');
  const expired = credentials.filter((c) => c.status === 'EXPIRED');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My Credentials"
        description="Verifiable credentials issued to your DID"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="revoked">Revoked ({revoked.length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active"><CredentialList credentials={active} /></TabsContent>
          <TabsContent value="revoked"><CredentialList credentials={revoked} /></TabsContent>
          <TabsContent value="expired"><CredentialList credentials={expired} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
