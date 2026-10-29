# BOLEXIS implementation plan

Product rules and formulas are in [BOLEXIS.md](./BOLEXIS.md). Progress is tracked in [TODO.md](./TODO.md).

Work one phase at a time. When a phase is finished, report it as done and wait for approval before starting the next phase. Do not mark a phase done because files were sketched. A phase is done only after its checks have actually passed.

Do not invent credentials, live customer records, or successful calls to email, n8n, OpenAI, or Google Calendar.

## Phase status

| Phase | Name | Status |
| --- | --- | --- |
| 0 | Inspection and planning | Done |
| 1 | Foundation and design system | Done |
| 2 | Database schema and security | Done |
| 3 | Authentication and workspaces | Done |
| 4 | Application shell | In progress |
| 5 | Domain core | In progress |
| 6 | Data access | In progress |
| 7 | Leads and contacts | In progress |
| 8 | Properties and pipeline | In progress |
| 9 | Tasks and viewings | In progress |
| 10 | Automations and n8n | In progress |
| 11 | AI assistant | In progress |
| 12 | Email and Google Calendar | In progress |
| 13 | Dashboard and reports | In progress |
| 14 | Settings | In progress |
| 15 | Quality, security review, and documentation | Not started |

Phases 4 through 14 already contain draft code from the first build pass. That draft does not close the phase. Phases 0 through 3 are done. The next phase starts only after this report is approved.

## Phase 0 — Inspection and planning

**Status:** Done

**Already done:**

- The project folder was empty. Node v24.16.0, npm 11.13.0, and Git 2.55.0 were available.
- `docs/BOLEXIS.md`, this plan, and `docs/TODO.md` exist.

**Left:** Nothing in this phase. The root README is part of Phase 15.

## Phase 1 — Foundation and design system

**Status:** Done

**Already done:**

- Next.js 16.4.3 App Router app with TypeScript strict mode, Tailwind CSS 4, and ESLint.
- Path alias `@/*`.
- Package name is `bolexis` in `package.json` and `package-lock.json`.
- BOLEXIS color tokens in `src/app/globals.css`.
- Geometric B logo in `src/components/brand/logo.tsx`.
- Root layout in `src/app/layout.tsx` mounts `TooltipProvider` and the Sonner toaster.
- Shared UI in `src/components/ui/`: button, fields, card, badge, checkbox, dialog, dropdown menu, sheet, table, tabs, toast, separator, avatar, popover, tooltip, and scroll area.
- `.env.example` with placeholders only.
- `.gitignore` ignores `.data/` and keeps `.env.example`.
- `npx tsc --noEmit` exited 0.
- `npm run lint` exited 0.

**Left:** Nothing in this phase. Later phases still own their own checks. Home and login returned HTTP 200 with the expected copy. A visual browser pass was not done.

**Checks:** `npx tsc --noEmit` and `npm run lint` both exited successfully on 2026-10-28.

## Phase 2 — Database schema and security

**Status:** Done

**Already done:**

- `supabase/migrations/202610280001_init.sql` with tables, foreign keys, indexes, triggers, helper functions, and row-level security.
- `supabase/migrations/202610280002_storage.sql` for the private `property-images` bucket.
- `supabase/seed.sql` is comment-only so fictional customers are not loaded by a migration runner.
- Supabase server, browser, and admin clients exist and are typed with `Database`.
- `src/lib/supabase/database.types.ts` was generated from project `zqkfpnxrhsjceumfwfsd` after the schema was applied.
- Every public table has forced row-level security. `integration_secrets` has no policies and no grants for `anon` or `authenticated`.
- Anonymous roles cannot execute the security-definer functions. Trigger-only functions live in the `private` schema.
- Signed-in members can still call `create_workspace` and the membership helpers. Those helpers return only a boolean for the current user.
- The service-role key is read only in `src/lib/supabase/admin.ts`. The only importer is the server route `src/app/api/intake/leads/route.ts`.
- `npx tsc --noEmit` exited 0 after the types were added.
- The property-images bucket is private, limited to 5 MB, and accepts JPEG, PNG, and WebP.

