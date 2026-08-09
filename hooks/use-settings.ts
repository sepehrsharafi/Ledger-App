import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { AgencySettings } from '@/types/models';

export function useAgencySettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: api.getAgencySettings });
}

export function useSettingsMutations() {
  const queryClient = useQueryClient();
  const write = (settings: AgencySettings) => queryClient.setQueryData(queryKeys.settings, settings);

  return {
    toggleNotification: useMutation({
      mutationFn: ({ key, enabled }: { key: keyof AgencySettings['notifications']; enabled: boolean }) =>
        api.toggleNotification(key, enabled),
      onSuccess: write,
    }),
    toggleIntegration: useMutation({
      mutationFn: ({ integrationId, connected }: { integrationId: string; connected: boolean }) =>
        api.toggleIntegration(integrationId, connected),
      onSuccess: write,
    }),
    updateProfile: useMutation({
      mutationFn: (input: { agencyName?: string; logoPlaceholder?: string }) => api.updateAgencySettings(input),
      onSuccess: write,
    }),
  };
}
