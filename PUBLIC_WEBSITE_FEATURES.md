# Ledger — Product and Feature Specification

## What Ledger is

Ledger is a project-centric operating system for marketing agencies. It gives every client a dedicated workspace where the agency can manage performance, lead generation, campaign delivery, content, tasks, approvals, reporting, and team ownership.

Ledger is designed around the full client lifecycle: a lead arrives, the agency tracks and qualifies it, campaigns are monitored, delivery work is assigned, content is scheduled, decisions are approved, and results are presented in a client-safe summary.

**Suggested public positioning:**

> **Every client, on the record.**
>
> Ledger brings every conversation, campaign, milestone, and performance signal into one client workspace, so nothing about your clients slips through the cracks.

## Product at a glance

- One workspace for every client or project.
- A project-scoped CRM and visual lead pipeline.
- Campaign performance, budget pacing, and channel attribution.
- A task workflow for operational delivery.
- A monthly content calendar.
- Approval requests, decisions, and comments.
- Configurable client-report settings and engagement tracking.
- A separate read-only client view.
- Project-level team assignment and workload context.
- A global inbox for approvals awaiting decisions and tasks in review.
- Offline-first native data storage, with an optional shared HTTP API for browser and multi-device use.

## Platform, data, and app architecture

### Application platform

- Built with React Native, TypeScript, Expo SDK 54, and Expo Router.
- Uses a portrait-first mobile interface with bottom-tab navigation and project sub-navigation.
- Uses React Query for server/data cache management and Zustand for the persisted demo session and active role.
- Uses native-style bottom sheets, form controls, status pills, confirmation dialogs, pull-to-refresh, loading states, error states, and empty states throughout the app.
- Uses custom SVG charts for sparklines, area trends, multi-line trends, and paired-bar comparisons.
- Light theme only; colours and design tokens are centralized.

### Two supported data sources

Ledger has one data contract and two interchangeable data sources. The screens do not need to know which one is active.

1. **Embedded SQLite mode — default for native builds**
   - Stores data in SQLite inside the app on the device.
   - Works offline without a server.
   - A standalone Android build has its own independent data set.
   - The user can reset the device’s demo data from Settings.

2. **HTTP API mode — for browser and shared data use**
   - Uses an Express and SQLite backend with the same contract as the embedded data layer.
   - Supports one shared data set across devices.
   - Enables Ledger to run in a web browser.

The embedded SQLite implementation is native-only. A web deployment needs the HTTP API mode.

### Demo data

The seed data is generated relative to the current date, so calendars, boards, due dates, and reporting views remain current-looking. The demo contains:

- 3 client projects.
- 8 team members.
- 32 leads, including activity timelines.
- 13 campaigns.
- 17 tasks across To Do, In Progress, Review, and Done.
- 21 calendar items.
- 7 approval requests with comments.
- Per-project report configurations and recipients.
- 12 months of traffic, conversion, spend, and lead data.
- Channel breakdowns, KPI snapshots, and client goals.

The three seeded project scenarios are:

- **Lumen Skincare / Lumen Labs** — DTC e-commerce brand launch.
- **Northpeak Outdoor Co.** — retail and outdoor-apparel brand.
- **Vaultline / Vaultline GmbH** — B2B fintech SaaS.

## Navigation and workspace structure

### Agency-level navigation

The main bottom navigation contains:

- **Projects** — every client workspace in one place.
- **Inbox** — approvals needing a decision and tasks currently in review.
- **Team** — agency roster and project assignments.
- **Settings** — agency profile, notifications, integrations, data-source information, reset, and sign-out. This tab is hidden for Members.

### Project workspace navigation

Each project contains:

- **Overview**
- **Leads**
- **Tasks**
- **Content calendar**
- **More**, which links to Campaigns, Approvals, Reports, Project team, Project settings, and Client view.

## Client projects

### Project list

The Projects screen is the agency’s portfolio view. Every project card displays:

- Project name.
- Client name.
- Project status.
- Project type.
- Lead count.
- A featured KPI label and value.
- Campaign count.
- Task count.
- Team-member count.
- Project accent colour.

The screen supports pull-to-refresh, loading, retry, and an empty state for a new agency.

### Project creation

Admins and Managers can create a project. The project-creation form includes:

- Project name — required.
- Client name — required.
- Project type — selected from supported project types.
- Brand primary colour — validated hexadecimal value.
- Brand accent colour — validated hexadecimal value.

