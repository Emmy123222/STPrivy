'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Credential } from '@/types';

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return await api.get<T>(path);
  } catch {
    return fallback;
  }
}

export function useCredentials() {
  return useQuery<Credential[]>({
    queryKey: ['credentials'],
    queryFn: () => safeGet('/credentials', []),
  });
}

export function useRevokeCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/credentials/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
  });
}

export function useIssueCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      subjectDID: string;
      type: string[];
      claims: Record<string, unknown>;
      expiresAt?: string;
    }) => api.post<Credential>('/credentials/issue', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issuer-credentials'] }),
  });
}

export function useIssuerCredentials() {
  return useQuery<Credential[]>({
    queryKey: ['issuer-credentials'],
    queryFn: () => safeGet('/credentials/issued', []),
  });
}
