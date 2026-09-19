import type { ProjectStatus, TransitionRequestInput } from '@archiflow/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/endpoints';

export const projectKeys = {
  all: ['projects'] as const,
  list: (query: object) => ['projects', 'list', query] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  history: (id: string) => ['projects', 'history', id] as const,
  transitions: (id: string) => ['projects', 'transitions', id] as const,
};

export function useProjects(query: { page?: number; pageSize?: number; status?: ProjectStatus; q?: string } = {}) {
  return useQuery({ queryKey: projectKeys.list(query), queryFn: () => projectsApi.list(query) });
}

export function useProject(id: string | null) {
  return useQuery({ queryKey: projectKeys.detail(id ?? ''), queryFn: () => projectsApi.get(id!), enabled: !!id });
}

export function useProjectHistory(id: string | null) {
  return useQuery({ queryKey: projectKeys.history(id ?? ''), queryFn: () => projectsApi.history(id!), enabled: !!id });
}

export function useAvailableTransitions(id: string | null) {
  return useQuery({
    queryKey: projectKeys.transitions(id ?? ''),
    queryFn: () => projectsApi.transitions(id!),
    enabled: !!id,
  });
}

/** applyTransition : le serveur décide ; le cache est invalidé pour refléter le nouvel état partout. */
export function useApplyTransition(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TransitionRequestInput) => projectsApi.transition(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