Supported project types are:

- DTC e-commerce brand launch.
- Retail / outdoor apparel brand.
- B2B fintech SaaS.
- Lead generation programme.
- Brand awareness retainer.

New projects default to **Active** and automatically receive a default **weekly report configuration**.

### Project settings and branding

Project settings allow authorized users to manage:

- Project name.
- Client name.
- Project type.
- Project status: Active, Paused, or Archived.
- Primary and accent brand colours.
- A live brand preview.
- Project creation date.
- Assigned-team list.

Project-settings editing is available to Admins and Managers. Members can view the project settings screen but cannot edit its values.

## Project overview and performance reporting

The Overview screen is an executive snapshot of a client workspace. It includes:

- The reporting period and comparison label.
- KPI cards showing current value, previous value, change, captions, and sparklines.
- Twelve months of performance data.
- Leads by channel.
- Lead-pipeline conversion funnel.
- Top campaigns.
- Upcoming and overdue tasks.
- Recent lead activity.
- Project team.
- CSV export through the operating system’s share sheet.

### KPI and time-series analysis

The overview tracks and presents these time-series dimensions:

- Traffic.
- Leads.
- Conversions.
- Spend.

Users can switch between two twelve-month visualizations:

- **Separate:** individual area charts for leads, conversions, and spend.
- **Indexed:** a multi-line chart where the first month is indexed to 100, allowing metrics with different units to be compared on a shared scale.

### Channel performance

The overview breaks performance down across:

- Search.
- Social.
- Email.
- Paid.

For each channel it can hold visits, conversions, spend, and cost per lead. The interface displays attributed conversions and each channel’s proportional share of total channel conversions.

### Lead funnel

The funnel shows counts and conversion flow through:

- New.
- Contacted.
- Qualified.
- Won.

The screen displays each stage’s share of all leads and, after the first stage, its conversion from the previous stage. Lost leads are retained in the CRM and overall conversion calculation but are not rendered as a forward pipeline funnel stage.

### Top-campaign and task rollups

The overview provides quick links to Campaigns and Tasks and displays:

- Campaign name and channel.
- Conversions.
- Spend.
- Spend versus budget.
- Cost per acquisition when a campaign has conversions.
- Upcoming task title, assignee, due date, workflow column, priority, and overdue state.

### Overview export

The Export action generates CSV content in memory and passes it to the device share sheet. The export includes:

- Current and previous KPI values.
- Pipeline stages, lead counts, and share of total.
- Top campaign, channel, spend, budget, and conversion data.

It does not write a separate file to app storage.

## Leads CRM

Ledger includes a CRM scoped to each project.

### Lead record

Each lead has:

- Name.
- Email address.
- Company.
- Phone number.
- Lead source.
- Pipeline status.
- Estimated value, which may be blank.
- Capture point or source detail.
- Assigned team member.
- Creation date.
- Last-contacted date.
- An activity timeline.

If no company is entered when creating a lead, Ledger uses **Individual customer**.

### Supported lead sources

- Website form.
- Email signup.
- Organic search.
- Paid ad.
- Referral.
- Event.
- Trade show.
- Webinar.
- Outbound.

### Lead statuses

- New.
- Contacted.
- Qualified.
- Won.
- Lost.

### CRM list, search, and filters

The leads screen provides:

- Summary values for total leads, New, Contacted, Qualified, Won, and conversion rate.
- Search by lead name, company, or email.
- Filter by status.
- Filter by source.
- Filter by owner.
- A tabular list view.
- A visual pipeline view.

The table displays lead identity, source, assigned person, estimated value, last-contacted date, and current status.

### Visual lead pipeline

The Pipeline view has columns for every lead status, including Lost. It displays:

- Lead count per column.
- Total estimated value per column.
- Lead card with name, source, owner avatar, and estimated value.
- Drag-and-drop movement between pipeline stages.

### Lead detail, activity, and notes

The lead detail sheet displays all lead fields, current status, and the full timeline. Users can:

- Change lead status.
- Add a free-form timeline entry.
- View activity type, text, author, and relative time.
- Delete the lead with confirmation.

Changing a lead status automatically:

- Updates `lastContactedAt`.
- Adds a status-change entry to the lead’s activity timeline.

Creating a lead also creates its initial record; seeded leads include a form-submission timeline entry.

## Campaign management

