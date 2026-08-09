import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type CreateCalendarEventInput } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useProjectCalendar(projectId: string) {
  return useQuery({
    queryKey: queryKeys.calendar(projectId),
    queryFn: () => api.getProjectCalendar(projectId),
    enabled: projectId.length > 0,
  });
}

function useCalendarInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.calendar(projectId) });
}

export function useCreateCalendarEvent(projectId: string) {
  const invalidate = useCalendarInvalidation(projectId);
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) => api.createCalendarEvent(projectId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateCalendarEvent(projectId: string) {
  const invalidate = useCalendarInvalidation(projectId);
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: Partial<CreateCalendarEventInput> }) =>
      api.updateCalendarEvent(eventId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCalendarEvent(projectId: string) {
  const invalidate = useCalendarInvalidation(projectId);
  return useMutation({
    mutationFn: (eventId: string) => api.deleteCalendarEvent(eventId),
    onSuccess: invalidate,
  });
}
