import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type CreateTaskInput } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { TaskColumn } from '@/types/models';

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId),
    queryFn: () => api.getProjectTasks(projectId),
    enabled: projectId.length > 0,
  });
}

/** Tasks in Review feed the global inbox count, so inbox is always invalidated too. */
function useTaskInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.overview(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  };
}

export function useCreateTask(projectId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.createTask(projectId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask(projectId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: Partial<CreateTaskInput> }) =>
      api.updateTask(taskId, input),
    onSuccess: invalidate,
  });
}

export function useMoveTask(projectId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: ({ taskId, column }: { taskId: string; column: TaskColumn }) => api.moveTask(taskId, column),
    onSuccess: invalidate,
  });
}

export function useDeleteTask(projectId: string) {
  const invalidate = useTaskInvalidation(projectId);
  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: invalidate,
  });
}
