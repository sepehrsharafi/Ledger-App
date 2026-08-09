import { transaction, type SqlDriver, type SqlValue } from './driver';
import type { Channel, LeadStatus, Priority, TaskColumn } from '@/types/models';

/** Dates are generated relative to today so boards, calendars and reports always look current. */
const TODAY = new Date();

/** Formats in local time — toISOString() would shift dates behind UTC by a day. */
function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isoDate(offsetDays: number): string {
  const date = new Date(TODAY);
  date.setDate(date.getDate() + offsetDays);
  return localDate(date);
}

function isoStamp(offsetHours: number): string {
  const date = new Date(TODAY);
  date.setHours(date.getHours() + offsetHours);
  return date.toISOString();
}

function monthStart(offsetMonths: number): string {
  return localDate(new Date(TODAY.getFullYear(), TODAY.getMonth() + offsetMonths, 1));
}

/** Day inside the current month, clamped so short months stay valid. */
function dayThisMonth(day: number): string {
  const lastDay = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
  const safe = Math.min(day, lastDay);
  return localDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), safe));
}

const TABLES = [
  'projects',
  'team_members',
  'project_members',
  'kpi_snapshots',
  'time_series',
  'channel_breakdowns',
  'timeline_annotations',
  'goals',
  'leads',
  'lead_activities',
  'campaigns',
  'tasks',
  'calendar_events',
  'approvals',
  'approval_comments',
  'report_configs',
  'report_recipients',
  'agency_settings',
];

const MEMBERS = [
  { id: 'tm_alex', name: 'Alex Morgan', email: 'alex.morgan@ledgerstudio.co', role: 'Admin', color: '#1F4BC5' },
  { id: 'tm_isla', name: 'Isla Chen', email: 'isla.chen@ledgerstudio.co', role: 'Manager', color: '#3D8BFD' },
  { id: 'tm_priya', name: 'Priya Shah', email: 'priya.shah@ledgerstudio.co', role: 'Manager', color: '#7C4DFF' },
  { id: 'tm_emma', name: 'Emma Johnson', email: 'emma.johnson@ledgerstudio.co', role: 'Member', color: '#1B9E77' },
  { id: 'tm_daniel', name: 'Daniel Kim', email: 'daniel.kim@ledgerstudio.co', role: 'Member', color: '#E0457B' },
  { id: 'tm_liam', name: 'Liam Smith', email: 'liam.smith@ledgerstudio.co', role: 'Member', color: '#F2A33C' },
  { id: 'tm_noah', name: 'Noah Williams', email: 'noah.williams@ledgerstudio.co', role: 'Manager', color: '#2CB1A6' },
  { id: 'tm_chloe', name: 'Chloe Bennett', email: 'chloe.bennett@ledgerstudio.co', role: 'Member', color: '#8A6BFF' },
] as const;

const PROJECTS = [
  {
    id: 'prj_lumen',
    name: 'Lumen Skincare',
    clientName: 'Lumen Labs',
    type: 'DTC e-commerce brand launch',
    brandPrimary: '#1F4BC5',
    brandAccent: '#E4756A',
    createdAt: monthStart(-6),
    topKpiLabel: 'Launch ROI',
    topKpiValue: '3.84x',
    members: ['tm_alex', 'tm_isla', 'tm_emma', 'tm_priya', 'tm_daniel'],
  },
  {
    id: 'prj_northpeak',
    name: 'Northpeak Outdoor Co.',
    clientName: 'Northpeak Outdoor Co.',
    type: 'Retail / outdoor apparel brand',
    brandPrimary: '#1B5E4B',
    brandAccent: '#2CB1A6',
    createdAt: monthStart(-9),
    topKpiLabel: 'Seasonal revenue',
    topKpiValue: '€86.4k',
    members: ['tm_alex', 'tm_noah', 'tm_liam', 'tm_priya', 'tm_chloe'],
  },
  {
    id: 'prj_vaultline',
    name: 'Vaultline',
    clientName: 'Vaultline GmbH',
    type: 'B2B fintech SaaS',
    brandPrimary: '#111827',
    brandAccent: '#3D8BFD',
    createdAt: monthStart(-4),
    topKpiLabel: 'Pipeline value',
    topKpiValue: '€308k',
    members: ['tm_alex', 'tm_isla', 'tm_noah', 'tm_chloe'],
  },
] as const;

interface SeedLead {
  name: string;
  company: string;
  source: string;
  status: LeadStatus;
  value: number | null;
  capturedFrom: string;
  owner: string;
  ageDays: number;
}

const LEADS: Record<string, SeedLead[]> = {
  prj_lumen: [
    { name: 'Mila Carter', company: 'Individual customer', source: 'Website form', status: 'Contacted', value: 130, capturedFrom: 'Serum launch landing page', owner: 'Isla Chen', ageDays: 22 },
    { name: 'Ruby Brooks', company: 'Individual customer', source: 'Email signup', status: 'New', value: 95, capturedFrom: 'Hydration quiz', owner: 'Isla Chen', ageDays: 3 },
    { name: 'Maya Brooks', company: 'Individual customer', source: 'Organic search', status: 'New', value: 165, capturedFrom: 'Ingredients guide', owner: 'Priya Shah', ageDays: 5 },
    { name: 'Chloe Walsh', company: 'Glow Collective', source: 'Referral', status: 'Qualified', value: 200, capturedFrom: 'Partner referral form', owner: 'Alex Morgan', ageDays: 31 },
    { name: 'Ivy Walsh', company: 'Individual customer', source: 'Email signup', status: 'Qualified', value: 235, capturedFrom: 'Welcome flow', owner: 'Isla Chen', ageDays: 18 },
    { name: 'Ruby Carter', company: 'Individual customer', source: 'Website form', status: 'Won', value: 95, capturedFrom: 'Bundle page', owner: 'Emma Johnson', ageDays: 40 },
    { name: 'Leah Brooks', company: 'Individual customer', source: 'Paid ad', status: 'Won', value: 235, capturedFrom: 'Meta lead form', owner: 'Priya Shah', ageDays: 27 },
    { name: 'Ella Price', company: 'Individual customer', source: 'Referral', status: 'Won', value: 358, capturedFrom: 'Loyalty referral', owner: 'Daniel Kim', ageDays: 12 },
    { name: 'Nina Bell', company: 'Individual customer', source: 'Email signup', status: 'Lost', value: 95, capturedFrom: 'Sample request', owner: 'Emma Johnson', ageDays: 55 },
    { name: 'Aria Carter', company: 'Skinfolio', source: 'Referral', status: 'Contacted', value: 130, capturedFrom: 'Retailer enquiry', owner: 'Priya Shah', ageDays: 9 },
    { name: 'Ella Carter', company: 'Individual customer', source: 'Paid ad', status: 'Contacted', value: 305, capturedFrom: 'Google Ads · serum', owner: 'Isla Chen', ageDays: 6 },
    { name: 'Sophie Walsh', company: 'Individual customer', source: 'Organic search', status: 'Qualified', value: 305, capturedFrom: 'Routine builder', owner: 'Priya Shah', ageDays: 14 },
    { name: 'Ava Foster', company: 'Individual customer', source: 'Paid ad', status: 'Qualified', value: 95, capturedFrom: 'Meta lead form', owner: 'Daniel Kim', ageDays: 8 },
    { name: 'Maya Bell', company: 'Individual customer', source: 'Website form', status: 'Lost', value: 95, capturedFrom: 'Contact page', owner: 'Isla Chen', ageDays: 44 },
  ],
  prj_northpeak: [
    { name: 'Jonas Weber', company: 'Alpine Sport Wien', source: 'Trade show', status: 'Qualified', value: 4800, capturedFrom: 'ISPO booth scan', owner: 'Noah Williams', ageDays: 26 },
    { name: 'Marta Kovac', company: 'Kovac Outdoors', source: 'Referral', status: 'Contacted', value: 3200, capturedFrom: 'Dealer referral', owner: 'Liam Smith', ageDays: 11 },
    { name: 'Felix Braun', company: 'Bergwelt Retail', source: 'Website form', status: 'New', value: 1750, capturedFrom: 'Wholesale enquiry form', owner: 'Priya Shah', ageDays: 2 },
    { name: 'Sara Lindqvist', company: 'Nordic Trail Co.', source: 'Organic search', status: 'Won', value: 6400, capturedFrom: 'Wholesale catalogue', owner: 'Noah Williams', ageDays: 35 },
    { name: 'Tobias Lang', company: 'Lang Sporthaus', source: 'Paid ad', status: 'Contacted', value: 2100, capturedFrom: 'LinkedIn lead gen', owner: 'Chloe Bennett', ageDays: 7 },
    { name: 'Hanna Vogel', company: 'Vogel Alpin', source: 'Trade show', status: 'Won', value: 5200, capturedFrom: 'ISPO booth scan', owner: 'Liam Smith', ageDays: 21 },
    { name: 'Lukas Mayer', company: 'Summit Store Graz', source: 'Email signup', status: 'New', value: 900, capturedFrom: 'Trade newsletter', owner: 'Chloe Bennett', ageDays: 4 },
    { name: 'Ines Fischer', company: 'Fischer Bergsport', source: 'Referral', status: 'Lost', value: 1400, capturedFrom: 'Dealer referral', owner: 'Noah Williams', ageDays: 48 },
    { name: 'Paul Reiter', company: 'Reiter Outdoor', source: 'Website form', status: 'Qualified', value: 3900, capturedFrom: 'Wholesale enquiry form', owner: 'Liam Smith', ageDays: 16 },
    { name: 'Nora Steiner', company: 'Steiner Sport', source: 'Organic search', status: 'Contacted', value: 2600, capturedFrom: 'Seasonal lookbook', owner: 'Priya Shah', ageDays: 13 },
  ],
  prj_vaultline: [
    { name: 'Daniel Osei', company: 'Northbank Payments', source: 'Outbound', status: 'Qualified', value: 48000, capturedFrom: 'Sequence · treasury ops', owner: 'Isla Chen', ageDays: 19 },
    { name: 'Rebecca Hall', company: 'Meridian Capital', source: 'Webinar', status: 'Contacted', value: 32000, capturedFrom: 'Compliance webinar', owner: 'Noah Williams', ageDays: 9 },
    { name: 'Marcus Feld', company: 'Feld Treasury', source: 'Referral', status: 'Won', value: 76000, capturedFrom: 'Advisor referral', owner: 'Alex Morgan', ageDays: 30 },
    { name: 'Sofia Marin', company: 'Corva Fintech', source: 'Website form', status: 'New', value: 18000, capturedFrom: 'Demo request', owner: 'Chloe Bennett', ageDays: 1 },
    { name: 'Tom Weaver', company: 'Ledgerly', source: 'Outbound', status: 'Contacted', value: 24000, capturedFrom: 'Sequence · CFO office', owner: 'Isla Chen', ageDays: 6 },
    { name: 'Priyanka Rao', company: 'Axis Neobank', source: 'Webinar', status: 'Qualified', value: 60000, capturedFrom: 'Compliance webinar', owner: 'Noah Williams', ageDays: 23 },
    { name: 'Erik Halvorsen', company: 'Fjord Pay', source: 'Referral', status: 'Lost', value: 21000, capturedFrom: 'Investor referral', owner: 'Alex Morgan', ageDays: 51 },
    { name: 'Amina Yusuf', company: 'Cadence Bank Tech', source: 'Website form', status: 'New', value: 29000, capturedFrom: 'Pricing page', owner: 'Chloe Bennett', ageDays: 3 },
  ],
};

