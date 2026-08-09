import { todayKey } from '@/lib/format';
import type { CalendarEvent, Campaign, Lead, LeadStatus, Task } from '@/types/models';

/** Overdue task: due date in the past and not finished. */
export function isTaskOverdue(task: Task, today = todayKey()): boolean {
  return task.column !== 'Done' && task.dueDate < today;
}

/** Overdue calendar item: date in the past and not published. */
export function isEventOverdue(event: CalendarEvent, today = todayKey()): boolean {
  return event.status !== 'Published' && event.date < today;
}

export function campaignPacing(campaign: Campaign): number {
  if (campaign.budget <= 0) return 0;
  return Math.min(1.5, campaign.spent / campaign.budget);
}

export function campaignCtr(campaign: Campaign): number {
  if (campaign.impressions <= 0) return 0;
  return campaign.clicks / campaign.impressions;
}

export function campaignCpa(campaign: Campaign): number {
  if (campaign.conversions <= 0) return 0;
  return campaign.spent / campaign.conversions;
}

export function conversionRate(leads: Lead[]): number {
  if (leads.length === 0) return 0;
  return leads.filter((lead) => lead.status === 'Won').length / leads.length;
}

export function groupLeadsByStatus(leads: Lead[]): Record<LeadStatus, Lead[]> {
  return leads.reduce(
    (groups, lead) => {
      groups[lead.status].push(lead);
      return groups;
    },
    { New: [], Contacted: [], Qualified: [], Won: [], Lost: [] } as Record<LeadStatus, Lead[]>,
  );
}

export interface LeadFilters {
  query: string;
  status: LeadStatus | 'All';
  source: string | 'All';
  owner: string | 'All';
}

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const query = filters.query.trim().toLowerCase();
  return leads.filter((lead) => {
    if (filters.status !== 'All' && lead.status !== filters.status) return false;
    if (filters.source !== 'All' && lead.source !== filters.source) return false;
    if (filters.owner !== 'All' && lead.assignedTeamMember !== filters.owner) return false;
    if (query.length === 0) return true;
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query)
    );
  });
}

export type CampaignSort = 'spend' | 'conversions' | 'name';

export function sortCampaigns(campaigns: Campaign[], sort: CampaignSort): Campaign[] {
  const sorted = [...campaigns];
  switch (sort) {
    case 'conversions':
      return sorted.sort((a, b) => b.conversions - a.conversions);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted.sort((a, b) => b.spent - a.spent);
  }
}

export interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/** Builds a Sunday-first month grid, padded to whole weeks. */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstOfMonth.getDay();
  const today = todayKey();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({ key: `pad-start-${index}`, day: 0, inMonth: false, isToday: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ key, day, inMonth: true, isToday: key === today });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `pad-end-${cells.length}`, day: 0, inMonth: false, isToday: false });
  }
  return cells;
}

/**
 * Raw progress against a goal — deliberately not clamped at 1 so a goal that has run past
 * its target (a cost ceiling, for example) reports the real number instead of a tidy 100%.
 * The meter renders anything over 1 in the danger colour.
 */
export function goalProgress(currentValue: number, targetValue: number): number {
  if (targetValue <= 0) return 0;
  return Math.max(0, currentValue / targetValue);
}

/** Builds an RFC-4180-ish CSV from the overview so export never depends on a native module. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\n');
}