**Left:** Nothing in this phase. The app still uses demo mode until a later phase switches `BOLEXIS_DATA_MODE`. No customer rows were inserted.

**Checks:** Schema applied on project `zqkfpnxrhsjceumfwfsd`. Typecheck exited 0 on 2026-10-28.

## Phase 3 — Authentication and workspaces

**Status:** Done

**Already done:**

- Sign-in, sign-up, forgot-password, and reset-password pages.
- Demo session cookie and workspace cookie. Demo sign-in stays unavailable when the data mode is Supabase.
- `src/proxy.ts` sends anonymous users away from app routes.
- Onboarding, workspace switch, and member role actions.
- Owners and admins can create an invitation. The token is shown once and stored only as a SHA-256 hash. It expires in 7 days and cannot grant the owner role. Accepting it adds the matching email as a member.
- An anonymous request to `/overview` returned 307 to `/login`.
- A signed demo cookie opened `/overview` with HTTP 200 without a Supabase session.
- `actorIn` rejects a workspace the user does not belong to. Vitest covered that case, the role helpers, and invitation hashing.
- `npx vitest run src/lib/domain/roles.test.ts` passed 3 tests. `npx tsc --noEmit` exited 0.

**Left:** Nothing in this phase.

**Checks:** Redirect, demo session, workspace rejection, and the role test passed on 2026-10-29.

## Phase 4 — Application shell

**Status:** In progress

**Already done:**

- Sidebar, mobile navigation, top bar, workspace switcher, search, notifications, and profile menu.
- Page header, panel, notice, and empty state.
- A route file exists for every navigation item.

**Left before this phase can be called done:**

- Add a shared confirm dialog.
- Add breadcrumbs where a record page needs them.
- Confirm each navigation item opens, including keyboard access for the mobile menu and profile menu.
- Typecheck and lint pass.

## Phase 5 — Domain core

**Status:** In progress

**Already done:**

- Scoring, assignment, pipeline math, viewing conflicts, property matching, CSV safety, idempotency, metrics, and money formatting under `src/lib/domain/`.
- Test files exist at `src/lib/domain/domain.test.ts` and `src/lib/data/operations.test.ts`.

**Left before this phase can be called done:**

- Install a Vitest version compatible with the current `@types/node`. Vitest 5 failed because it wants `@types/node` 22 or newer.
- Run `npm test` and keep the tests for scoring, assignment with no agents, pipeline value, division by zero, viewing overlap, CSV formula prefixes, and duplicate idempotency keys.

## Phase 6 — Data access

**Status:** In progress

**Already done:**

- In-memory record types and shared operations.
- Fictional Northline Realty seed.
- File-backed demo store aimed at `.data/demo-db.json`.
- Environment mode selection in `src/lib/config.ts`.
- A Supabase load-and-diff sync draft.

**Left before this phase can be called done:**

- Make one repository interface with a demo implementation and a Supabase implementation selected by the environment.
- Prove the demo file is created on first use and is not used when Supabase mode is selected.
- Add the repository factory test.

## Phase 7 — Leads and contacts

**Status:** In progress

**Already done:**

- Lead list, create form, detail page, CSV import action, and CSV export route are drafted.
- Contact list, detail, duplicate hints, edit, and archive are drafted.

**Left before this phase can be called done:**

- Server-side sort is only partially represented. Bulk status changes are not implemented.
- Compile and exercise create, edit, import, and export in demo mode, including a refresh that still shows the new lead.
- Prove a viewer cannot mutate.
- Run the CSV and score tests.

## Phase 8 — Properties and pipeline

**Status:** In progress

**Already done:**

- Property list, create, and detail pages are drafted.
- Upload action rejects anything except JPEG, PNG, and WebP at 5 MB or less.
- Lead detail shows match reasons.
- Pipeline board has drag-and-drop and a stage select.

**Left before this phase can be called done:**