Campaigns are project-scoped and combine operational setup with performance figures.

### Campaign record

Each campaign includes:

- Name.
- Channel: Search, Social, Email, or Paid.
- Status: Active, Scheduled, or Ended.
- Start and end dates.
- Budget.
- Spend.
- Impressions.
- Clicks.
- Conversions.
- Project-team owner.
- Notes.

The form validates required campaign name and owner, valid dates, an end date no earlier than the start date, and numeric metric fields.

### Campaign list and analysis

The Campaigns screen shows:

- Project totals for campaign count, budget, spend, and conversions.
- Status filters.
- Channel filters.
- Sort by spend, conversions, or name.
- Number of campaigns visible after filtering.

Each campaign card displays:

- Campaign name, channel, and status.
- Budget pacing bar.
- Percentage of budget spent.
- Spend versus budget.
- Impressions.
- Clicks.
- Click-through rate.
- Conversions.

Pacing is calculated as spend divided by budget, capped visually at 150% so overspend remains visible. CTR is clicks divided by impressions. Cost per acquisition is spend divided by conversions when a campaign has conversions.

### Campaign detail and actions

The campaign detail form also shows:

- Spend.
- Clicks.
- CTR.
- Pacing.
- A weekly clicks-versus-conversions bar chart.

Users can create, edit, and delete campaigns. Deleting a campaign removes its spend and conversions from project-performance calculations.

## Tasks and delivery workflow

Ledger includes a project-delivery workflow built around four task columns:

- To Do.
- In Progress.
- Review.
- Done.

### Task record

Each task contains:

- Title.
- Description.
- Workflow column.
- Assignee selected from the assigned project team.
- Due date.
- Priority: High, Medium, or Low.
- Optional working notes.

Title, description, assignee, and valid due date are required.

### Task board

The task screen supports:

- A Table mode that shows one full-width workflow column at a time.
- A Pipeline mode that shows all four columns side by side.
- Assignee filtering.
- Task count for each workflow column.
- Create, edit, and delete task workflows.
- Single-tap controls to move a task to the previous or next workflow stage.

Task cards show title, description, priority, assignee, due date, and movement actions.

### Overdue task rules

A task is overdue when:

- Its due date is before today; and
- Its workflow column is not Done.

Overdue tasks receive a danger treatment and appear in the overview’s due-next section. Tasks in Review also populate the global inbox.

## Content calendar

The Content calendar manages scheduled client work across Search, Social, Email, and Paid channels.

### Calendar item record

Each item has:

- Title.
- Channel.
- Status: Draft, Scheduled, or Published.
- Date.
- Owner selected from the assigned project team.

Title, date, and owner are required.

### Calendar views

The calendar supports:

- Month-by-month navigation.
- Calendar-grid view.
- Agenda-list view.
- A Sunday-first month grid.
- Current-day highlighting.
- Channel colour legend.
- Up to two visible content chips per day, plus a “more” indicator for additional items.
- Day-detail sheet listing every item scheduled for a selected date.
- Quick creation of a content item pre-filled with the selected date.

Agenda rows display title, channel, assignee, date, and status.

### Overdue content rules

A calendar item is overdue when:

- Its date is before today; and
- Its status is not Published.

Such items are labeled as past due and not published.

Users can create, edit, and delete calendar items.

## Approval workflow

Ledger centralizes decisions that need a clear review trail.

### Approval request types

- Creative.
- Copy.
- Budget.
- Strategy.
- Video.

### Approval record

An approval request includes:

- Title.
- Request type and display type.
- A visual thumbnail colour.
- Pending, Approved, or Rejected status.
- Submitter and submission date.
- Summary.
- Full details.
- Arguments for and against.
- Recommendation.
- Attachment label or reference.
- Comments with author, message, and timestamp.

### Approval actions

Users can:

- Filter requests by status.
- Submit a request.
- Quickly approve a request from the list.
- Open the full review sheet.
- Approve, reject, or otherwise change the request decision.
- Read attachment information.
- Add comments explaining a decision or providing review feedback.
- Delete a request and all of its comments, after confirmation.

New requests always begin as **Pending**, which puts them directly into the global Inbox.

The request form requires title, submitter, summary, and details. It can also include optional arguments for, arguments against, and a recommendation.

## Global Inbox

The Inbox is a derived, action-oriented queue rather than a manually curated notification list.

It contains:

