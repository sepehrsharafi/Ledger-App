/**
 * Typed-route helpers. Expo Router's typed routes reject interpolated strings, so every
 * project link is built from a literal pathname plus params.
 */
export const PROJECT_SEGMENT_PATHS = {
  overview: '/project/[projectId]/overview',
  leads: '/project/[projectId]/leads',
  tasks: '/project/[projectId]/tasks',
  calendar: '/project/[projectId]/calendar',
  more: '/project/[projectId]/more',
  campaigns: '/project/[projectId]/campaigns',
  approvals: '/project/[projectId]/approvals',
  reports: '/project/[projectId]/reports',
  team: '/project/[projectId]/team',
  settings: '/project/[projectId]/settings',
  'client-view': '/project/[projectId]/client-view',
} as const;

export type ProjectSegment = keyof typeof PROJECT_SEGMENT_PATHS;

export const PROJECT_SEGMENTS = Object.keys(PROJECT_SEGMENT_PATHS) as ProjectSegment[];

export function projectRoute(projectId: string, segment: ProjectSegment) {
  return { pathname: PROJECT_SEGMENT_PATHS[segment], params: { projectId } } as const;
}

export function isProjectSegment(value: string): value is ProjectSegment {
  return value in PROJECT_SEGMENT_PATHS;
}
