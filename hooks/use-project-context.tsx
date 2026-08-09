import { useLocalSearchParams } from 'expo-router';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

const ProjectIdContext = createContext<string | null>(null);

export function ProjectIdProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const value = useMemo(() => projectId, [projectId]);
  return <ProjectIdContext.Provider value={value}>{children}</ProjectIdContext.Provider>;
}

/**
 * Current project id. Prefers the value published by the [projectId] layout, because a tab
 * screen that is mounted but not focused can see empty local route params.
 */
export function useProjectId(): string {
  const fromContext = useContext(ProjectIdContext);
  const params = useLocalSearchParams<{ projectId?: string | string[] }>();
  const raw = params.projectId;
  const fromParams = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  return fromContext && fromContext.length > 0 ? fromContext : fromParams;
}
