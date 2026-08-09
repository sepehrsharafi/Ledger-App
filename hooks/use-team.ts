import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';
import type { UnassignConflict } from '@/types/models';

export function useAgencyTeam() {
  return useQuery({ queryKey: queryKeys.agencyTeam, queryFn: api.getAgencyTeam });
}

export function useTeamMember(memberId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.teamMember(memberId ?? 'none'),
    queryFn: () => api.getTeamMember(memberId!),
    enabled: Boolean(memberId),
  });
}

export function useProjectTeam(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectTeam(projectId),
    queryFn: () => api.getProjectTeam(projectId),
    enabled: projectId.length > 0,
  });
}

/**
 * Toggles a project assignment. When the API refuses an unassign because the member still
 * owns open tasks, the 409 body is returned as `conflict` for the confirmation modal.
 */
export function useToggleAssignment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ conflict?: UnassignConflict }, Error, { memberId: string; force?: boolean }>({
    mutationFn: async ({ memberId, force }) => {
      try {
        await api.toggleTeamMemberAssignment(projectId, memberId, force ?? false);
        return {};
      } catch (error) {
        if (error instanceof ApiError && error.isConflict) {
          return { conflict: error.body as UnassignConflict };
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      if (result.conflict) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectTeam(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyTeam });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
