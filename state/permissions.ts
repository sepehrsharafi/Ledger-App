import { useAuthStore } from '@/state/auth-store';
import type { Role } from '@/types/models';

/**
 * Centralised capability map. Add a capability here and read it through
 * `useCan` — screens never branch on the role string directly.
 */
export const CAPABILITIES = {
  viewWorkspaceSettings: ['Admin', 'Manager'],
  editProjectSettings: ['Admin', 'Manager'],
  manageTeamAssignments: ['Admin', 'Manager'],
  deleteRecords: ['Admin', 'Manager', 'Member'],
  approveRequests: ['Admin', 'Manager', 'Member'],
  createProjects: ['Admin', 'Manager'],
} satisfies Record<string, Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: Role | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly Role[]).includes(role);
}

export function useCan(capability: Capability): boolean {
  const role = useAuthStore((state) => state.user?.role);
  return can(role, capability);
}

export function useRole(): Role | undefined {
  return useAuthStore((state) => state.user?.role);
}
