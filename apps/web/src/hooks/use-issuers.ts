'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Issuer, AuditLog, PlatformStats } from '@/types';

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return await api.get<T>(path);
  } catch {
    return fallback;
  }
}

export function useIssuers() {
  return useQuery<Issuer[]>({
    queryKey: ['issuers'],
    queryFn: () => safeGet('/issuers', []),
  });
}

export function useDeactivateIssuer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/issuers/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issuers'] }),
  });
}

export function useAuditLogs() {
  return useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: () => safeGet('/admin/audit', []),
  });
}

export function usePlatformStats() {
  return useQuery<PlatformStats>({
    queryKey: ['platform-stats'],
    queryFn: () =>
      safeGet('/admin/stats', {
        totalUsers: 0,
        totalCredentials: 0,
        totalProofs: 0,
        totalIssuers: 0,
        activeIssuers: 0,
        activeCredentials: 0,
        revokedCredentials: 0,
      }),
  });
}