interface SeedCampaign {
  name: string;
  channel: Channel;
  status: 'Active' | 'Scheduled' | 'Ended';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  owner: string;
  notes: string;
  startOffset: number;
  endOffset: number;
}

const CAMPAIGNS: Record<string, SeedCampaign[]> = {
  prj_lumen: [
    { name: 'Hydration Boost', channel: 'Paid', status: 'Active', budget: 2800, spent: 2340, impressions: 52800, clicks: 908, conversions: 5, owner: 'Priya Shah', notes: 'Best performing prospecting set; scale the 15s cutdown.', startOffset: -48, endOffset: 14 },
    { name: 'Glow Awareness', channel: 'Social', status: 'Active', budget: 2200, spent: 1740, impressions: 41200, clicks: 764, conversions: 3, owner: 'Emma Johnson', notes: 'Creator-led reels outperform static by 2.1x.', startOffset: -40, endOffset: 20 },
    { name: 'UGC Story Sprint', channel: 'Social', status: 'Active', budget: 1450, spent: 932, impressions: 28600, clicks: 518, conversions: 2, owner: 'Emma Johnson', notes: 'Three creators live, two in edit.', startOffset: -21, endOffset: 28 },
    { name: 'Launch Email Flow', channel: 'Email', status: 'Active', budget: 620, spent: 412, impressions: 10200, clicks: 344, conversions: 2, owner: 'Daniel Kim', notes: 'Welcome series A/B on subject line matrix.', startOffset: -35, endOffset: 35 },
    { name: 'Retargeting Q2', channel: 'Paid', status: 'Scheduled', budget: 1000, spent: 0, impressions: 0, clicks: 0, conversions: 0, owner: 'Priya Shah', notes: 'Launches once the creative approval clears.', startOffset: 12, endOffset: 74 },
  ],
  prj_northpeak: [
    { name: 'Season Opener Search', channel: 'Search', status: 'Active', budget: 1800, spent: 1265, impressions: 21400, clicks: 612, conversions: 4, owner: 'Noah Williams', notes: 'Brand + category terms split into separate ad groups.', startOffset: -30, endOffset: 30 },
    { name: 'Trail Series Social', channel: 'Social', status: 'Active', budget: 1500, spent: 1048, impressions: 38800, clicks: 594, conversions: 2, owner: 'Chloe Bennett', notes: 'Trail-runner ambassador content set.', startOffset: -24, endOffset: 24 },
    { name: 'Wholesale Nurture', channel: 'Email', status: 'Active', budget: 480, spent: 312, impressions: 6400, clicks: 221, conversions: 2, owner: 'Liam Smith', notes: 'Dealer catalogue drip, 5 steps.', startOffset: -45, endOffset: 15 },
    { name: 'Winter Preorder', channel: 'Paid', status: 'Ended', budget: 1200, spent: 1184, impressions: 29600, clicks: 487, conversions: 3, owner: 'Noah Williams', notes: 'Closed out at 99% budget delivery.', startOffset: -120, endOffset: -20 },
  ],
  prj_vaultline: [
    { name: 'Treasury Ops Search', channel: 'Search', status: 'Active', budget: 5200, spent: 3800, impressions: 14800, clicks: 398, conversions: 3, owner: 'Isla Chen', notes: 'High-intent terms only; CPL target €800.', startOffset: -38, endOffset: 22 },
    { name: 'CFO Roundtable', channel: 'Email', status: 'Active', budget: 1800, spent: 1450, impressions: 4100, clicks: 184, conversions: 2, owner: 'Noah Williams', notes: 'Invite sequence to the quarterly roundtable.', startOffset: -26, endOffset: 18 },
    { name: 'Compliance Thought Leadership', channel: 'Social', status: 'Active', budget: 1900, spent: 1200, impressions: 17600, clicks: 246, conversions: 1, owner: 'Chloe Bennett', notes: 'LinkedIn document ads on the DORA explainer.', startOffset: -20, endOffset: 40 },
    { name: 'Q3 Category Push', channel: 'Paid', status: 'Scheduled', budget: 2000, spent: 0, impressions: 0, clicks: 0, conversions: 0, owner: 'Isla Chen', notes: 'Awaiting budget approval from the client.', startOffset: 20, endOffset: 110 },
  ],
};

interface SeedTask {
  title: string;
  description: string;
  column: TaskColumn;
  assignee: string;
  priority: Priority;
  dueOffset: number;
  notes: string;
}

