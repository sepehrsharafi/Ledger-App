import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { Frequency } from '@/types/models';

export function useProjectReport(projectId: string) {
  return useQuery({
    queryKey: queryKeys.report(projectId),
    queryFn: () => api.getProjectReport(projectId),
    enabled: projectId.length > 0,
  });
}

export function useUpdateReportConfig(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { frequency?: Frequency; internalReviewFirst?: boolean; includedSections?: string[] }) =>
      api.updateReportConfig(projectId, input),
    onSuccess: (config) => queryClient.setQueryData(queryKeys.report(projectId), config),
  });
}

export function useReportRecipients(projectId: string) {
  const queryClient = useQueryClient();
  const write = (config: Awaited<ReturnType<typeof api.getProjectReport>>) =>
    queryClient.setQueryData(queryKeys.report(projectId), config);

  return {
    add: useMutation({ mutationFn: (email: string) => api.addReportRecipient(projectId, email), onSuccess: write }),
    remove: useMutation({
      mutationFn: (email: string) => api.removeReportRecipient(projectId, email),
      onSuccess: write,
    }),
    send: useMutation({ mutationFn: () => api.sendReport(projectId), onSuccess: write }),
  };
}
