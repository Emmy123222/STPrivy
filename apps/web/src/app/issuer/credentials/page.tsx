'use client';

import Link from 'next/link';
import { Files, FilePlus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useIssuerCredentials, useRevokeCredential } from '@/hooks/use-credentials';
import type { Credential } from '@/types';

function CredRow({ cred }: { cred: Credential }) {
  const revoke = useRevokeCredential();

  return (
    <div className="flex items-center justify-between rounded-lg border p-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{cred.type.filter((t) => t !== 'VerifiableCredential').join(', ')}</span>
          <Badge variant={cred.status === 'ACTIVE' ? 'success' : cred.status === 'REVOKED' ? 'destructive' : 'warning'}>
            {cred.status}
          </Badge>
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">{cred.subjectDID}</p>
        <p className="text-xs text-muted-foreground">
          Issued {new Date(cred.issuedAt).toLocaleDateString()}
          {cred.expiresAt && ` · Exp. ${new Date(cred.expiresAt).toLocaleDateString()}`}
        </p>
      </div>
      {cred.status === 'ACTIVE' && (
        <Button
          variant="outline"
          size="sm"
          className="ml-4 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={revoke.isPending}
          onClick={() => revoke.mutate(cred.id)}
        >
          {revoke.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Revoke'}
        </Button>
      )}
    </div>
  );
}

export default function ManageCredentialsPage() {
  const { data: credentials = [], isLoading, refetch } = useIssuerCredentials();

  const active = credentials.filter((c) => c.status === 'ACTIVE');
  const revoked = credentials.filter((c) => c.status === 'REVOKED');
  const expired = credentials.filter((c) => c.status === 'EXPIRED');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Manage Credentials"
        description="View and revoke credentials issued by your organisation"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            <Button asChild size="sm">
              <Link href="/issuer/issue">
                <FilePlus className="mr-1.5 h-4 w-4" />
                Issue New
              </Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : credentials.length === 0 ? (
        <EmptyState
          icon={Files}
          title="No credentials"
          description="You haven't issued any credentials yet."
          action={<Button asChild size="sm"><Link href="/issuer/issue">Issue First Credential</Link></Button>}
        />
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="revoked">Revoked ({revoked.length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
          </TabsList>
          {(['active', 'revoked', 'expired'] as const).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="space-y-2">
                {(tab === 'active' ? active : tab === 'revoked' ? revoked : expired).map((c) => (
                  <CredRow key={c.id} cred={c} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