const TASKS: Record<string, SeedTask[]> = {
  prj_lumen: [
    { title: 'Refresh retention subject line matrix', description: 'Lock the next welcome-flow A/B test using the top open-rate variants from last week.', column: 'In Progress', assignee: 'Daniel Kim', priority: 'Medium', dueOffset: 4, notes: 'Waiting on the copy pass from Emma.' },
    { title: 'Triage hydration quiz leads', description: 'Review the latest Meta lead-form batch and push high-intent contacts into same-day follow-up.', column: 'To Do', assignee: 'Alex Morgan', priority: 'High', dueOffset: 1, notes: '' },
    { title: 'Finalize landing page FAQ revisions', description: 'Update shipping, subscription cadence and bundle-return language for the launch page.', column: 'Review', assignee: 'Isla Chen', priority: 'Medium', dueOffset: -1, notes: 'Legal wording confirmed by the client.' },
    { title: 'Approve creator cutdowns for paid launch', description: 'Sign off on the three 15-second cutdowns queued for Monday spend.', column: 'Review', assignee: 'Emma Johnson', priority: 'High', dueOffset: 2, notes: '' },
    { title: 'Prepare social proof pull-quote shortlist', description: 'Curate customer-review snippets for the launch-page proof block refresh.', column: 'Done', assignee: 'Priya Shah', priority: 'Medium', dueOffset: -6, notes: '' },
    { title: 'Publish weekly performance readout', description: 'Package channel learnings, CPL shifts and lead-quality notes for the Monday client sync.', column: 'Done', assignee: 'Alex Morgan', priority: 'Low', dueOffset: -3, notes: '' },
    { title: 'Rebuild bundle upsell audience', description: 'Rebuild the 30-day purchaser audience after the pixel migration.', column: 'To Do', assignee: 'Priya Shah', priority: 'Medium', dueOffset: 6, notes: '' },
  ],
  prj_northpeak: [
    { title: 'Ship dealer catalogue step 4', description: 'Write and schedule the fourth wholesale nurture email with the new size-run table.', column: 'In Progress', assignee: 'Liam Smith', priority: 'High', dueOffset: 2, notes: '' },
    { title: 'Audit search term report', description: 'Strip irrelevant queries from the season-opener campaign and expand negatives.', column: 'To Do', assignee: 'Noah Williams', priority: 'Medium', dueOffset: 5, notes: '' },
    { title: 'Ambassador contract renewals', description: 'Confirm renewal terms with the two trail-running ambassadors for the autumn series.', column: 'Review', assignee: 'Chloe Bennett', priority: 'Medium', dueOffset: -2, notes: 'Rates agreed verbally.' },
    { title: 'Trade show follow-up sequence', description: 'Load the ISPO booth scans and start the dealer follow-up sequence.', column: 'Done', assignee: 'Noah Williams', priority: 'High', dueOffset: -8, notes: '' },
    { title: 'Refresh lookbook landing page', description: 'Swap in autumn hero imagery and update the size-guide module.', column: 'To Do', assignee: 'Priya Shah', priority: 'Low', dueOffset: 9, notes: '' },
  ],
  prj_vaultline: [
    { title: 'Draft DORA explainer part two', description: 'Second instalment of the compliance explainer for LinkedIn document ads.', column: 'In Progress', assignee: 'Chloe Bennett', priority: 'Medium', dueOffset: 3, notes: '' },
    { title: 'Qualify Axis Neobank opportunity', description: 'Run the discovery call and confirm procurement timeline before forecasting.', column: 'To Do', assignee: 'Noah Williams', priority: 'High', dueOffset: 1, notes: '' },
    { title: 'Roundtable invite list sign-off', description: 'Client review of the CFO roundtable invite list before the second send.', column: 'Review', assignee: 'Isla Chen', priority: 'High', dueOffset: 0, notes: 'Client asked for 10 more named accounts.' },
    { title: 'Rework pricing page CTA', description: 'Test a demo-first CTA against the current pricing-first layout.', column: 'To Do', assignee: 'Chloe Bennett', priority: 'Medium', dueOffset: 7, notes: '' },
    { title: 'Attribution model handover', description: 'Document the multi-touch model and hand it to the client analytics team.', column: 'Done', assignee: 'Alex Morgan', priority: 'Low', dueOffset: -5, notes: '' },
  ],
};

interface SeedEvent {
  title: string;
  channel: Channel;
  status: 'Draft' | 'Scheduled' | 'Published';
  day: number;
  assignee: string;
}

const EVENTS: Record<string, SeedEvent[]> = {
  prj_lumen: [
    { title: 'Hydration Boost reel publish', channel: 'Social', status: 'Scheduled', day: 14, assignee: 'Emma Johnson' },
    { title: 'Launch welcome flow send', channel: 'Email', status: 'Scheduled', day: 16, assignee: 'Daniel Kim' },
    { title: 'Client performance call', channel: 'Email', status: 'Draft', day: 17, assignee: 'Alex Morgan' },
    { title: 'Customer story interview', channel: 'Social', status: 'Scheduled', day: 18, assignee: 'Priya Shah' },
    { title: 'Bundle FAQ update', channel: 'Search', status: 'Draft', day: 19, assignee: 'Isla Chen' },
    { title: 'Creator cutdown export', channel: 'Paid', status: 'Scheduled', day: 19, assignee: 'Emma Johnson' },
    { title: 'Retention test launch', channel: 'Email', status: 'Draft', day: 19, assignee: 'Daniel Kim' },
    { title: 'Ingredients guide refresh', channel: 'Search', status: 'Published', day: 4, assignee: 'Isla Chen' },
    { title: 'Serum teaser carousel', channel: 'Social', status: 'Published', day: 7, assignee: 'Emma Johnson' },
    { title: 'Routine builder promo', channel: 'Paid', status: 'Draft', day: 24, assignee: 'Priya Shah' },
  ],
  prj_northpeak: [
    { title: 'Autumn lookbook drop', channel: 'Social', status: 'Scheduled', day: 12, assignee: 'Chloe Bennett' },
    { title: 'Dealer catalogue send', channel: 'Email', status: 'Scheduled', day: 15, assignee: 'Liam Smith' },
    { title: 'Trail series ambassador post', channel: 'Social', status: 'Draft', day: 20, assignee: 'Chloe Bennett' },
    { title: 'Season opener ad refresh', channel: 'Paid', status: 'Scheduled', day: 22, assignee: 'Noah Williams' },
    { title: 'Size guide SEO update', channel: 'Search', status: 'Published', day: 5, assignee: 'Priya Shah' },
    { title: 'Preorder recap email', channel: 'Email', status: 'Published', day: 8, assignee: 'Liam Smith' },
  ],
  prj_vaultline: [
    { title: 'DORA explainer part one', channel: 'Social', status: 'Published', day: 6, assignee: 'Chloe Bennett' },
    { title: 'CFO roundtable invite send', channel: 'Email', status: 'Scheduled', day: 13, assignee: 'Noah Williams' },
    { title: 'Treasury ops case study', channel: 'Search', status: 'Draft', day: 18, assignee: 'Isla Chen' },
    { title: 'Pricing page CTA test', channel: 'Paid', status: 'Draft', day: 21, assignee: 'Chloe Bennett' },
    { title: 'Analyst briefing follow-up', channel: 'Email', status: 'Scheduled', day: 26, assignee: 'Alex Morgan' },
  ],
};

interface SeedApproval {
  id: string;
  title: string;
  type: string;
  requestType: 'Creative' | 'Copy' | 'Budget' | 'Strategy' | 'Video';
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedBy: string;
  submittedOffsetDays: number;
  thumbnailColor: string;
  summary: string;
  details: string;
  pros: string;
  cons: string;
  recommendation: string;
  attachments: string;
  comments: { author: string; message: string; offsetHours: number }[];
}