- Every pending approval request.
- Every task currently in Review.

The Inbox displays:

- Counts for pending approvals and tasks in review.
- Global unread count, defined as the sum of those two counts.
- Project name, item title, detail, timestamp, and destination.
- Deep links to the relevant project’s Approvals or Tasks screen.

The inbox badge on the agency navigation uses the same unread count.

## Reports and client communication

Each project has a report configuration used to shape recurring client reporting.

### Report design

The Design tab lets users manage the included report sections by:

- Viewing the sections in their current output order.
- Moving a section up.
- Moving a section down.
- Removing a section.

The current interface does not provide an action to add a removed section back; it can only reorder or remove existing sections.

### Report schedule and recipients

The Schedule tab supports:

- Frequency: Daily, Weekly, or Monthly.
- Internal review first toggle, which holds a report for an internal check before it reaches the client.
- Recipient list.
- Adding a recipient with email-address validation.
- Removing recipients.
- Manual “Send now” action.

### Report activity

The Activity tab shows:

- Opens.
- Downloads.
- Last opened date.
- Last sent date.
- Weekly opens-versus-downloads comparison chart.
- Frequency.
- Internal-review state.
- Recipient count.
- Included-section summary.

In the present implementation, Send now records the send timestamp. No email-delivery provider is connected, so reports are not actually emailed.

## Client-safe view

Every project contains a dedicated read-only client view, designed for sharing in client meetings.

It displays:

- Client name, project name, and project type.
- Read-only status notice.
- Traffic over the last twelve months.
- Attributed conversions.
- Cost per lead.
- Return on spend.
- Monthly traffic trend chart.
- Goals with current progress, target, unit, period, progress bar, and percentage of target.
- Total spend over the past twelve months and return-on-spend summary.

No action on this screen mutates data.

Return on spend is stored as a KPI snapshot because the current schema does not model revenue.

## Team management and ownership

Ledger includes both agency-level and project-level team management.

### Agency team

The seeded agency has members in three roles:

- Admin.
- Manager.
- Member.

Team views can show:

- Name.
- Email address.
- Avatar colour.
- Role.
- Number of assigned projects.
- Number of open tasks.
- List of assigned projects and each project’s client.

### Project assignment

For any project, the team screen separates people into:

- Assigned members.
- Available agency members.

It provides counts for:

- Members on the project.
- Members available to be assigned.
- Total people in the agency.

Authorized users can assign or unassign members.

### Unassignment safeguard

If an assigned person owns unfinished tasks in that project, Ledger does not silently remove them. It returns a confirmation requirement that includes:

- The person’s name.
- Count of open tasks they own.
- Up to four example task titles and due dates.

An authorized user must explicitly choose to unassign anyway. Doing so can leave those tasks without an owner.

## Roles and permissions

The active role can be switched in the demo session card on the Projects screen.

| Capability | Admin | Manager | Member |
| --- | --- | --- | --- |
| View workspace Settings | Yes | Yes | No |
| Create projects | Yes | Yes | No |
| Edit project settings | Yes | Yes | No |
| Assign or unassign project team members | Yes | Yes | No |
| Delete records | Yes | Yes | Yes |
| Make approval decisions | Yes | Yes | Yes |

The implementation centralizes these capabilities in one permission map rather than scattering role checks across screens.

## Agency settings

The Settings area includes:

- Agency name and logo placeholder.
- Date last updated.
- Signed-in user name, email, avatar, and role.
- Approval-notification toggle.
- Report-notification toggle.
- Review-stage-task notification toggle.
- Integration connection-status toggles.
- Active data-source explanation.
- Sign out.
- Reset demo data in supported embedded native builds.

The seeded integrations are:

- Google Ads — connected.
- Meta Ads — connected.
- HubSpot — not connected.

The current integration controls store a connected/not-connected state. They do not perform live third-party OAuth or data synchronization.

Reset demo data replaces every locally stored project, lead, task, campaign, calendar item, approval, and associated data with the original seed data. It is available only in embedded native mode, not in web/HTTP mode.

## Authentication and session behavior

The current sign-in experience is explicitly demo-only:

- Any well-formed email address and non-empty password opens the demo workspace.
- Session data is persisted locally on the device using AsyncStorage.
- Sign-out clears the persisted local session.
- The returned token is not verified on subsequent requests.
- There is no refresh-token flow or production identity-provider integration.

