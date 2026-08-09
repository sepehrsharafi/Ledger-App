import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type CreateProjectInput } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: api.getProjects });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => api.getProject(projectId),
    enabled: projectId.length > 0,
  });
}

export function useProjectOverview(projectId: string) {
  return useQuery({
    queryKey: queryKeys.overview(projectId),
    queryFn: () => api.getProjectOverview(projectId),
    enabled: projectId.length > 0,
  });
}

export function useClientView(projectId: string) {
  return useQuery({
    queryKey: queryKeys.clientView(projectId),
    queryFn: () => api.getClientView(projectId),
    enabled: projectId.length > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.createProject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateProjectInput & { status: string }>) => api.updateProject(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clientView(projectId) });
    },
  });
}