- Wire property archive.
- Add pipeline filters for agent, date, and value.
- Exercise image rejection, matching, and a stage change.
- Test that a lead and a property from different workspaces cannot be linked.

## Phase 9 — Tasks and viewings

**Status:** In progress

**Already done:**

- Task list, create, status change, and reschedule form are drafted.
- Viewing month grid, list, create, and status change are drafted.
- Overlap detection exists in the domain function and is called when a viewing is saved.

**Left before this phase can be called done:**

- Exercise create, complete, reschedule, cancel, and an overlapping appointment.
- Prove the same automation task idempotency key inserts one row.
- Show the same task and viewing queries on the dashboard after Phase 13 is approved. Do not start that wiring early.

## Phase 10 — Automations and n8n

**Status:** In progress

**Already done:**

- Default workflow definitions, automations list, and run detail are drafted.
- Intake route checks a hashed workspace key.
- Reminder processing and follow-up drafts are drafted.
- Signed n8n webhook route and one example workflow export exist.
- The automations page reports n8n as disconnected when the environment is empty.

**Left before this phase can be called done:**

- Add retry for a failed run when the retry is safe.
- Add tests for a bad signature, a stale timestamp, duplicate intake, and duplicate reminders.
- Prove a disconnected n8n installation does not record a successful external run.
- The production job route currently returns not implemented outside demo mode. Finish the demo path first, and leave production scheduling documented rather than faked.

## Phase 11 — AI assistant

**Status:** In progress

**Already done:**

- Server-side assistant with a timeout, validated JSON output, and an hourly request limit.
- `/assistant` explains that it is unavailable without `OPENAI_API_KEY`.
- A generated draft can be saved, and sending is a separate approved action.

**Left before this phase can be called done:**

- Add the assistant panel on the lead page.
- Test that a missing API key returns the unavailable result.
- Test that model output cannot change a lead, assignment, deal, or send a message by itself.

## Phase 12 — Email and Google Calendar

**Status:** In progress

**Already done:**

- Resend send function returns not configured when the key or sender is missing.
- Approval is required before a send attempt.
- Google OAuth start and callback routes exist.
- Settings shows provider status from the environment.

**Left before this phase can be called done:**

- Add a message preview before approval.
- Store Google refresh tokens only through server-side encryption. The callback currently refuses to store the token.
- Sync a viewing only after Google returns an event id, and reuse that id on retry.
- Missing credentials must keep the status at not configured.

## Phase 13 — Dashboard and reports

**Status:** In progress

**Already done:**

- Overview page calculates metrics, charts, lists, and the automation summary from workspace data.
- Reports page has date and agent filters, charts, tables, and a CSV export route.

**Left before this phase can be called done:**

- Run the metric tests, including an empty workspace and a zero denominator.
- Open the overview empty state and a populated demo workspace.
- Confirm the charts have a table alternative. The reports page has tables. Confirm the overview does too.

## Phase 14 — Settings

**Status:** In progress

**Already done:**

- Profile, workspace, member roles, assignment strategy, follow-up timing, currency, timezone, intake-key rotation, and integration status are drafted.

**Left before this phase can be called done:**

- Notification preferences are not implemented.
- Prove a viewer cannot change roles and an owner can.
- Prove each integration card matches the environment.

## Phase 15 — Quality, security review, and documentation

**Status:** Not started

**Already done:**

- `.env.example` exists and contains placeholders only.

**Left before this phase can be called done:**

- Security review: row-level security, client secrets, webhook authentication, upload limits, and the rule that AI text cannot send a message.
- Install Vitest, then run and record the real results of:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

- Write the root `README.md` with setup, environment variables, migrations, seed data, n8n, email, OpenAI, Google OAuth, tests, Vercel notes, troubleshooting, and limitations.
- Review `npm audit` without weakening a policy to silence a finding.

Do not deploy, create a Supabase project, or call a paid API in this phase unless credentials have been provided and that call was requested.

## Approval rule

Finish the current phase, update [TODO.md](./TODO.md), and report that the phase is done. Wait for approval before opening the next phase.
