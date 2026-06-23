'use client';

import { ClipboardList, RefreshCw, Download } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogs } from '@/hooks/use-issuers';

const ACTION_LABELS: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  CREDENTIAL_ISSUED: { label: 'Issued', variant: 'success' },
  CREDENTIAL_REVOKED: { label: 'Revoked', variant: 'destructive' },
  PROOF_GENERATED: { label: 'Proof', variant: 'secondary' },
  PROOF_VERIFIED: { label: 'Verified', variant: 'success' },
  DID_CREATED: { label: 'DID', variant: 'secondary' },
  ISSUER_DEACTIVATED: { label: 'Deactivated', variant: 'warning' },
};

export default function AuditLogPage() {
  const [filter, setFilter] = useState('');
  const { data: logs = [], isLoading, refetch } = useAuditLogs();

  const filtered = filter
    ? logs.filter(
        (l) =>
          l.action.toLowerCase().includes(filter.toLowerCase()) ||
          l.actorDID.toLowerCase().includes(filter.toLowerCase()),
      )
    : logs;

  const exportCsv = () => {
    const rows = [
      ['ID', 'Action', 'Actor DID', 'Target', 'Timestamp'],
      ...filtered.map((l) => [l.id, l.action, l.actorDID, l.targetId ?? '', l.timestamp]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Audit Log"
        description="Immutable record of all platform events"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter */}
      <div className="mb-4">
        <Input
          placeholder="Filter by action or DID…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit entries"
          description={filter ? 'No events match your filter.' : 'Platform events will appear here.'}
        />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((log) => {
            const config = ACTION_LABELS[log.action] ?? { label: log.action, variant: 'secondary' as const };
            return (
              <div key={log.id} className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm">
                <Badge variant={config.variant} className="shrink-0 text-xs">
                  {config.label}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs truncate text-muted-foreground">
                    {log.actorDID}
                  </p>
                  {log.targetId && (
                    <p className="font-mono text-xs truncate text-muted-foreground">
                      → {log.targetId}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
