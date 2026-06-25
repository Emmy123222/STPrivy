'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type ServiceStatus = 'operational' | 'partial' | 'outage';

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  latency: string;
}

interface HealthResponse {
  allOperational: boolean;
  services: ServiceInfo[];
  checkedAt: string;
}

function statusIcon(s: ServiceStatus) {
  if (s === 'operational') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (s === 'partial') return <AlertCircle className="h-4 w-4 text-yellow-600" />;
  return <AlertCircle className="h-4 w-4 text-destructive" />;
}

function statusBadge(s: ServiceStatus) {
  if (s === 'operational') return <Badge variant="success">Operational</Badge>;
  if (s === 'partial') return <Badge variant="warning">Partial Outage</Badge>;
  return <Badge variant="destructive">Outage</Badge>;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/health');
      if (res.ok) setHealth(await res.json());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const allOperational = health?.allOperational ?? false;
  const services = health?.services ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Status</h1>
          <p className="text-muted-foreground">Real-time service health</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className={`mb-6 flex items-center gap-3 rounded-xl border p-5 ${
        loading ? 'border-muted bg-muted/30'
        : allOperational ? 'border-green-200 bg-green-50'
        : 'border-yellow-200 bg-yellow-50'
      }`}>
        {loading
          ? <Skeleton className="h-6 w-6 rounded-full" />
          : allOperational
            ? <CheckCircle2 className="h-6 w-6 text-green-600" />
            : <AlertCircle className="h-6 w-6 text-yellow-600" />}
        <div>
          <p className="font-semibold">
            {loading ? 'Checking services…' : allOperational ? 'All systems operational' : 'Partial degradation'}
          </p>
          {health?.checkedAt && (
            <p className="text-sm text-muted-foreground">
              Last checked: {new Date(health.checkedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Services</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <Skeleton className="h-4 w-48" /><Skeleton className="h-6 w-24" />
              </div>
            ))
          ) : services.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Unable to reach health endpoint.</p>
          ) : (
            services.map(({ name, status, latency }) => (
              <div key={name} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-sm">
                  {statusIcon(status)}
                  {name}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{latency}</span>
                  {statusBadge(status)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Incident History</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            No incidents in the past 90 days.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
