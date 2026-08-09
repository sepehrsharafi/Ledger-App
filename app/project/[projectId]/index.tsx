import { Redirect } from 'expo-router';

import { useProjectId } from '@/hooks/use-project-context';
import { projectRoute } from '@/lib/routes';

/** Bare project links land on the overview tab. */
export default function ProjectIndexRoute() {
  const projectId = useProjectId();
  return <Redirect href={projectRoute(projectId, 'overview')} />;
}
