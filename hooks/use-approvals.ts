import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type CreateApprovalInput } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ApprovalStatus } from '@/types/models';

export function useProjectApprovals(projectId: string) {
  return useQuery({
    queryKey: queryKeys.approvals(projectId),
    queryFn: () => api.getProjectApprovals(projectId),
    enabled: projectId.length > 0,
  });
}

/** Pending approvals feed the global inbox count. */
function useApprovalInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.approvals(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
  };
}

export function useCreateApproval(projectId: string) {
  const invalidate = useApprovalInvalidation(projectId);
  return useMutation({
    mutationFn: (input: CreateApprovalInput) => api.createApproval(projectId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateApprovalStatus(projectId: string) {
  const invalidate = useApprovalInvalidation(projectId);
  return useMutation({
    mutationFn: ({ approvalId, status }: { approvalId: string; status: ApprovalStatus }) =>
      api.updateApprovalStatus(approvalId, status),
    onSuccess: invalidate,
  });
}

export function useAddApprovalComment(projectId: string, author: string) {
  const invalidate = useApprovalInvalidation(projectId);
  return useMutation({
    mutationFn: ({ approvalId, message }: { approvalId: string; message: string }) =>
      api.addApprovalComment(approvalId, author, message),
    onSuccess: invalidate,
  });
}

export function useDeleteApproval(projectId: string) {
  const invalidate = useApprovalInvalidation(projectId);
  return useMutation({
    mutationFn: (approvalId: string) => api.deleteApproval(approvalId),
    onSuccess: invalidate,
  });
}
