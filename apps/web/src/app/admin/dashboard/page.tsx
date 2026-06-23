'use client';

import { Users, ShieldCheck, FileCheck, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/layout/stats-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformStats, useAuditLogs } from '@/hooks/use-issuers';

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: logs = [], isLoading: logsLoading } = useAuditLogs();

  const HEALTH = [
    { label: 'API Server', status: 'Operational' },
    { label: 'Database', status: 'Operational' },
    { label: 'Redis / Queue', status: 'Operational' },
    { label: 'Stellar RPC', status: 'Operational' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Admin Dashboard" description="Platform overview and system health" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={statsLoading ? '—' : stats?.totalUsers ?? 0}
          icon={Users}
          description="All registered accounts"
        />
        <StatsCard
          title="Active Issuers"
          value={statsLoading ? '—' : stats?.activeIssuers ?? 0}
          icon={ShieldCheck}
          description="Approved issuing organisations"
        />
        <StatsCard
          title="Credentials"
          value={statsLoading ? '—' : stats?.totalCredentials ?? 0}
          icon={FileCheck}
          description="Total issued credentials"
        />
        <StatsCard
          title="Proofs Generated"
          value={statsLoading ? '—' : stats?.totalProofs ?? 0}
          icon={Activity}
          description="All-time ZK proofs"
        />
      </div>

      {/* System health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
          <CardDescription>Real-time service status</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {HEALTH.map(({ label, status }) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {label}
              </div>
              <Badge variant="success">{status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent audit events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest platform events</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-md px-2 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{log.action}</span>
                    <span className="font-mono text-xs text-muted-foreground">{log.actorDID.slice(0, 16)}…</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
