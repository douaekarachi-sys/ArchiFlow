import type { ArchitectureDocument } from '@archiflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { architectureApi } from '@/api/endpoints';

export const architectureKeys = {
  detail: (projectId: string) => ['architecture', projectId] as const,
};

export function useArchitecture(projectId: string) {
  return useQuery({ queryKey: architectureKeys.detail(projectId), queryFn: () => architectureApi.get(projectId) });
}

/** Autorité serveur à la sauvegarde (ADR 0003) : le document local n'est qu'optimiste. */
export function useSaveArchitecture(projectId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (document: ArchitectureDocument) => architectureApi.save(projectId, document),
    onSuccess: (saved) => client.setQueryData(architectureKeys.detail(projectId), saved),
  });
}
