import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type CreateLeadInput } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { LeadStatus } from '@/types/models';

export function useProjectLeads(projectId: string) {
  return useQuery({
    queryKey: queryKeys.leads(projectId),
    queryFn: () => api.getProjectLeads(projectId),
    enabled: projectId.length > 0,
  });
}

export function useLead(leadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lead(leadId ?? 'none'),
    queryFn: () => api.getLead(leadId!),
    enabled: Boolean(leadId),
  });
}

/** Lead writes shift the pipeline, so the project overview is invalidated alongside the list. */
function useLeadInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return (leadId?: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.leads(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.overview(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    if (leadId) void queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
  };
}

export function useCreateLead(projectId: string) {
  const invalidate = useLeadInvalidation(projectId);
  return useMutation({
    mutationFn: (input: CreateLeadInput) => api.createLead(projectId, input),
    onSuccess: (payload) => invalidate(payload.lead.id),
  });
}

export function useUpdateLeadStatus(projectId: string, author: string) {
  const invalidate = useLeadInvalidation(projectId);
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatus }) =>
      api.updateLeadStatus(leadId, status, author),
    onSuccess: (payload) => invalidate(payload.lead.id),
  });
}

export function useAddLeadNote(projectId: string, author: string) {
  const invalidate = useLeadInvalidation(projectId);
  return useMutation({
    mutationFn: ({ leadId, content }: { leadId: string; content: string }) => api.addLeadNote(leadId, content, author),
    onSuccess: (payload) => invalidate(payload.lead.id),
  });
}

export function useUpdateLead(projectId: string) {
  const invalidate = useLeadInvalidation(projectId);
  return useMutation({
    mutationFn: ({ leadId, input }: { leadId: string; input: Partial<CreateLeadInput> }) =>
      api.updateLead(leadId, input),
    onSuccess: (payload) => invalidate(payload.lead.id),
  });
}

export function useDeleteLead(projectId: string) {
  const invalidate = useLeadInvalidation(projectId);
  return useMutation({
    mutationFn: (leadId: string) => api.deleteLead(leadId),
    onSuccess: () => invalidate(),
  });
}
