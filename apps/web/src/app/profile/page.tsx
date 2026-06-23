'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Fingerprint, Copy, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/context/auth-context';
import { useDID } from '@/hooks/use-auth';
import { truncateAddress } from '@/lib/utils';
import type { DIDDocument } from '@/types';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={mono ? 'font-mono text-xs' : 'text-sm font-medium'}>{value}</span>
        {mono && <CopyButton text={value} />}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuthContext();
  const { createDID, resolveDID } = useDID();
  const qc = useQueryClient();

  const { data: didDoc, isLoading: didLoading } = useQuery<DIDDocument | null>({
    queryKey: ['did', user?.stellarAddress],
    queryFn: async () => {
      if (!user?.stellarAddress) return null;
      try { return await resolveDID(user.stellarAddress); } catch { return null; }
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: createDID,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['did'] }),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Profile & DID"
        description="Your decentralised identity and wallet information"
      />

      {/* Wallet info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <InfoRow label="Stellar Address" value={user.stellarAddress} mono />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
        </CardContent>
      </Card>

      {/* DID */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="h-4 w-4" />
            Decentralised Identity (DID)
            {didDoc && <Badge variant="success" className="ml-auto">Active</Badge>}
          </CardTitle>
          <CardDescription>
            Your W3C-compliant DID anchored on the Stellar network
          </CardDescription>
        </CardHeader>

        {didLoading ? (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          </CardContent>
        ) : didDoc ? (
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">DID</p>
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <code className="flex-1 truncate text-xs">{didDoc.id}</code>
                <CopyButton text={didDoc.id} />
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Verification Method</p>
              <p className="text-sm">{didDoc.verificationMethod[0]?.type}</p>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Public Key (multibase)</p>
              <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
                <code className="flex-1 break-all text-xs">
                  {didDoc.verificationMethod[0]?.publicKeyMultibase}
                </code>
                <CopyButton text={didDoc.verificationMethod[0]?.publicKeyMultibase ?? ''} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">DID Document (JSON)</p>
              <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(didDoc, null, 2)}
              </pre>
            </div>
          </CardContent>
        ) : (
          <>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You don&apos;t have a DID yet. Create one to start receiving credentials.
              </p>
              {createMutation.isError && (
                <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {(createMutation.error as Error).message}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create my DID
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
