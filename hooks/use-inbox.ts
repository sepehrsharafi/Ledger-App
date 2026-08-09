import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useInbox() {
  return useQuery({ queryKey: queryKeys.inbox, queryFn: api.getInbox });
}

/** Global badge count: pending approvals + tasks in Review. */
export function useUnreadCount(): number {
  const { data } = useInbox();
  return data?.unreadCount ?? 0;
}
