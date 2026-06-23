'use client';

import { useState, useCallback } from 'react';

export type WalletType = 'freighter' | 'lobstr' | 'xbull';

export interface WalletState {
  address: string | null;
  walletType: WalletType | null;
  isConnecting: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Freighter — @stellar/freighter-api v2
// requestAccess() → string (public key)
// signBlob(base64Blob) → string (signature, format varies by extension version)
// ---------------------------------------------------------------------------
async function connectFreighter(): Promise<string> {
  const freighter = await import('@stellar/freighter-api');

  const connected = await freighter.isConnected();
  if (!connected) {
    throw new Error('Freighter extension not found. Install it at freighter.app');
  }

  // requestAccess() returns the public key directly in v2
  const address = await freighter.requestAccess();
  if (!address) throw new Error('Freighter did not return an address');
  return address;
}

// signMessage now receives the challenge XDR and returns the signed XDR
async function signWithFreighter(xdr: string): Promise<string> {
  const freighter = await import('@stellar/freighter-api');

  const networkPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
      ? 'Public Global Stellar Network ; September 2015'
      : 'Test SDF Network ; September 2015';

  const result = await freighter.signTransaction(xdr, { networkPassphrase });

  // Freighter v2 may return a plain string (signed XDR) or an object
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    const candidate = obj.signedTxXdr ?? obj.xdr ?? obj.result ?? obj.signedXdr;
    if (typeof candidate === 'string') return candidate;
  }
  throw new Error(`Unexpected response from Freighter signTransaction: ${JSON.stringify(result)}`);
}

// ---------------------------------------------------------------------------
// xBull — window.xBullSDK
// ---------------------------------------------------------------------------
async function connectXBull(): Promise<string> {
  const sdk = (window as Window & { xBullSDK?: { getPublicKey: () => Promise<string> } }).xBullSDK;
  if (!sdk) throw new Error('xBull wallet not found. Install the extension.');
  return sdk.getPublicKey();
}

async function signWithXBull(nonce: string): Promise<string> {
  const sdk = (
    window as Window & {
      xBullSDK?: { signMessage: (msg: string) => Promise<{ signedMessage: string }> };
    }
  ).xBullSDK;
  if (!sdk) throw new Error('xBull wallet not found.');
  const { signedMessage } = await sdk.signMessage(nonce);
  // xBull returns hex — convert to base64
  return btoa(String.fromCharCode(...Buffer.from(signedMessage, 'hex')));
}

// ---------------------------------------------------------------------------
// LOBSTR — window.lobstrSDK
// ---------------------------------------------------------------------------
async function connectLobstr(): Promise<string> {
  const sdk = (
    window as Window & { lobstrSDK?: { connect: () => Promise<{ publicKey: string }> } }
  ).lobstrSDK;
  if (!sdk) throw new Error('LOBSTR wallet not found. Install the extension.');
  const { publicKey } = await sdk.connect();
  return publicKey;
}

async function signWithLobstr(nonce: string): Promise<string> {
  const sdk = (
    window as Window & {
      lobstrSDK?: { signMessage: (msg: string) => Promise<{ signature: string }> };
    }
  ).lobstrSDK;
  if (!sdk) throw new Error('LOBSTR wallet not found.');
  const { signature } = await sdk.signMessage(nonce);
  // LOBSTR may return hex or base64 — detect and normalise to base64
  const isHex = /^[0-9a-f]{128}$/i.test(signature);
  return isHex ? btoa(String.fromCharCode(...Buffer.from(signature, 'hex'))) : signature;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    walletType: null,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async (walletType: WalletType = 'freighter') => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      let address: string;
      if (walletType === 'freighter') address = await connectFreighter();
      else if (walletType === 'xbull') address = await connectXBull();
      else address = await connectLobstr();

      setState({ address, walletType, isConnecting: false, error: null });
      return address;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Wallet connection failed';
      setState((s) => ({ ...s, isConnecting: false, error: message }));
      throw err;
    }
  }, []);

  const signMessage = useCallback(
    async (nonce: string): Promise<string> => {
      if (!state.walletType) throw new Error('No wallet connected');
      if (state.walletType === 'freighter') return signWithFreighter(nonce);
      if (state.walletType === 'xbull') return signWithXBull(nonce);
      return signWithLobstr(nonce);
    },
    [state.walletType],
  );

  const disconnect = useCallback(() => {
    setState({ address: null, walletType: null, isConnecting: false, error: null });
  }, []);

  return { ...state, connect, signMessage, disconnect };
}