This should be presented as **demo access**, not production-grade authentication.

## Derived metrics and business rules

Ledger computes several values from live records instead of storing separate copies. This means a create, update, or delete is reflected immediately in the related summaries.

- **Cost per lead:** total campaign spend divided by lead count.
- **Conversions:** sum of campaign conversions.
- **Lead conversion rate:** Won leads divided by all leads.
- **Campaign pacing:** campaign spend divided by campaign budget.
- **CTR:** clicks divided by impressions.
- **Campaign CPA:** spend divided by conversions when conversions are greater than zero.
- **Global unread count:** pending approvals plus tasks in Review.
- **Overdue task:** past due and not Done.
- **Overdue calendar item:** past date and not Published.
- **Lead status update:** updates last-contacted time and adds timeline activity.
- **Project creation:** creates a default weekly report configuration.
- **Team unassignment with open work:** requires explicit confirmation.

## HTTP API surface

When operating in HTTP mode, the Express API exposes these routes:

| Area | Routes |
| --- | --- |
| Authentication | `POST /api/auth/sign-in` |
| Projects | `GET/POST /api/projects`; `GET/PATCH /api/projects/:id`; `GET /api/projects/:id/overview`; `GET /api/projects/:id/client-view` |
| Leads | `GET/POST /api/projects/:id/leads`; `GET/PATCH/DELETE /api/leads/:id`; `POST /api/leads/:id/notes` |
| Tasks | `GET/POST /api/projects/:id/tasks`; `PATCH/DELETE /api/tasks/:id` |
| Campaigns | `GET/POST /api/projects/:id/campaigns`; `GET/PATCH/DELETE /api/campaigns/:id` |
| Calendar | `GET/POST /api/projects/:id/calendar`; `PATCH/DELETE /api/calendar-events/:id` |
| Approvals | `GET/POST /api/projects/:id/approvals`; `GET/PATCH/DELETE /api/approvals/:id`; `POST /api/approvals/:id/comments` |
| Reports | `GET/PATCH /api/projects/:id/report`; `POST /api/projects/:id/report/send`; `POST/DELETE /api/projects/:id/report/recipients` |
| Team | `GET /api/team`; `GET /api/team/:id`; `GET /api/projects/:id/team`; `POST /api/projects/:id/team/:memberId/toggle` |
| Settings | `GET/PATCH /api/settings`; `POST /api/settings/notifications/:key`; `POST /api/settings/integrations/:id` |
| Inbox | `GET /api/inbox` |

## Current scope limits — important for public accuracy

- This is not yet a production-authenticated multi-tenant SaaS product. Authentication is demo-only.
- Embedded data is local to each device. Separate standalone installations do not automatically share a database.
- Browser use requires the HTTP API data source, because embedded Expo SQLite is native-only.
- Sending a report records a timestamp only; no email is delivered.
- Integration switches do not yet connect to live Google Ads, Meta Ads, or HubSpot accounts.
- Approval attachments are displayed as stored attachment text or references; there is no file-upload workflow in the current interface.
- There is no dark mode in the current app.
- The task board uses explicit move actions instead of task drag-and-drop; this is intentional for phone readability.
- The lead pipeline does support drag-and-drop between statuses.
- Overview export uses the share sheet and CSV text; it does not generate or persist a file.
- Resetting embedded demo data permanently replaces local records with the seed data.

## Recommended website message hierarchy

### Hero

**Every client, on the record.**

One workspace for leads, campaigns, delivery, approvals, reporting, and the people responsible for each outcome.

### Supporting message

Ledger is the agency operating system that connects what is being planned, what is being delivered, and what is performing — client by client.

### Six feature themes for the public site

1. **One workspace per client** — project identity, branding, performance, work, and ownership in one place.
2. **From lead to outcome** — capture, qualify, assign, and move leads through a visible pipeline.
3. **Performance with context** — campaigns, budgets, pacing, channel results, and long-term trends together.
4. **Delivery that stays moving** — tasks, due dates, priorities, review queues, and content calendar in one operational view.
5. **Decisions with a trail** — structured approval requests, recommendations, comments, and clear decision status.
6. **Client-ready reporting** — configurable reporting and a separate read-only view that is safe to share.

### Strongest differentiator

Ledger is more than a dashboard and more than a task manager. Its defining value is that it combines agency operations and marketing performance in one project workspace, from first lead through client reporting.
