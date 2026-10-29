# BOLEXIS todo

Living checklist for the build. Phase names and the approval gate are in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md). Update the status column in the same change that finishes the work. Do not mark an item done until its check has actually passed. Do not start the next phase until the current one is reported done and approved.

Statuses: `pending`, `in_progress`, `done`, `blocked`.

Spec: [BOLEXIS.md](./BOLEXIS.md).

## Phase 0 — Inspection and planning

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 0.1 | Inspect the project folder and local toolchain | done | Folder was empty. Node v24.16.0, npm 11.13.0, Git 2.55.0. |
| 0.2 | Write the product specification | done | `docs/BOLEXIS.md` |
| 0.3 | Write the implementation plan | done | `docs/IMPLEMENTATION_PLAN.md` |
| 0.4 | Write this checklist | done | `docs/TODO.md` |

## Phase 1 — Foundation and design system

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 1.1 | Initialize Next.js, TypeScript strict, Tailwind, ESLint | done | Next.js 16.4.3, React 19. Scaffold moved from `app-scaffold` to the repo root. Package name is `bolexis`. |
| 1.2 | Add shadcn/ui primitives used by the app | done | Card, badge, checkbox, dialog, dropdown menu, sheet, table, tabs, toast, separator, avatar, popover, tooltip, and scroll area are in `src/components/ui/`. |
| 1.3 | Add BOLEXIS color tokens, logo, and base layout | done | `src/app/globals.css`, `src/components/brand/logo.tsx`, tooltip provider, and toaster on the root layout. Home and login returned HTTP 200. A visual browser pass was not done. |
| 1.4 | Add `.env.example` and `.gitignore` | done | `.env.example` has placeholders only. `.gitignore` ignores `.data/` and keeps `.env.example`. |
| 1.5 | Typecheck and lint | done | `npx tsc --noEmit` and `npm run lint` both exited 0 on 2026-10-28. |

## Phase 2 — Database schema and security

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 2.1 | Write initial SQL migration with RLS | done | Applied on project `zqkfpnxrhsjceumfwfsd`. Every public table has forced RLS. |
| 2.2 | Write storage policies for property images | done | Private `property-images` bucket, 5 MB, JPEG/PNG/WebP. Applied. |
| 2.3 | Write development-only seed SQL | done | `supabase/seed.sql` is a comment-only guard. No customer rows were inserted. |
| 2.4 | Add database types and Supabase clients | done | `src/lib/supabase/database.types.ts` generated from the live schema. Clients use that `Database` type. `npx tsc --noEmit` exited 0. |

## Phase 3 — Authentication and workspaces

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 3.1 | Auth screens: sign up, sign in, sign out, password reset | done | Pages exist. Demo sign-in reached `/overview` with HTTP 200. Supabase password forms stay in place for Supabase mode. |
| 3.2 | Protected routes and session refresh | done | Anonymous `/overview` returned 307 to `/login`. |
| 3.3 | Workspace onboarding, switcher, members, roles | done | Foreign workspace ids are rejected. Invitations store a hash, expire in 7 days, and cannot grant owner. |
| 3.4 | Demo session that cannot override Supabase mode | done | `enterDemo` redirects away when the data mode is not demo. The local app is still in demo mode. |

## Phase 4 — Application shell

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 4.1 | Sidebar, top bar, mobile nav, search, notifications, profile | in_progress | `src/components/shell/app-shell.tsx`. Not verified in a browser. |
| 4.2 | Shared page header, table, filters, empty state, confirm dialog | in_progress | Header, panel, notice, and empty state exist. No shared confirm dialog. |
| 4.3 | Route every navigation item to a real page | in_progress | Route files exist for every nav item. They have not been compiled or opened. |

## Phase 5 — Domain core

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 5.1 | Lead score, assignment, pipeline math, matches | done | `src/lib/domain/`. Not executed. |
| 5.2 | Viewing conflicts, CSV safety, idempotency, metrics | done | Written beside the other domain modules. Not executed. |
| 5.3 | Unit tests for the domain functions | pending | Vitest 3.2.7 is installed. `src/lib/domain/roles.test.ts` passed during Phase 3. The rest of `npm test` has not been run. |

## Phase 6 — Data access

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 6.1 | Repository interface | in_progress | Shared operations mutate an in-memory `Database` in `src/lib/data/operations.ts`. |
| 6.2 | Supabase repository | in_progress | Load-and-diff sync in `src/lib/supabase/sync.ts`. Not run against Supabase. |
| 6.3 | File-backed demo repository and fictional seed | in_progress | `src/lib/demo/seed.ts` and `src/lib/demo/store.ts`. First-run file `.data/demo-db.json` was not created. |
| 6.4 | Mode selection: demo only when explicitly allowed | in_progress | `src/lib/config.ts`. Not tested. |