const APPROVALS: Record<string, SeedApproval[]> = {
  prj_lumen: [
    {
      id: 'apv_lumen_hero',
      title: 'Hydration Boost hero',
      type: 'Image / creative',
      requestType: 'Creative',
      status: 'Pending',
      submittedBy: 'Emma Johnson',
      submittedOffsetDays: -3,
      thumbnailColor: '#E4756A',
      summary: 'Approve the final hero image for the launch landing page and paid social set.',
      details:
        'This asset is the primary visual for the Q2 launch. It needs signoff on the CTA lockup, product crop and claim hierarchy before media goes live.',
      pros: 'Strong product focus, consistent brand colours and a clear CTA path.',
      cons: 'CTA copy is slightly longer than the other variants.',
      recommendation: 'Approve with the current CTA lockup if the legal copy lands unchanged.',
      attachments: 'Hero mockup, alternate crop, CTA lockup',
      comments: [
        { author: 'Alex Morgan', message: 'Need final client signoff on the CTA lockup.', offsetHours: -40 },
        { author: 'Isla Chen', message: 'Legal confirmed the hydration claim wording today.', offsetHours: -18 },
      ],
    },
    {
      id: 'apv_lumen_budget',
      title: 'Retargeting Q2 budget uplift',
      type: 'Budget request',
      requestType: 'Budget',
      status: 'Pending',
      submittedBy: 'Priya Shah',
      submittedOffsetDays: -1,
      thumbnailColor: '#1F4BC5',
      summary: 'Add €10k to the Q2 retargeting campaign ahead of the bundle push.',
      details:
        'Prospecting is delivering below target CPL, so the retargeting pool is filling faster than planned. The uplift keeps frequency in range through the bundle window.',
      pros: 'Current CPL is 12.8% below target and the audience pool supports the extra spend.',
      cons: 'Pulls budget forward from the Q3 always-on plan.',
      recommendation: 'Approve €10k now and review again after two weeks of delivery.',
      attachments: 'Pacing forecast, audience size report',
      comments: [{ author: 'Alex Morgan', message: 'Happy to approve once the client confirms the Q3 shift.', offsetHours: -8 }],
    },
    {
      id: 'apv_lumen_copy',
      title: 'Welcome flow copy set',
      type: 'Email copy',
      requestType: 'Copy',
      status: 'Approved',
      submittedBy: 'Daniel Kim',
      submittedOffsetDays: -9,
      thumbnailColor: '#7C4DFF',
      summary: 'Five-email welcome sequence copy for the launch list.',
      details: 'Covers the welcome, ingredient story, routine builder, social proof and first-order incentive emails.',
      pros: 'Consistent voice and a clear single CTA per email.',
      cons: 'Email four leans heavily on discount language.',
      recommendation: 'Approved with a softer incentive line in email four.',
      attachments: 'Copy doc, subject line matrix',
      comments: [{ author: 'Isla Chen', message: 'Softened the discount line before publishing.', offsetHours: -120 }],
    },
  ],
  prj_northpeak: [
    {
      id: 'apv_north_video',
      title: 'Trail series ambassador film',
      type: 'Video / creative',
      requestType: 'Video',
      status: 'Pending',
      submittedBy: 'Chloe Bennett',
      submittedOffsetDays: -2,
      thumbnailColor: '#2CB1A6',
      summary: 'Sixty-second ambassador film for the autumn trail series launch.',
      details: 'Cut for social-first placement with a 15-second and 6-second cutdown planned from the same master.',
      pros: 'Authentic ambassador footage with strong product visibility in the first three seconds.',
      cons: 'Music licence only covers 12 months of paid usage.',
      recommendation: 'Approve the master and confirm the licence extension before paid rollout.',
      attachments: 'Master cut, 15s cutdown, licence terms',
      comments: [{ author: 'Noah Williams', message: 'Checking the licence extension cost with the label.', offsetHours: -20 }],
    },
    {
      id: 'apv_north_strategy',
      title: 'Autumn channel mix',
      type: 'Strategy',
      requestType: 'Strategy',
      status: 'Approved',
      submittedBy: 'Noah Williams',
      submittedOffsetDays: -14,
      thumbnailColor: '#1B5E4B',
      summary: 'Shift 20% of paid social budget into search for the autumn season.',
      details: 'Search is converting at a materially lower cost per lead across dealer and direct segments.',
      pros: 'Improves blended CPL and protects wholesale lead volume.',
      cons: 'Reduces upper-funnel reach during the season opener.',
      recommendation: 'Approved for a six-week test with a mid-point review.',
      attachments: 'Channel model, CPL comparison',
      comments: [{ author: 'Alex Morgan', message: 'Mid-point review booked for week three.', offsetHours: -200 }],
    },
  ],
  prj_vaultline: [
    {
      id: 'apv_vault_copy',
      title: 'Pricing page CTA copy',
      type: 'Landing page copy',
      requestType: 'Copy',
      status: 'Pending',
      submittedBy: 'Chloe Bennett',
      submittedOffsetDays: -4,
      thumbnailColor: '#3D8BFD',
      summary: 'Demo-first CTA copy to test against the current pricing-first layout.',
      details: 'Variant B leads with a guided demo offer and moves the pricing table below the security proof block.',
      pros: 'Better matches how enterprise buyers enter the funnel.',
      cons: 'Risks reducing self-serve trial starts from smaller accounts.',
      recommendation: 'Approve as a 50/50 split test for four weeks.',
      attachments: 'Variant A, variant B, test plan',
      comments: [
        { author: 'Isla Chen', message: 'Make sure the trial CTA stays visible above the fold.', offsetHours: -60 },
      ],
    },
    {
      id: 'apv_vault_strategy',
      title: 'Q3 category push plan',
      type: 'Strategy',
      requestType: 'Strategy',
      status: 'Rejected',
      submittedBy: 'Isla Chen',
      submittedOffsetDays: -11,
      thumbnailColor: '#111827',
      summary: 'Category-creation campaign built around "continuous treasury control".',
      details: 'Full-funnel plan covering paid social, analyst relations and a research report launch.',
      pros: 'Differentiates from the compliance-led positioning of the competitive set.',
      cons: 'Budget request exceeds the approved annual plan by 34%.',
      recommendation: 'Resubmit with a phased budget aligned to the approved plan.',
      attachments: 'Category narrative, budget model',
      comments: [
        { author: 'Alex Morgan', message: 'Direction is right, the budget shape is not. Phase it.', offsetHours: -240 },
      ],
    },
  ],
};

const REPORT_SECTIONS = [
  'Executive summary',
  'Channel performance',
  'Lead pipeline',
  'Campaign detail',
  'Content calendar',
  'Next steps',
];

const RECIPIENTS: Record<string, string[]> = {
  prj_lumen: ['nadia.rivers@lumenlabs.com', 'ops@lumenlabs.com'],
  prj_northpeak: ['jan.hofer@northpeak.co', 'retail@northpeak.co'],
  prj_vaultline: ['cfo@vaultline.de', 'marketing@vaultline.de'],
};

const GOALS: Record<string, { label: string; target: number; current: number; unit: string; period: string }[]> = {
  prj_lumen: [
    { label: 'Qualified leads', target: 20, current: 14, unit: 'leads', period: 'Q2' },
    { label: 'Return on ad spend', target: 4, current: 3.84, unit: 'x', period: 'Q2' },
    { label: 'Cost per lead', target: 350, current: 387, unit: '$', period: 'Q2' },
  ],
  prj_northpeak: [
    { label: 'Wholesale leads', target: 14, current: 10, unit: 'leads', period: 'Season' },
    { label: 'Seasonal revenue', target: 100000, current: 86400, unit: '€', period: 'Season' },
    { label: 'Dealer email engagement', target: 32, current: 27.4, unit: '%', period: 'Season' },
  ],
  prj_vaultline: [
    { label: 'Pipeline value', target: 400000, current: 308000, unit: '€', period: 'H1' },
    { label: 'Demo requests', target: 12, current: 8, unit: 'requests', period: 'H1' },
    { label: 'Cost per qualified lead', target: 700, current: 806, unit: '€', period: 'H1' },
  ],
};

const ANNOTATIONS: Record<string, { label: string; note: string; author: string; offsetDays: number }[]> = {
  prj_lumen: [
    { label: 'Serum launch', note: 'Full launch went live across paid, email and organic.', author: 'Alex Morgan', offsetDays: -42 },
    { label: 'Pixel migration', note: 'Server-side tracking replaced the legacy pixel; expect a two-day gap.', author: 'Priya Shah', offsetDays: -14 },
  ],
  prj_northpeak: [
    { label: 'ISPO trade show', note: 'Booth generated 64 dealer scans over three days.', author: 'Noah Williams', offsetDays: -26 },
    { label: 'Autumn range live', note: 'Full autumn range published to the wholesale catalogue.', author: 'Liam Smith', offsetDays: -9 },
  ],
  prj_vaultline: [
    { label: 'DORA deadline coverage', note: 'Compliance content push aligned to the regulatory deadline.', author: 'Chloe Bennett', offsetDays: -20 },
  ],
};

/** Twelve months of trend data with a light seasonal shape per project. */
function timeSeriesFor(projectId: string): {
  month: string;
  traffic: number;
  conversions: number;
  spend: number;
  leads: number;
}[] {
  const profile = {
    prj_lumen: { traffic: 24000, conversions: 9, spend: 4400, leads: 11, growth: 0.045 },
    prj_northpeak: { traffic: 18500, conversions: 8, spend: 3200, leads: 8, growth: 0.028 },
    prj_vaultline: { traffic: 9200, conversions: 4, spend: 5100, leads: 6, growth: 0.061 },
  }[projectId] ?? { traffic: 12000, conversions: 6, spend: 4000, leads: 8, growth: 0.03 };

  return Array.from({ length: 12 }, (_, index) => {
    const monthsAgo = 11 - index;
    const growth = (1 + profile.growth) ** index;
    const season = 1 + Math.sin((index / 12) * Math.PI * 2) * 0.12;
    return {
      month: monthStart(-monthsAgo),
      traffic: Math.round(profile.traffic * growth * season),
      conversions: Math.round(profile.conversions * growth * season),
      spend: Math.round(profile.spend * growth),
      leads: Math.round(profile.leads * growth * season),
    };
  });
}

const CHANNEL_MIX: Record<string, { channel: Channel; visits: number; conversions: number; spend: number; costPerLead: number }[]> = {
  prj_lumen: [
    { channel: 'Social', visits: 41200, conversions: 5, spend: 2672, costPerLead: 445 },
    { channel: 'Paid', visits: 38400, conversions: 5, spend: 2340, costPerLead: 468 },
    { channel: 'Email', visits: 12600, conversions: 2, spend: 412, costPerLead: 206 },
    { channel: 'Search', visits: 18800, conversions: 2, spend: 0, costPerLead: 0 },
  ],
  prj_northpeak: [
    { channel: 'Search', visits: 26400, conversions: 4, spend: 1265, costPerLead: 316 },
    { channel: 'Social', visits: 31800, conversions: 2, spend: 1048, costPerLead: 524 },
    { channel: 'Email', visits: 9400, conversions: 2, spend: 312, costPerLead: 156 },
    { channel: 'Paid', visits: 21600, conversions: 3, spend: 1184, costPerLead: 395 },
  ],
  prj_vaultline: [
    { channel: 'Search', visits: 14800, conversions: 3, spend: 3800, costPerLead: 1267 },
    { channel: 'Email', visits: 6200, conversions: 2, spend: 1450, costPerLead: 725 },
    { channel: 'Social', visits: 11400, conversions: 1, spend: 1200, costPerLead: 1200 },
    { channel: 'Paid', visits: 3800, conversions: 0, spend: 0, costPerLead: 0 },
  ],
};

