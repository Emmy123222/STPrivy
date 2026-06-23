'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ZKProof, ProofVerification, CircuitId } from '@/types';

async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return await api.get<T>(path);
  } catch {
    return fallback;
  }
}

export function useProofs() {
  return useQuery<ZKProof[]>({
    queryKey: ['proofs'],
    queryFn: () => safeGet('/proofs', []),
  });
}

export function useGenerateProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { credentialId: string; circuitId: CircuitId }) =>
      api.post<ZKProof>('/proofs/generate', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proofs'] }),
  });
}

export function useVerifyProof() {
  return useMutation({
    mutationFn: (proofId: string) =>
      api.post<ProofVerification>('/proofs/verify', { proofId }),
  });
}

export function useProofVerifications() {
  return useQuery<ProofVerification[]>({
    queryKey: ['proof-verifications'],
    queryFn: () => safeGet('/proofs/verifications', []),
  });
}
