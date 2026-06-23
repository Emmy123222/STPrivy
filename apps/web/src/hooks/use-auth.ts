'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthContext } from '@/context/auth-context';
import type { AuthResponse, DIDDocument } from '@/types';

export function useAuth() {
  const ctx = useAuthContext();

  const login = useCallback(
    async (address: string, signMessage: (msg: string) => Promise<string>) => {
      // Challenge now returns both the nonce and a Stellar transaction XDR to sign
      const { nonce, xdr } = await api.get<{ nonce: string; xdr: string }>(
        `/auth/challenge?address=${address}`,
      );
      // signMessage receives the XDR and returns the signed XDR
      const signedXdr = await signMessage(xdr);
      const { accessToken, user } = await api.post<AuthResponse>('/auth/login', {
        address,
        nonce,
        signedXdr,
      });
      ctx.setAuth(accessToken, user);
      return user;
    },
    [ctx],
  );

  return {
    user: ctx.user,
    token: ctx.token,
    isLoading: ctx.isLoading,
    login,
    logout: ctx.logout,
  };
}

export function useDID() {
  const createDID = useCallback((): Promise<DIDDocument> => {
    return api.post<DIDDocument>('/did/create');
  }, []);

  const resolveDID = useCallback((stellarAddress: string): Promise<DIDDocument> => {
    return api.get<DIDDocument>(`/did/${stellarAddress}`);
  }, []);

  return { createDID, resolveDID };
}