const KPIS: Record<string, { metric: string; current: number; previous: number; sparkline: number[] }[]> = {
  prj_lumen: [
    { metric: 'Leads', current: 14, previous: 15, sparkline: [9, 11, 12, 12, 13, 14] },
    { metric: 'Conversions', current: 12, previous: 10, sparkline: [7, 8, 9, 10, 11, 12] },
    { metric: 'Cost per lead', current: 387, previous: 432, sparkline: [432, 424, 412, 402, 394, 387] },
    { metric: 'Return on spend', current: 3.84, previous: 3.22, sparkline: [3.1, 3.2, 3.4, 3.5, 3.7, 3.84] },
  ],
  prj_northpeak: [
    { metric: 'Leads', current: 10, previous: 9, sparkline: [6, 7, 8, 8, 9, 10] },
    { metric: 'Conversions', current: 11, previous: 9, sparkline: [6, 7, 8, 9, 10, 11] },
    { metric: 'Cost per lead', current: 381, previous: 412, sparkline: [418, 410, 402, 396, 388, 381] },
    { metric: 'Return on spend', current: 2.94, previous: 2.61, sparkline: [2.4, 2.5, 2.6, 2.7, 2.8, 2.94] },
  ],
  prj_vaultline: [
    { metric: 'Leads', current: 8, previous: 7, sparkline: [4, 5, 6, 7, 7, 8] },
    { metric: 'Conversions', current: 6, previous: 5, sparkline: [3, 3, 4, 5, 5, 6] },
    { metric: 'Cost per lead', current: 806, previous: 874, sparkline: [912, 890, 866, 842, 824, 806] },
    { metric: 'Return on spend', current: 4.12, previous: 3.74, sparkline: [3.4, 3.6, 3.7, 3.9, 4.0, 4.12] },
  ],
};

function mergeSeedRecords<T>(base: Record<string, T[]>, extra: Record<string, T[]>): Record<string, T[]> {
  return Object.fromEntries(
    Array.from(new Set([...Object.keys(base), ...Object.keys(extra)])).map((key) => [key, [...(base[key] ?? []), ...(extra[key] ?? [])]]),
  ) as Record<string, T[]>;
}

const EXTRA_LEADS: Record<string, SeedLead[]> = {
  prj_lumen: [
    { name: 'Harper Lane', company: 'Individual customer', source: 'Paid ad', status: 'Contacted', value: 210, capturedFrom: 'Meta lead form - hydration serum', owner: 'Emma Johnson', ageDays: 10 },
    { name: 'Grace Nolan', company: 'Aurora Spa', source: 'Referral', status: 'Qualified', value: 680, capturedFrom: 'Retail stockist referral', owner: 'Alex Morgan', ageDays: 28 },
    { name: 'Zoe Mercer', company: 'Individual customer', source: 'Email signup', status: 'Won', value: 165, capturedFrom: 'Summer bundle launch', owner: 'Daniel Kim', ageDays: 16 },
    { name: 'Piper Ellis', company: 'Individual customer', source: 'Organic search', status: 'New', value: 120, capturedFrom: 'Barrier repair guide', owner: 'Isla Chen', ageDays: 2 },
  ],
  prj_northpeak: [
    { name: 'Greta Hoffmann', company: 'Peakline Retail', source: 'Trade show', status: 'Qualified', value: 5400, capturedFrom: 'Munich showroom meeting', owner: 'Noah Williams', ageDays: 18 },
    { name: 'Timo Adler', company: 'Adler Sporting Goods', source: 'Website form', status: 'Contacted', value: 2600, capturedFrom: 'Autumn dealer brochure', owner: 'Liam Smith', ageDays: 8 },
    { name: 'Elena Voss', company: 'Summit Ridge', source: 'Referral', status: 'Won', value: 7200, capturedFrom: 'Distributor referral', owner: 'Chloe Bennett', ageDays: 24 },
    { name: 'Jon Pettersen', company: 'Nordmark Outdoor', source: 'Email signup', status: 'New', value: 1300, capturedFrom: 'Wholesale lookbook download', owner: 'Priya Shah', ageDays: 3 },
  ],
  prj_vaultline: [
    { name: 'Olivia Grant', company: 'Beacon Treasury', source: 'Outbound', status: 'Qualified', value: 54000, capturedFrom: 'CFO office outbound sequence', owner: 'Isla Chen', ageDays: 14 },
    { name: 'Mikkel Sorensen', company: 'Nord Harbor Bank', source: 'Webinar', status: 'Contacted', value: 37000, capturedFrom: 'Treasury automation webinar', owner: 'Noah Williams', ageDays: 7 },
    { name: 'Leila Haddad', company: 'Qanta Finance', source: 'Website form', status: 'New', value: 26000, capturedFrom: 'Security and controls page', owner: 'Chloe Bennett', ageDays: 2 },
    { name: 'Sebastian Koch', company: 'Vector Capital Markets', source: 'Referral', status: 'Won', value: 91000, capturedFrom: 'Board advisor introduction', owner: 'Alex Morgan', ageDays: 33 },
  ],
};

const EXTRA_CAMPAIGNS: Record<string, SeedCampaign[]> = {
  prj_lumen: [
    { name: 'Routine Builder Search', channel: 'Search', status: 'Active', budget: 960, spent: 744, impressions: 18300, clicks: 412, conversions: 2, owner: 'Isla Chen', notes: 'High-intent routine and ingredient term set.', startOffset: -18, endOffset: 18 },
    { name: 'Creator Whitelist Test', channel: 'Paid', status: 'Scheduled', budget: 1300, spent: 0, impressions: 0, clicks: 0, conversions: 0, owner: 'Priya Shah', notes: 'Awaiting final creator usage rights.', startOffset: 9, endOffset: 46 },
  ],
  prj_northpeak: [
    { name: 'Dealer Prospecting LinkedIn', channel: 'Paid', status: 'Active', budget: 920, spent: 516, impressions: 12100, clicks: 171, conversions: 1, owner: 'Noah Williams', notes: 'Testing job-title and account-list splits.', startOffset: -16, endOffset: 22 },
    { name: 'Boot Fit Guide Search', channel: 'Search', status: 'Scheduled', budget: 640, spent: 0, impressions: 0, clicks: 0, conversions: 0, owner: 'Priya Shah', notes: 'Launches with the autumn landing page refresh.', startOffset: 6, endOffset: 52 },
  ],
  prj_vaultline: [
    { name: 'Analyst Briefing Invite', channel: 'Email', status: 'Active', budget: 780, spent: 544, impressions: 2500, clicks: 102, conversions: 1, owner: 'Noah Williams', notes: 'Invite-only analyst briefing for target accounts.', startOffset: -15, endOffset: 14 },
    { name: 'Treasury Benchmark Report', channel: 'Social', status: 'Scheduled', budget: 2400, spent: 0, impressions: 0, clicks: 0, conversions: 0, owner: 'Chloe Bennett', notes: 'Gated research asset launch for late quarter demand.', startOffset: 11, endOffset: 64 },
  ],
};

const EXTRA_TASKS: Record<string, SeedTask[]> = {
  prj_lumen: [
    { title: 'Approve post-purchase survey tags', description: 'Finalize the survey taxonomy before the next lifecycle send goes live.', column: 'Review', assignee: 'Alex Morgan', priority: 'Low', dueOffset: 2, notes: 'Need final naming confirmation.' },
    { title: 'QA creator landing page links', description: 'Check all paid creative links and UTMs before the weekend spend bump.', column: 'In Progress', assignee: 'Emma Johnson', priority: 'High', dueOffset: 1, notes: '' },
  ],
  prj_northpeak: [
    { title: 'Refresh dealer onboarding PDF', description: 'Update MOQ, delivery windows and co-op marketing terms for autumn.', column: 'To Do', assignee: 'Liam Smith', priority: 'Medium', dueOffset: 4, notes: '' },
    { title: 'Approve outdoor retail case study', description: 'Final pass on the two-page dealer proof piece before email distribution.', column: 'Review', assignee: 'Noah Williams', priority: 'High', dueOffset: 1, notes: '' },
  ],
  prj_vaultline: [
    { title: 'Map procurement objections for enterprise demo', description: 'Capture the recurring procurement blockers from the last three discovery calls.', column: 'In Progress', assignee: 'Alex Morgan', priority: 'Medium', dueOffset: 5, notes: '' },
    { title: 'Publish analyst briefing follow-up notes', description: 'Summarize the analyst call and push follow-up actions to the client team.', column: 'To Do', assignee: 'Noah Williams', priority: 'Low', dueOffset: 6, notes: '' },
  ],
};

