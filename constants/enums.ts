export const ROLES = ['Admin', 'Manager', 'Member'] as const;
export const CHANNELS = ['Search', 'Social', 'Email', 'Paid'] as const;
export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'] as const;
export const LEAD_PIPELINE_STAGES = ['New', 'Contacted', 'Qualified', 'Won'] as const;
export const LEAD_SOURCES = [
  'Website form',
  'Email signup',
  'Organic search',
  'Paid ad',
  'Referral',
  'Event',
  'Trade show',
  'Webinar',
  'Outbound',
] as const;
export const CAMPAIGN_STATUSES = ['Active', 'Scheduled', 'Ended'] as const;
export const TASK_COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'] as const;
export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const EVENT_STATUSES = ['Draft', 'Scheduled', 'Published'] as const;
export const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export const REQUEST_TYPES = ['Creative', 'Copy', 'Budget', 'Strategy', 'Video'] as const;
export const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'] as const;
export const PROJECT_STATUSES = ['Active', 'Paused', 'Archived'] as const;
export const PROJECT_TYPES = [
  'DTC e-commerce brand launch',
  'Retail / outdoor apparel brand',
  'B2B fintech SaaS',
  'Lead generation programme',
  'Brand awareness retainer',
] as const;

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
