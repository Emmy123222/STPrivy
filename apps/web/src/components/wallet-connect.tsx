'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet, type WalletType } from '@/hooks/use-wallet';
import { useAuth } from '@/hooks/use-auth';

const WALLETS: { id: WalletType; label: string; description: string }[] = [
  { id: 'freighter', label: 'Freighter', description: 'Official Stellar browser wallet' },
  { id: 'lobstr', label: 'LOBSTR', description: 'Mobile + browser Stellar wallet' },
  { id: 'xbull', label: 'xBull', description: 'Advanced Stellar wallet' },
];

export function WalletConnect() {
  const router = useRouter();
  const { connect, signMessage, isConnecting, error: walletError } = useWallet();
  const { login, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<'select' | 'signing'>('select');
  const [authError, setAuthError] = useState<string | null>(null);

  const error = walletError ?? authError;
  const isBusy = isConnecting || authLoading;

  const handleConnect = async (walletType: WalletType) => {
    setAuthError(null);
    try {
      setStep('signing');
      const address = await connect(walletType);
      await login(address, signMessage);
      router.push('/dashboard');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed');
      setStep('select');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect your wallet
        </CardTitle>
        <CardDescription>
          {step === 'select'
            ? 'Choose a Stellar wallet to sign in. Your private data never leaves your device.'
            : 'Sign the challenge in your wallet to verify ownership.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {WALLETS.map((wallet) => (
          <Button
            key={wallet.id}
            variant="outline"
            className="h-auto flex-col items-start gap-0.5 px-4 py-3 text-left"
            disabled={isBusy}
            onClick={() => handleConnect(wallet.id)}
          >
            <span className="font-semibold">{wallet.label}</span>
            <span className="text-xs text-muted-foreground">{wallet.description}</span>
          </Button>
        ))}

        {isBusy && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {step === 'signing' ? 'Waiting for signature…' : 'Connecting…'}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
