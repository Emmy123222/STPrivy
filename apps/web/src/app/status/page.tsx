import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SERVICES = [
  { name: 'API Server', status: 'operational' as const, latency: '42ms' },
  { name: 'Authentication', status: 'operational' as const, latency: '68ms' },
  { name: 'Database (PostgreSQL)', status: 'operational' as const, latency: '12ms' },
  { name: 'Redis / BullMQ', status: 'operational' as const, latency: '5ms' },
  { name: 'Stellar RPC (Testnet)', status: 'operational' as const, latency: '120ms' },
  { name: 'ZK Proof Generation', status: 'operational' as const, latency: '2.4s avg' },
  { name: 'KYC Providers', status: 'partial' as const, latency: 'N/A' },
];

const INCIDENTS: { date: string; title: string; resolved: boolean }[] = [];

type ServiceStatus = 'operational' | 'partial' | 'outage';

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

const allOperational = SERVICES.every((s) => s.status === 'operational');

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Platform Status</h1>
        <p className="text-muted-foreground">Real-time uptime and incident history</p>
      </div>

      {/* Overall */}
      <div className={`mb-6 flex items-center gap-3 rounded-xl border p-5 ${allOperational ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        {allOperational
          ? <CheckCircle2 className="h-6 w-6 text-green-600" />
          : <AlertCircle className="h-6 w-6 text-yellow-600" />}
        <div>
          <p className="font-semibold">
            {allOperational ? 'All systems operational' : 'Partial degradation'}
          </p>
          <p className="text-sm text-muted-foreground">Last checked: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Services */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Services</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {SERVICES.map(({ name, status, latency }) => (
            <div key={name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-sm">
                {statusIcon(status)}
                {name}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{latency}</span>
                {statusBadge(status)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Incident history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incident History</CardTitle>
        </CardHeader>
        <CardContent>
          {INCIDENTS.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-center text-sm text-muted-foreground justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              No incidents in the past 90 days.
            </div>
          ) : (
            <div className="space-y-3">
              {INCIDENTS.map(({ date, title, resolved }) => (
                <div key={date} className="flex items-start justify-between rounded-md border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>
                  <Badge variant={resolved ? 'success' : 'destructive'}>
                    {resolved ? 'Resolved' : 'Ongoing'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