## Phase 7 — Leads and contacts

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 7.1 | Lead list, filters, pagination, create, edit | in_progress | Pages and actions written. Not compiled. |
| 7.2 | Lead detail, activity, related records | in_progress | `src/app/(app)/leads/[id]/page.tsx`. Not compiled. |
| 7.3 | CSV import and export | in_progress | Import action and `src/app/api/leads/export/route.ts`. Not compiled. |
| 7.4 | Contacts, duplicate hints, archive | in_progress | Contact pages written. Not compiled. |

## Phase 8 — Properties and pipeline

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 8.1 | Property CRUD, search, archive | in_progress | Create, list, and detail exist. Archive action is not wired on the property page. |
| 8.2 | Image upload restrictions | in_progress | JPEG, PNG, WebP, 5 MB check is in the upload action. Not tested. |
| 8.3 | Property matching with reasons | in_progress | Shown on the lead page from `propertyMatches`. Not tested. |
| 8.4 | Kanban pipeline and accessible stage change | in_progress | `src/components/pipeline/board.tsx`. Not compiled. |

## Phase 9 — Tasks and viewings

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 9.1 | Task list, create, complete, reschedule | in_progress | `/tasks` written. Not compiled. |
| 9.2 | Viewing calendar and list | in_progress | `/viewings` written. Not compiled. |
| 9.3 | Overlap detection and status changes | in_progress | Domain conflict check is called from `createViewing`. Not tested. |

## Phase 10 — Automations and n8n

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 10.1 | Workflow definitions and run history | in_progress | Pages written. Not compiled. |
| 10.2 | Job queue, intake, reminders, assignment, sequences | in_progress | Intake route, reminder action, and sequence drafts are coded. Job worker is demo-only. |
| 10.3 | Signed n8n webhook and example workflow exports | in_progress | `src/app/api/webhooks/n8n/route.ts` and `n8n/workflows/lead-intake.json`. Not tested. |
| 10.4 | Disconnected state when n8n is not configured | in_progress | Automations page reads env flags. Not opened in a browser. |

## Phase 11 — AI assistant

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 11.1 | Server-side assistant with validation and limits | in_progress | `src/lib/ai/assistant.ts`. No API key. Not called. |
| 11.2 | Assistant page and lead panel | in_progress | `/assistant` exists. Lead page does not embed the panel. |
| 11.3 | Unavailable state without an API key | in_progress | Coded. Not opened. |

## Phase 12 — Email and Google Calendar

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 12.1 | Resend adapter, preview, and approval | in_progress | Send path requires approval. Preview UI is thin. Not called. |
| 12.2 | Google OAuth start, callback, and viewing sync | in_progress | Start and callback routes exist. Callback does not store tokens and does not sync viewings. |
| 12.3 | Honest connection status on settings | in_progress | Settings lists env flags. Not opened. |

## Phase 13 — Dashboard and reports

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 13.1 | Overview metrics and sections from live queries | in_progress | `/overview` uses `dashboard()`. Not compiled. |
| 13.2 | Reports, filters, charts, tables, CSV | in_progress | `/reports` and `/api/reports/export` written. Not compiled. |

## Phase 14 — Settings

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 14.1 | Profile, workspace, members, preferences | in_progress | `/settings` written. Not compiled. |
| 14.2 | Assignment rules, follow-up timing, currency, timezone | in_progress | Included on the settings form. Not compiled. |

## Phase 15 — Quality, security review, and documentation

| ID | Task | Status | Notes |
| --- | --- | --- | --- |
| 15.1 | Security review notes | pending | Not started. |
| 15.2 | `npm test` | pending | Vitest 3.2.7 is installed. Only the Phase 3 role tests have been run. |
| 15.3 | `npx tsc --noEmit` | pending | Not run. |
| 15.4 | `npm run lint` | pending | Not run. |
| 15.5 | `npm run build` | pending | Not run. |
| 15.6 | README and final `.env.example` | in_progress | `.env.example` exists. Root README was not written. Product docs are in `docs/`. |

## Session log

| When | What changed |
| --- | --- |
| 2026-10-28 | Created the product spec, implementation plan, and this checklist. |
| 2026-10-28 | Stopped mid-implementation before typecheck, lint, tests, or a production build. The app has not been opened in a browser. Vitest is not installed. |
| 2026-10-28 | Split the implementation plan into Phases 0–15. Phase 0 is the only phase marked done. Phase 1 is the next phase to close and submit for approval. |
| 2026-10-28 | Closed Phase 1. Package name is `bolexis`. Shared UI components and the root toast and tooltip providers are in place. `npx tsc --noEmit` and `npm run lint` exited 0. Waiting for approval before Phase 2. |
| 2026-10-28 | Closed Phase 2. Schema and private property-images bucket are on Supabase project `zqkfpnxrhsjceumfwfsd`. Generated `src/lib/supabase/database.types.ts`. Service role stays server-only. Typecheck exited 0. App data mode remains demo. Waiting for approval before Phase 3. |
| 2026-10-29 | Closed Phase 3. Anonymous `/overview` redirects to `/login`. Demo cookie opens `/overview`. Invitations store a hash. Role tests passed. Waiting for approval before Phase 4. |
