'use client';

import { ShieldCheck, RefreshCw, Loader2, UserX, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useIssuers, useDeactivateIssuer } from '@/hooks/use-issuers';
import type { Issuer } from '@/types';

function IssuerRow({ issuer }: { issuer: Issuer }) {
  const deactivate = useDeactivateIssuer();

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{issuer.name ?? issuer.did.slice(12, 36) + '…'}</p>
          <Badge variant={issuer.active ? 'success' : 'secondary'}>
            {issuer.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <p className="font-mono text-xs text-muted-foreground truncate">{issuer.did}</p>
        <p className="text-xs text-muted-foreground">
          Registered {new Date(issuer.createdAt).toLocaleDateString()} ·{' '}
          {issuer.credentialCount ?? 0} credentials
        </p>
      </div>
      {issuer.active && (
        <Button
          variant="outline"
          size="sm"
          className="ml-4 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={deactivate.isPending}
          onClick={() => deactivate.mutate(issuer.id)}
        >
          {deactivate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
            <><UserX className="mr-1.5 h-3.5 w-3.5" />Deactivate</>
          )}
        </Button>
      )}
      {!issuer.active && (
        <Button variant="ghost" size="sm" className="ml-4 shrink-0" disabled>
          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          Reactivate
        </Button>
      )}
    </div>
  );
}

export default function IssuerRegistryPage() {
  const { data: issuers = [], isLoading, refetch } = useIssuers();

  const active = issuers.filter((i) => i.active);
  const inactive = issuers.filter((i) => !i.active);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Issuer Registry"
        description="Manage organisations approved to issue credentials"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : issuers.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No issuers"
          description="No organisations have registered as issuers yet."
        />
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({inactive.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <div className="space-y-3">
              {active.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No active issuers.</p>
              ) : active.map((i) => <IssuerRow key={i.id} issuer={i} />)}
            </div>
          </TabsContent>
          <TabsContent value="inactive">
            <div className="space-y-3">
              {inactive.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No inactive issuers.</p>
              ) : inactive.map((i) => <IssuerRow key={i.id} issuer={i} />)}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