const EXTRA_EVENTS: Record<string, SeedEvent[]> = {
  prj_lumen: [
    { title: 'Customer FAQ story set', channel: 'Social', status: 'Scheduled', day: 21, assignee: 'Emma Johnson' },
    { title: 'Retail partner intro email', channel: 'Email', status: 'Draft', day: 23, assignee: 'Alex Morgan' },
    { title: 'Search copy refresh', channel: 'Search', status: 'Scheduled', day: 26, assignee: 'Isla Chen' },
    { title: 'UGC cutdown approval', channel: 'Paid', status: 'Draft', day: 28, assignee: 'Priya Shah' },
  ],
  prj_northpeak: [
    { title: 'Retailer margin FAQ update', channel: 'Email', status: 'Draft', day: 18, assignee: 'Liam Smith' },
    { title: 'Autumn boot guide article', channel: 'Search', status: 'Scheduled', day: 24, assignee: 'Priya Shah' },
    { title: 'Ambassador photo selects', channel: 'Social', status: 'Scheduled', day: 27, assignee: 'Chloe Bennett' },
    { title: 'Dealer reorder reminder', channel: 'Email', status: 'Published', day: 8, assignee: 'Noah Williams' },
  ],
  prj_vaultline: [
    { title: 'Treasury benchmark teaser', channel: 'Social', status: 'Scheduled', day: 9, assignee: 'Chloe Bennett' },
    { title: 'Enterprise pricing FAQ', channel: 'Search', status: 'Draft', day: 14, assignee: 'Isla Chen' },
    { title: 'Analyst briefing follow-up', channel: 'Email', status: 'Scheduled', day: 26, assignee: 'Noah Williams' },
    { title: 'Security proof page update', channel: 'Search', status: 'Published', day: 2, assignee: 'Alex Morgan' },
  ],
};

const EXTRA_APPROVALS: Record<string, (typeof APPROVALS)[string]> = {
  prj_lumen: [
    {
      id: 'apv_lumen_packaging',
      title: 'Late-summer packaging insert',
      type: 'Print / packaging',
      requestType: 'Creative',
      status: 'Pending',
      submittedBy: 'Emma Johnson',
      submittedOffsetDays: -1,
      thumbnailColor: '#E4756A',
      summary: 'Insert card for the late-summer bundle shipment.',
      details: 'Card needs one final legal line check before it goes to print with the next fulfillment batch.',
      pros: 'Clear routine guidance and cross-sell placement for the serum pair.',
      cons: 'Tight print deadline for this week batch.',
      recommendation: 'Approve today or defer to the next warehouse run.',
      attachments: 'Insert front, insert back, print proof',
      comments: [{ author: 'Alex Morgan', message: 'Need legal to confirm the claims line before noon.', offsetHours: -6 }],
    },
  ],
  prj_northpeak: [
    {
      id: 'apv_north_catalogue',
      title: 'Autumn dealer catalogue cover',
      type: 'Catalogue creative',
      requestType: 'Creative',
      status: 'Approved',
      submittedBy: 'Liam Smith',
      submittedOffsetDays: -6,
      thumbnailColor: '#2CB1A6',
      summary: 'Revised cover with the new alpine hero and fall color callouts.',
      details: 'Version three adjusts the retail headline and swaps the backpack SKU shown on the hero spread.',
      pros: 'Stronger product focus and clearer seasonal framing.',
      cons: 'Requires one more output for print bleed.',
      recommendation: 'Approved for digital send and final print prep.',
      attachments: 'PDF cover v3, print bleed notes',
      comments: [{ author: 'Noah Williams', message: 'Approved for dealer send. Print file next.', offsetHours: -64 }],
    },
  ],
  prj_vaultline: [
    {
      id: 'apv_vault_webinar',
      title: 'Treasury benchmark webinar deck',
      type: 'Webinar presentation',
      requestType: 'Strategy',
      status: 'Pending',
      submittedBy: 'Noah Williams',
      submittedOffsetDays: -2,
      thumbnailColor: '#3D8BFD',
      summary: 'Benchmark webinar deck for the September enterprise invite.',
      details: 'Deck introduces the benchmark findings and the product walkthrough used for the closing CTA.',
      pros: 'Strong account-level relevance and a clean proof sequence.',
      cons: 'Needs tighter attribution on two analyst data slides.',
      recommendation: 'Approve once the source footnotes are cleaned up.',
      attachments: 'Deck v5, benchmark appendix',
      comments: [{ author: 'Isla Chen', message: 'Looks right. Fix slide 12 sourcing and ship.', offsetHours: -18 }],
    },
  ],
};

const LEADS_PER_PROJECT = 120;

const LEAD_GENERATION_PROFILES: Record<
  string,
  { companies: string[]; sources: string[]; captures: string[]; owners: string[]; baseValue: number; stepValue: number }
> = {
  prj_lumen: {
    companies: ['Individual customer', 'Dew & Co.', 'Kindred Beauty', 'Serein Studio'],
    sources: ['Paid ad', 'Email signup', 'Organic search', 'Website form', 'Referral'],
    captures: ['Routine finder', 'Skin barrier guide', 'Creator landing page', 'Bundle waitlist'],
    owners: ['Emma Johnson', 'Isla Chen', 'Priya Shah', 'Daniel Kim'],
    baseValue: 95,
    stepValue: 35,
  },
  prj_northpeak: {
    companies: ['Alpine Trail Supply', 'Ridge & River', 'Summit Outfitters', 'Northern Range Sports'],
    sources: ['Trade show', 'Website form', 'Referral', 'Organic search', 'Email signup'],
    captures: ['Autumn wholesale lookbook', 'Dealer enquiry form', 'ISPO follow-up', 'Retail partner guide'],
    owners: ['Noah Williams', 'Liam Smith', 'Priya Shah', 'Chloe Bennett'],
    baseValue: 1200,
    stepValue: 450,
  },
  prj_vaultline: {
    companies: ['Atlas Treasury', 'Helix Payments', 'Mariner Finance', 'Cobalt Capital'],
    sources: ['Outbound', 'Webinar', 'Website form', 'Referral', 'Email signup'],
    captures: ['Treasury benchmark report', 'CFO roundtable', 'Security controls page', 'Enterprise demo request'],
    owners: ['Isla Chen', 'Noah Williams', 'Chloe Bennett', 'Alex Morgan'],
    baseValue: 18000,
    stepValue: 6500,
  },
};

