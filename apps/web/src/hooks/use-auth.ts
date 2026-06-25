'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthContext } from '@/context/auth-context';
import type { AuthResponse, DIDDocument } from '@/types';

export function useAuth() {
  const ctx = useAuthContext();

  const login = useCallback(
    async (address: string, signMessage: (msg: string) => Promise<string>) => {
      // Step 1: Get SEP-10 challenge XDR
      const { transaction } = await api.get<{ transaction: string; nonce: string }>(
        `/auth/challenge?publicKey=${address}`,
      );
      // Step 2: Sign with wallet
      const signedTransaction = await signMessage(transaction);
      // Step 3: Verify + issue JWT
      const { accessToken, user } = await api.post<AuthResponse>('/auth/login', {
        signedTransaction,
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
