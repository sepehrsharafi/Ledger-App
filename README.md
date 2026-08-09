# Ledger

Project-centric agency operations app for a marketing agency: multi-project workspaces with
dashboards, a leads CRM, campaigns, a content calendar, task workflow, approvals, report
configuration, team assignment and a client-safe summary view.

The mobile app is **React Native (Expo SDK 54) + TypeScript + expo-router**. Data lives in a
**SQLite database embedded in the app** (`expo-sqlite`), so a standalone APK works offline with
no server. There is no mock layer — the same schema, seed and queries run on device.

An optional Express backend in `server/` implements the identical contract over HTTP if you ever
want several devices sharing one dataset. See [Two data sources](#two-data-sources).

## Running it

```bash
npm install
npm start
```

Press `a` for Android, `i` for iOS, or scan the QR code with Expo Go. The database is created and
seeded on first launch. Sign in with any well-formed email and any non-empty password.

> Web is not supported in embedded mode — `expo-sqlite` is native-only. To run in a browser, use
> HTTP mode: `EXPO_PUBLIC_USE_LOCAL_API=true npm run dev`.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server (embedded database) |
| `npm run dev` | API **and** Expo together, for HTTP mode |
| `npm run test:data` | Runs the embedded data layer against Node's SQLite — 97 checks |
| `npm run typecheck` | `tsc --noEmit` for the app |
| `npm run lint` | ESLint |
| `npm run api` | API alone, in watch mode |
| `npm run api:seed` | Wipe and reseed the server's database |

## Android production deployment with EAS

`eas.json` now splits QA installs from store releases:

- `development` and `preview` build installable Android APKs
- `production` builds a Google Play-ready Android App Bundle (`.aab`) and auto-increments the remote app version

First-time setup:

```bash
npx eas login
npx eas build:configure
```

Build the production bundle:

```bash
npx eas build --platform android --profile production
```

Submit that build to Google Play:

```bash
npx eas submit --platform android --profile production
```

Release notes:

- `app.json` already sets the package id to `com.ledgerstudio.ledger`.
- `cli.appVersionSource` is `remote`, so EAS manages the Android version code on production builds.
- Cleartext traffic is enabled only for local HTTP mode. A real shared backend should be served over HTTPS before release.
- Keep using `preview` when you need a sideloadable APK for device QA.

Data notes for a real install:

- The database lives in the app's private storage. Uninstalling the app deletes it.
- **Reset demo data** in Settings restores the original sample data.
- `DATA_VERSION` in `lib/db/setup.ts` is stored in SQLite's `user_version`. Bump it when you
  change the schema or seed and existing installs will rebuild their database on next launch
  instead of querying stale tables.

## Two data sources

Both satisfy one contract (`lib/api/contract.ts`), so screens never know which is active:

| Mode | When | How |
| --- | --- | --- |
| **Embedded** (default) | Standalone APK, offline use | `lib/db/` — schema, seed and repository on `expo-sqlite` |
| **HTTP** | Shared data across devices, web | Set `EXPO_PUBLIC_API_URL`, or `EXPO_PUBLIC_USE_LOCAL_API=true` in dev |

The switch is one line in `lib/api/index.ts`; Settings shows which source the build is using.

## Structure

```
app/                      expo-router routes
  login.tsx               demo sign-in
  (tabs)/                 Projects · Inbox · Team · Settings
  project/[projectId]/
    (workspace)/          Overview · Leads · Tasks · Calendar · More (bottom tabs)
    campaigns · approvals · reports · team · settings · client-view
components/
  ui/                     design system (screen, header, card, sheet, pills, forms, meter…)
  charts/                 SVG charts: sparkline, area trend, multi-line, paired bars
  leads/ tasks/ calendar/ campaigns/ approvals/ team/   feature sheets and panels
hooks/                    one React Query hook module per domain
lib/
  api/
    contract.ts           the data contract both sources implement
    index.ts              picks embedded vs HTTP and exposes one `api` object
    http.ts, client.ts    HTTP adapter and fetch wrapper
  db/
    driver.ts             tiny sync SQL interface (the seam that makes testing possible)
    sqlite-driver.ts      expo-sqlite driver (+ .web.ts stub so web still bundles)
    schema.ts, seed.ts    canonical DDL and sample data
    repository.ts         every read and write, driver-injected
    setup.ts              schema creation, versioned seeding
  derive.ts               business rules (overdue, pacing, funnel, filters, CSV)
  format.ts               currency / number / date / percent formatters
  routes.ts               typed-route helpers for project links
scripts/
  dev.mjs                 runs the API and Expo together
  test-repository.ts      data-layer test suite (Node SQLite driver)
state/                    Zustand auth store + centralised role capabilities
types/models.ts           domain models shared across screens
server/                   Express + SQLite API (see below)
```

Business logic lives in `lib/derive.ts` and the API, never in components. Screens compose
design-system pieces and hooks only.

## The optional HTTP API

`server/` is a small Express app on `node:sqlite` (no native build step) that mirrors the embedded
contract. Use it when several devices should share one dataset, or to run the app on web. Seed data
is generated relative to today, so boards, calendars and reports always look current.

Seeded data: 3 projects (DTC skincare, outdoor retail, B2B fintech), 8 team members with
per-project assignments, 32 leads with activity timelines, 13 campaigns, 17 tasks across all four
columns, 21 calendar items, 7 approval requests with comments, report configs with recipients,
12 months of trend data, channel breakdowns, goals and agency settings.

Endpoints are grouped in `server/src/routes/`:

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/sign-in` |
| Projects | `GET/POST /api/projects`, `GET/PATCH /api/projects/:id`, `GET …/overview`, `GET …/client-view` |
| Leads | `GET/POST /api/projects/:id/leads`, `GET/PATCH/DELETE /api/leads/:id`, `POST /api/leads/:id/notes` |
| Tasks | `GET/POST /api/projects/:id/tasks`, `PATCH/DELETE /api/tasks/:id` |
| Campaigns | `GET/POST /api/projects/:id/campaigns`, `GET/PATCH/DELETE /api/campaigns/:id` |
| Calendar | `GET/POST /api/projects/:id/calendar`, `PATCH/DELETE /api/calendar-events/:id` |
| Approvals | `GET/POST /api/projects/:id/approvals`, `GET/PATCH/DELETE /api/approvals/:id`, `POST …/comments` |
| Reports | `GET/PATCH /api/projects/:id/report`, `POST …/send`, `POST/DELETE …/recipients` |
| Team | `GET /api/team`, `GET /api/team/:id`, `GET /api/projects/:id/team`, `POST …/team/:memberId/toggle` |
| Settings | `GET/PATCH /api/settings`, `POST /api/settings/notifications/:key`, `POST /api/settings/integrations/:id` |
| Inbox | `GET /api/inbox` |

### Derived rules

Implemented in `lib/db/repository.ts` (and mirrored server-side). Computed, not stored, so any
write is reflected immediately:

- **Cost per lead** = total campaign spend ÷ lead count
- **Conversions** = sum of campaign conversions
- **Lead conversion rate** = Won leads ÷ total leads
- **Global unread count** = pending approvals + tasks in Review (drives the tab badge and Inbox)
- **Overdue task** = due date in the past and column ≠ Done
- **Overdue calendar item** = date in the past and status ≠ Published
- A lead status change updates `lastContactedAt` and appends a timeline entry
- Creating a project auto-creates a default weekly report config
- Unassigning a member who still owns open tasks on the project returns `409` with the task
  count and up to four sample tasks; the app shows a confirmation and can force it

Only **Return on spend** comes from a stored KPI snapshot — it needs revenue the schema does
not model.

## Roles

The signed-in user has an active role (Admin / Manager / Member), switchable from the session
card at the bottom of the Projects tab. Capabilities live in one map in `state/permissions.ts`
and are read through `useCan`; screens never branch on the role string. Today a Member loses the
workspace Settings tab and project-settings editing.

## Known scope limits

- **Auth is demo-only.** Any credentials are accepted, the token is not verified on any request,
  and there is no refresh flow. In embedded mode there is nothing to authenticate against at all.
- **Embedded data is per-device.** Two phones running the APK have independent databases.
  Switch to HTTP mode if you need shared data.
- **Web needs HTTP mode**, since `expo-sqlite` is native-only.
- **Reports are not delivered.** "Send now" records the timestamp; no email provider is wired up.
- **Overview export** builds a CSV in memory and hands it to the OS share sheet rather than
  writing a file, which keeps it dependency-free.
- **Light mode only**, as specified. Tokens are centralised in `constants/theme.ts` if dark mode
  is added later.
- The task board uses a segmented column selector rather than drag-and-drop — it stays readable
  full-width on a phone and keeps moves to a single tap.