function generatedLeads(projectId: string, existing: SeedLead[]): SeedLead[] {
  const profile = LEAD_GENERATION_PROFILES[projectId];
  if (!profile) return [];

  const firstNames = ['Avery', 'Blake', 'Casey', 'Devon', 'Emerson', 'Finley', 'Hayden', 'Jordan', 'Kendall', 'Logan', 'Morgan', 'Quinn'];
  const lastNames = ['Bishop', 'Campbell', 'Dawson', 'Ellis', 'Fletcher', 'Grayson', 'Hughes', 'Irwin', 'Jensen', 'Kerr'];
  const statuses: LeadStatus[] = ['New', 'New', 'Contacted', 'Contacted', 'Qualified', 'Qualified', 'Won', 'Lost'];

  return Array.from({ length: Math.max(0, LEADS_PER_PROJECT - existing.length) }, (_, index) => {
    const sequence = existing.length + index;
    return {
      name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`,
      company: profile.companies[sequence % profile.companies.length],
      source: profile.sources[sequence % profile.sources.length],
      status: statuses[sequence % statuses.length],
      value: profile.baseValue + (sequence % 7) * profile.stepValue,
      capturedFrom: profile.captures[sequence % profile.captures.length],
      owner: profile.owners[sequence % profile.owners.length],
      ageDays: 1 + ((sequence * 7) % 120),
    };
  });
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Adds a fresh, randomized current-month batch so the performance view reflects live activity. */
function generatedCurrentMonthLeads(projectId: string): SeedLead[] {
  const profile = LEAD_GENERATION_PROFILES[projectId];
  if (!profile) return [];

  const firstNames = ['Avery', 'Blair', 'Casey', 'Devon', 'Emery', 'Frankie', 'Gray', 'Harper', 'Jamie', 'Kai'];
  const lastNames = ['Adler', 'Bennett', 'Cole', 'Davis', 'Frost', 'Grant', 'Hayes', 'Lane', 'Morris', 'Reed'];
  const statuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];

  return Array.from({ length: randomInt(35, 50) }, (_, index) => {
    const first = firstNames[randomInt(0, firstNames.length - 1)]!;
    const last = lastNames[randomInt(0, lastNames.length - 1)]!;
    return {
      name: `${first} ${last} ${index + 1}`,
      company: profile.companies[randomInt(0, profile.companies.length - 1)]!,
      source: profile.sources[randomInt(0, profile.sources.length - 1)]!,
      status: statuses[randomInt(0, statuses.length - 1)]!,
      value: profile.baseValue + randomInt(0, 7) * profile.stepValue,
      capturedFrom: profile.captures[randomInt(0, profile.captures.length - 1)]!,
      owner: profile.owners[randomInt(0, profile.owners.length - 1)]!,
      ageDays: randomInt(0, 28),
    };
  });
}

const BASE_LEADS = mergeSeedRecords(LEADS, EXTRA_LEADS);
const SEEDED_LEADS = Object.fromEntries(
  Object.entries(BASE_LEADS).map(([projectId, leads]) => [
    projectId,
    [...leads, ...generatedLeads(projectId, leads), ...generatedCurrentMonthLeads(projectId)],
  ]),
) as Record<string, SeedLead[]>;

const TASKS_PER_PROJECT = 100;
const EVENTS_PER_PROJECT = 100;
const CAMPAIGNS_PER_PROJECT = 36;
const APPROVALS_PER_PROJECT = 24;

const CONTENT_PROFILES: Record<string, { label: string; owners: string[]; color: string }> = {
  prj_lumen: { label: 'Lumen', owners: ['Emma Johnson', 'Isla Chen', 'Priya Shah', 'Daniel Kim'], color: '#E4756A' },
  prj_northpeak: { label: 'Northpeak', owners: ['Noah Williams', 'Liam Smith', 'Priya Shah', 'Chloe Bennett'], color: '#2CB1A6' },
  prj_vaultline: { label: 'Vaultline', owners: ['Isla Chen', 'Noah Williams', 'Chloe Bennett', 'Alex Morgan'], color: '#3D8BFD' },
};

function generatedTasks(projectId: string, existing: SeedTask[]): SeedTask[] {
  const profile = CONTENT_PROFILES[projectId];
  if (!profile) return [];
  const columns: TaskColumn[] = ['To Do', 'In Progress', 'Review', 'Done'];
  const priorities: Priority[] = ['High', 'Medium', 'Medium', 'Low'];
  const work = ['brief', 'creative review', 'performance analysis', 'client update', 'channel audit', 'launch checklist', 'copy refresh', 'handover'];

  return Array.from({ length: Math.max(0, TASKS_PER_PROJECT - existing.length) }, (_, index) => {
    const sequence = existing.length + index;
    const item = work[sequence % work.length];
    return {
      title: `${profile.label} ${item} ${String(sequence + 1).padStart(2, '0')}`,
      description: `Complete the ${item} workstream, document the outcome, and share the next action with the project team.`,
      column: columns[sequence % columns.length],
      assignee: profile.owners[sequence % profile.owners.length],
      priority: priorities[sequence % priorities.length],
      dueOffset: (sequence % 35) - 10,
      notes: sequence % 3 === 0 ? 'Include the result in the next client status update.' : '',
    };
  });
}

function generatedEvents(projectId: string, existing: SeedEvent[]): SeedEvent[] {
  const profile = CONTENT_PROFILES[projectId];
  if (!profile) return [];
  const channels: Channel[] = ['Search', 'Social', 'Email', 'Paid'];
  const statuses: SeedEvent['status'][] = ['Draft', 'Scheduled', 'Scheduled', 'Published'];
  const formats = ['insight post', 'campaign update', 'customer story', 'product explainer', 'newsletter send', 'ad creative refresh'];

  return Array.from({ length: Math.max(0, EVENTS_PER_PROJECT - existing.length) }, (_, index) => {
    const sequence = existing.length + index;
    return {
      title: `${profile.label} ${formats[sequence % formats.length]} ${String(sequence + 1).padStart(2, '0')}`,
      channel: channels[sequence % channels.length],
      status: statuses[sequence % statuses.length],
      day: 1 + ((sequence * 3) % 28),
      assignee: profile.owners[sequence % profile.owners.length],
    };
  });
}

function generatedCampaigns(projectId: string, existing: SeedCampaign[]): SeedCampaign[] {
  const profile = CONTENT_PROFILES[projectId];
  if (!profile) return [];
  const channels: Channel[] = ['Search', 'Social', 'Email', 'Paid'];
  const statuses: SeedCampaign['status'][] = ['Active', 'Active', 'Scheduled', 'Ended'];
  const initiatives = ['Demand capture', 'Audience nurture', 'Category education', 'Conversion retargeting', 'Launch support', 'Partner activation'];

  return Array.from({ length: Math.max(0, CAMPAIGNS_PER_PROJECT - existing.length) }, (_, index) => {
    const sequence = existing.length + index;
    const status = statuses[sequence % statuses.length];
    const budget = 800 + (sequence % 8) * 350;
    const spent = status === 'Scheduled' ? 0 : Math.round(budget * (status === 'Ended' ? 0.96 : 0.62));
    return {
      name: `${profile.label} ${initiatives[sequence % initiatives.length]} ${String(sequence + 1).padStart(2, '0')}`,
      channel: channels[sequence % channels.length],
      status,
      budget,
      spent,
      impressions: status === 'Scheduled' ? 0 : 9000 + sequence * 730,
      clicks: status === 'Scheduled' ? 0 : 90 + (sequence % 11) * 18,
      conversions: status === 'Scheduled' ? 0 : 1 + (sequence % 6),
      owner: profile.owners[sequence % profile.owners.length],
      notes: `Planned ${initiatives[sequence % initiatives.length].toLowerCase()} activity with a documented optimization checkpoint.`,
      startOffset: status === 'Ended' ? -120 + sequence : -28 + sequence,
      endOffset: status === 'Ended' ? -30 + sequence : 20 + sequence,
    };
  });
}

function generatedApprovals(projectId: string, existing: SeedApproval[]): SeedApproval[] {
  const profile = CONTENT_PROFILES[projectId];
  if (!profile) return [];
  const requestTypes: SeedApproval['requestType'][] = ['Creative', 'Copy', 'Budget', 'Strategy', 'Video'];
  const statuses: SeedApproval['status'][] = ['Pending', 'Approved', 'Approved', 'Rejected'];
  const subjects = ['campaign brief', 'creative concept', 'media plan', 'landing page copy', 'customer story', 'launch video'];

  return Array.from({ length: Math.max(0, APPROVALS_PER_PROJECT - existing.length) }, (_, index) => {
    const sequence = existing.length + index;
    const requestType = requestTypes[sequence % requestTypes.length];
    const subject = subjects[sequence % subjects.length];
    return {
      id: `apv_${projectId}_generated_${sequence}`,
      title: `${profile.label} ${subject} ${String(sequence + 1).padStart(2, '0')}`,
      type: `${requestType} review`,
      requestType,
      status: statuses[sequence % statuses.length],
      submittedBy: profile.owners[sequence % profile.owners.length],
      submittedOffsetDays: -1 - sequence * 2,
      thumbnailColor: profile.color,
      summary: `Approval request for the next ${subject} deliverable.`,
      details: `This item captures the proposed ${subject}, supporting rationale, and the implementation steps that follow approval.`,
      pros: 'Aligned to the active project plan and ready for the next workstream.',
      cons: 'Requires a final owner review before publication or spend is committed.',
      recommendation: 'Approve if the current scope and timing remain valid.',
      attachments: 'Working file, review notes, delivery checklist',
      comments: [{ author: 'Alex Morgan', message: 'Reviewed against the current project plan.', offsetHours: -12 - sequence * 4 }],
    };
  });
}

function generatedRecipients(projectId: string, existing: string[]): string[] {
  const domain = projectId === 'prj_lumen' ? 'lumenlabs.com' : projectId === 'prj_northpeak' ? 'northpeak.co' : 'vaultline.de';
  return Array.from({ length: Math.max(0, 12 - existing.length) }, (_, index) => `stakeholder${String(index + 1).padStart(2, '0')}@${domain}`);
}

const BASE_CAMPAIGNS = mergeSeedRecords(CAMPAIGNS, EXTRA_CAMPAIGNS);
const BASE_TASKS = mergeSeedRecords(TASKS, EXTRA_TASKS);
const BASE_EVENTS = mergeSeedRecords(EVENTS, EXTRA_EVENTS);
const BASE_APPROVALS = mergeSeedRecords(APPROVALS, EXTRA_APPROVALS);
const SEEDED_CAMPAIGNS = Object.fromEntries(
  Object.entries(BASE_CAMPAIGNS).map(([projectId, records]) => [projectId, [...records, ...generatedCampaigns(projectId, records)]]),
) as Record<string, SeedCampaign[]>;
const SEEDED_TASKS = Object.fromEntries(
  Object.entries(BASE_TASKS).map(([projectId, records]) => [projectId, [...records, ...generatedTasks(projectId, records)]]),
) as Record<string, SeedTask[]>;
const SEEDED_EVENTS = Object.fromEntries(
  Object.entries(BASE_EVENTS).map(([projectId, records]) => [projectId, [...records, ...generatedEvents(projectId, records)]]),
) as Record<string, SeedEvent[]>;
const SEEDED_APPROVALS = Object.fromEntries(
  Object.entries(BASE_APPROVALS).map(([projectId, records]) => [projectId, [...records, ...generatedApprovals(projectId, records)]]),
) as Record<string, SeedApproval[]>;
const SEEDED_RECIPIENTS = Object.fromEntries(
  Object.entries(RECIPIENTS).map(([projectId, records]) => [projectId, [...records, ...generatedRecipients(projectId, records)]]),
) as Record<string, string[]>;

function seedProjectMembers(
  run: (sql: string, ...params: SqlValue[]) => void,
  projectId: string,
  members: readonly string[],
): void {
  for (const memberId of members) {
    run('INSERT INTO project_members (project_id, member_id) VALUES (?, ?)', projectId, memberId);
  }
}

/** Wipes and repopulates every table. Callers pass the platform SQL driver. */
export function seed(driver: SqlDriver): void {
  const run = (sql: string, ...params: SqlValue[]) => driver.run(sql, params);

  transaction(driver, () => {
    for (const table of TABLES) driver.exec(`DELETE FROM ${table}`);

    for (const member of MEMBERS) {
      run(
        'INSERT INTO team_members (id, name, email, role, avatar_color) VALUES (?, ?, ?, ?, ?)',
        member.id,
        member.name,
        member.email,
        member.role,
        member.color,
      );
    }

    for (const project of PROJECTS) {
      run(
        `INSERT INTO projects (id, name, client_name, type, status, brand_primary, brand_accent, created_at, top_kpi_label, top_kpi_value)
         VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)`,
        project.id,
        project.name,
        project.clientName,
        project.type,
        project.brandPrimary,
        project.brandAccent,
        project.createdAt,
        project.topKpiLabel,
        project.topKpiValue,
      );
      seedProjectMembers(run, project.id, project.members);

      for (const [index, kpi] of (KPIS[project.id] ?? []).entries()) {
        run(
          'INSERT INTO kpi_snapshots (id, project_id, metric, current_value, previous_value, sparkline) VALUES (?, ?, ?, ?, ?, ?)',
          `kpi_${project.id}_${index}`,
          project.id,
          kpi.metric,
          kpi.current,
          kpi.previous,
          JSON.stringify(kpi.sparkline),
        );
      }

      for (const [index, point] of timeSeriesFor(project.id).entries()) {
        run(
          'INSERT INTO time_series (id, project_id, month_start, traffic, conversions, spend, leads) VALUES (?, ?, ?, ?, ?, ?, ?)',
          `ts_${project.id}_${index}`,
          project.id,
          point.month,
          point.traffic,
          point.conversions,
          point.spend,
          point.leads,
        );
      }

      for (const [index, channel] of (CHANNEL_MIX[project.id] ?? []).entries()) {
        run(
          'INSERT INTO channel_breakdowns (id, project_id, channel, visits, conversions, spend, cost_per_lead) VALUES (?, ?, ?, ?, ?, ?, ?)',
          `chn_${project.id}_${index}`,
          project.id,
          channel.channel,
          channel.visits,
          channel.conversions,
          channel.spend,
          channel.costPerLead,
        );
      }

      for (const [index, annotation] of (ANNOTATIONS[project.id] ?? []).entries()) {
        run(
          'INSERT INTO timeline_annotations (id, project_id, annotation_date, label, note, author) VALUES (?, ?, ?, ?, ?, ?)',
          `ann_${project.id}_${index}`,
          project.id,
          isoDate(annotation.offsetDays),
          annotation.label,
          annotation.note,
          annotation.author,
        );
      }

      for (const [index, goal] of (GOALS[project.id] ?? []).entries()) {
        run(
          'INSERT INTO goals (id, project_id, label, target_value, current_value, unit, period) VALUES (?, ?, ?, ?, ?, ?, ?)',
          `goal_${project.id}_${index}`,
          project.id,
          goal.label,
          goal.target,
          goal.current,
          goal.unit,
          goal.period,
        );
      }

      for (const [index, lead] of (SEEDED_LEADS[project.id] ?? []).entries()) {
        const leadId = `lead_${project.id}_${index}`;
        const slug = lead.name.toLowerCase().replace(/[^a-z]+/g, '.');
        const domain = lead.company === 'Individual customer' ? 'mail.com' : `${lead.company.toLowerCase().replace(/[^a-z]+/g, '')}.com`;
        const contactedOffset = lead.status === 'New' ? lead.ageDays : Math.max(0, Math.round(lead.ageDays / 3));
        run(
          `INSERT INTO leads (id, project_id, name, email, company, phone, source, status, estimated_value, captured_from, assigned_team_member, created_at, last_contacted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          leadId,
          project.id,
          lead.name,
          `${slug}@${domain}`,
          lead.company,
          `+1-555-${String(2100 + index).padStart(4, '0')}`,
          lead.source,
          lead.status,
          lead.value,
          lead.capturedFrom,
          lead.owner,
          isoStamp(-lead.ageDays * 24),
          isoStamp(-contactedOffset * 24),
        );

        run(
          'INSERT INTO lead_activities (id, lead_id, project_id, activity_type, content, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          `act_${leadId}_0`,
          leadId,
          project.id,
          'Form submission',
          `${lead.name} entered from ${lead.capturedFrom}.`,
          'System',
          isoStamp(-lead.ageDays * 24),
        );

        if (lead.status !== 'New') {
          run(
            'INSERT INTO lead_activities (id, lead_id, project_id, activity_type, content, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            `act_${leadId}_1`,
            leadId,
            project.id,
            'Status change',
            `Lead moved to ${lead.status}.`,
            lead.owner,
            isoStamp(-contactedOffset * 24),
          );
        }
      }

      for (const [index, campaign] of (SEEDED_CAMPAIGNS[project.id] ?? []).entries()) {
        run(
          `INSERT INTO campaigns (id, project_id, name, channel, status, start_date, end_date, budget, spent, impressions, clicks, conversions, owner, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          `cmp_${project.id}_${index}`,
          project.id,
          campaign.name,
          campaign.channel,
          campaign.status,
          isoDate(campaign.startOffset),
          isoDate(campaign.endOffset),
          campaign.budget,
          campaign.spent,
          campaign.impressions,
          campaign.clicks,
          campaign.conversions,
          campaign.owner,
          campaign.notes,
        );
      }

      for (const [index, task] of (SEEDED_TASKS[project.id] ?? []).entries()) {
        run(
          `INSERT INTO tasks (id, project_id, title, description, column_name, assignee, due_date, priority, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          `tsk_${project.id}_${index}`,
          project.id,
          task.title,
          task.description,
          task.column,
          task.assignee,
          isoDate(task.dueOffset),
          task.priority,
          task.notes,
        );
      }

      for (const [index, event] of (SEEDED_EVENTS[project.id] ?? []).entries()) {
        run(
          'INSERT INTO calendar_events (id, project_id, title, channel, event_date, status, assignee) VALUES (?, ?, ?, ?, ?, ?, ?)',
          `evt_${project.id}_${index}`,
          project.id,
          event.title,
          event.channel,
          dayThisMonth(event.day),
          event.status,
          event.assignee,
        );
      }

      for (const approval of SEEDED_APPROVALS[project.id] ?? []) {
        run(
          `INSERT INTO approvals (id, project_id, title, type, request_type, thumbnail_color, status, submitted_by, submitted_at, summary, details, pros, cons, recommendation, attachments)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          approval.id,
          project.id,
          approval.title,
          approval.type,
          approval.requestType,
          approval.thumbnailColor,
          approval.status,
          approval.submittedBy,
          isoStamp(approval.submittedOffsetDays * 24),
          approval.summary,
          approval.details,
          approval.pros,
          approval.cons,
          approval.recommendation,
          approval.attachments,
        );

        for (const [index, comment] of approval.comments.entries()) {
          run(
            'INSERT INTO approval_comments (id, approval_id, author, message, created_at) VALUES (?, ?, ?, ?, ?)',
            `cmt_${approval.id}_${index}`,
            approval.id,
            comment.author,
            comment.message,
            isoStamp(comment.offsetHours),
          );
        }
      }

      const reportId = `rpt_${project.id}`;
      run(
        `INSERT INTO report_configs (id, project_id, included_sections, frequency, internal_review_first, last_sent_at, engagement_stats)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        reportId,
        project.id,
        JSON.stringify(REPORT_SECTIONS),
        project.id === 'prj_vaultline' ? 'Monthly' : 'Weekly',
        1,
        isoStamp(-72),
        JSON.stringify({ opens: 42, downloads: 16, lastOpenedDate: isoDate(-2) }),
      );
      for (const email of SEEDED_RECIPIENTS[project.id] ?? []) {
        run('INSERT INTO report_recipients (report_config_id, email) VALUES (?, ?)', reportId, email);
      }
    }

    run(
      'INSERT INTO agency_settings (id, agency_name, logo_placeholder, notifications, integrations, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      'agency_ledger',
      'Ledger Studio',
      'LS',
      JSON.stringify({ approvals: true, reports: true, tasks: false }),
      JSON.stringify([
        { id: 'google-ads', name: 'Google Ads', connected: true },
        { id: 'meta-ads', name: 'Meta Ads', connected: true },
        { id: 'hubspot', name: 'HubSpot', connected: false },
      ]),
      new Date().toISOString(),
    );
  });
}
