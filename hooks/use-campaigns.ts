import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type CreateCampaignInput } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useProjectCampaigns(projectId: string) {
  return useQuery({
    queryKey: queryKeys.campaigns(projectId),
    queryFn: () => api.getProjectCampaigns(projectId),
    enabled: projectId.length > 0,
  });
}

export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaign(campaignId ?? 'none'),
    queryFn: () => api.getCampaign(campaignId!),
    enabled: Boolean(campaignId),
  });
}

/** Campaign spend drives cost-per-lead on the overview, so both caches refresh together. */
function useCampaignInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return (campaignId?: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.overview(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.clientView(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    if (campaignId) void queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) });
  };
}

export function useCreateCampaign(projectId: string) {
  const invalidate = useCampaignInvalidation(projectId);
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => api.createCampaign(projectId, input),
    onSuccess: (campaign) => invalidate(campaign.id),
  });
}

export function useUpdateCampaign(projectId: string) {
  const invalidate = useCampaignInvalidation(projectId);
  return useMutation({
    mutationFn: ({ campaignId, input }: { campaignId: string; input: Partial<CreateCampaignInput> }) =>
      api.updateCampaign(campaignId, input),
    onSuccess: (payload) => invalidate(payload.campaign.id),
  });
}

export function useDeleteCampaign(projectId: string) {
  const invalidate = useCampaignInvalidation(projectId);
  return useMutation({
    mutationFn: (campaignId: string) => api.deleteCampaign(campaignId),
    onSuccess: () => invalidate(),
  });
}
