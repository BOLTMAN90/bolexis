# BOLEXIS

**Real Estate Intelligence & Automation**

Tagline: Capture Leads. Automate Follow-Ups. Close Deals.

This document is the product and engineering specification for BOLEXIS. It is the source of truth for scope, data, security, metrics, and integrations. The build sequence lives in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md). Progress is tracked in [TODO.md](./TODO.md).

## 1. Product overview

BOLEXIS is an AI-assisted real estate CRM and automation platform for independent agents, brokerages, residential and commercial property businesses, sales teams, and investment teams.

The product helps a business:

- Capture property inquiries and qualify leads with an explainable score.
- Organize contacts without creating conflicting duplicates.
- Manage sale and rental listings, including images.
- Track deals on a sales pipeline.
- Schedule property viewings and daily follow-up tasks.
- Run durable automations, with n8n as an optional external orchestrator.
- Review performance from authorized workspace data.
- Draft follow-ups with an optional AI assistant that never sends messages on its own.

BOLEXIS is a multi-workspace application. Every business record belongs to one workspace. Users may belong to more than one workspace. Roles are owner, admin, agent, and viewer.

## 2. Brand and interface

| Token | Use |
| --- | --- |
| Deep navy `#0B1F3A` | Sidebar, wordmark, primary text on light brand surfaces |
| Navy hover `#16365F` | Sidebar hover and selected states |
| Teal `#0F766E` | Primary actions, positive states, focus rings |
| Teal soft `#CCFBF1` | Positive badges and highlights |
| Slate `#475569` | Secondary text |
| Canvas `#F8FAFC` | Application background |
| White `#FFFFFF` | Cards, tables, dialogs |
| Border `#E2E8F0` | Cards, inputs, dividers |
| Danger `#B91C1C` | Destructive actions and overdue states |
| Warning `#B45309` | Due-soon and caution states |

The mark is a geometric letter B in a rounded navy tile with a teal cut. It is a placeholder until an official logo is supplied.

Interface rules:

- Collapsible sidebar, top bar, workspace switcher, search, notifications, and profile menu.
- Mobile navigation that reaches every module.
- Page headers, filters, tables, dialogs, and toasts reused across modules.
- Subtle borders and short transitions. No decorative motion, glassmorphism, or fake social proof.
- Keyboard access for dialogs, menus, pipeline stage changes, and forms.
- Dates, times, currency, and numbers follow the workspace locale settings.

## 3. Navigation

Every item opens an implemented page.

| Module | Route | Purpose |
| --- | --- | --- |
| Overview | `/overview` | Metrics, queues, and quick actions from workspace data |
| Leads | `/leads` | Inquiry pipeline, import, export, and lead detail |
| Contacts | `/contacts` | People linked to leads and deals |
| Properties | `/properties` | Listings, images, and matching |
| Pipeline | `/pipeline` | Deal kanban and accessible stage changes |
| Tasks & Follow-Ups | `/tasks` | Work items linked to CRM records |
| Viewings Calendar | `/viewings` | Appointments in calendar and list views |
| Automations | `/automations` | Workflows, runs, retries, and n8n status |
| AI Assistant | `/assistant` | Summaries, scoring explanation, drafts |
| Reports | `/reports` | Aggregations and CSV export |
| Settings | `/settings` | Profile, workspace, members, and integrations |

Authentication routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`.

Public lead intake for authorized website forms: `POST /api/intake/leads`.

## 4. Technology choices

| Concern | Choice |
| --- | --- |
| Application | Next.js App Router, TypeScript strict, React |
| Styling | Tailwind CSS and shadcn/ui |
| Icons | Lucide |
| Database and auth | Supabase PostgreSQL and Supabase Auth |
| Files | Supabase Storage bucket `property-images` |
| Validation | Zod on the server and in forms |
| Forms | React Hook Form |
| Charts | Recharts, with a data table beside each chart |
| Calendar | Accessible month grid plus list view, using `date-fns` |
| Pipeline drag and drop | `@dnd-kit` plus a select control for keyboard users |
| Email | Resend, server-side only |
| External workflows | n8n webhooks with HMAC authentication |
| AI | OpenAI official SDK, server-side only |
| Calendar sync | Google Calendar API via OAuth, server-side tokens |
| Tests | Vitest for domain logic and route guards |
| Hosting | Vercel |

Significant assumptions:

1. CRM records are archived (`archived_at`) instead of hard-deleted, so deals and activity history stay intact.
2. Demo mode is explicit (`BOLEXIS_DATA_MODE=demo`) and is refused when `NODE_ENV=production` unless `BOLEXIS_ALLOW_DEMO_IN_PRODUCTION=true`. Demo mode never replaces a configured Supabase project.
3. Missing Supabase credentials in local development start demo mode with a visible banner. Production without Supabase shows a configuration error and does not invent metrics.
4. External email, n8n, OpenAI, and Google Calendar stay disconnected until their credentials exist. The UI reports that status. It does not fake a successful send, sync, or model call.
5. The deterministic lead score is the system of record. AI text is advisory and labeled as generated.
6. AI output cannot change lead status, assignment, deal stage, or send a message. A person approves sends.
7. Secrets live in server environment variables or a server-only integration secret store. They are not written to client-readable tables.
8. The first follow-up sequence requires manual approval before any message is sent.
9. Default workspace currency is USD and default timezone is `America/New_York`. Both are configurable.
10. Viewers are read-only. Agents manage records they are allowed to work. Admins and owners administer the workspace. Only owners delete a workspace.

## 5. Data model

All primary keys are UUIDs. Workspace-owned tables include `workspace_id`. Timestamps are `timestamptz` stored in UTC and displayed in the user or workspace timezone.

### Identity and tenancy

- `profiles` — one row per auth user. Display name, phone, timezone, locale, avatar path.
- `workspaces` — business name, slug, currency, timezone, assignment settings, follow-up timing.
- `workspace_members` — user, workspace, role (`owner`, `admin`, `agent`, `viewer`), active flag.
- `workspace_invitations` — email, role, token hash, expiry. Token plaintext is never stored.

### CRM

- `contacts` — person profile, emails, phones, contact type, consent, archive flag.
- `leads` — inquiry: contact link, source, status, assignee, budget, location, property type, timeline, notes, score, score explanation, communication preferences, consent.
- `properties` — listing fields, availability, assignee, archive flag.
- `property_images` — storage path, sort order, alt text. Bytes live in Storage, not in the row.
- `deals` — lead, optional property, assignee, stage, value, currency, probability, expected close, outcome.
- `tasks` — title, description, priority, due date, status, assignee, optional lead, deal, or property, idempotency key.
- `activities` — actor, workspace, event type, related record, metadata, before and after values.
- `viewings` — lead, property, agent, start, end, timezone, status, notes, external calendar event id when sync succeeds.
- `notifications` — recipient, type, title, body, read time, deduplication key.

### Automation and integrations

- `automation_workflows` — name, description, trigger, action configuration, enabled flag.
- `automation_runs` — workflow, status, correlation id, idempotency key, start, finish, error, retry count.
- `automation_jobs` — durable queue: run after, payload, attempts, lock, last error.
- `integration_connections` — provider, status, account reference, last sync, non-secret metadata.
- `integration_secrets` — server-only ciphertext references. The Next.js app stores OAuth refresh tokens only through a server function that writes with the service role, never through the browser client. When a vault is not configured, refresh tokens stay in server environment or are left unconnected.

### Deletion behavior

| Parent | Child | Behavior |
| --- | --- | --- |
| `auth.users` | `profiles` | Cascade |
| `workspaces` | workspace-owned rows | Cascade when an owner deletes the workspace |
| `contacts` | `leads` | Restrict while leads exist. Archive the contact instead |
| `leads` | `deals`, `viewings`, `tasks` | Restrict. Archive the lead |
| `properties` | `deals.property_id` | Set null on property archive is not automatic. Archive hides the listing and keeps history |
| `workspace_members` | assigned records | Assignee is set null if the member is removed, and an activity is recorded |

### Lead and deal stages

`new`, `contacted`, `qualified`, `viewing_scheduled`, `offer_submitted`, `won`, `lost`.

Active pipeline stages are every stage except `won` and `lost`.

### Task statuses

`pending`, `in_progress`, `completed`, `cancelled`.

### Viewing statuses

`scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`.

## 6. Authorization

PostgreSQL row level security is enabled on every workspace-scoped table.

Helper predicates:

- The caller is an active member of the workspace.
- The caller has one of the roles required by the action.
- Related lead, property, deal, and task rows share that workspace.

Server actions and route handlers check the same rules before writing. The browser hides controls the role cannot use, and the database still rejects the write.

A user cannot read or change another workspace by changing a URL, an id, or a request body.

Demo mode uses a separate data file and a demo session cookie. It is not attached to the production Supabase client. Production authorization is unchanged when demo mode is off.

## 7. Metric formulas

All dashboard and report numbers are aggregated from rows the caller is allowed to read. Empty data is shown as empty, not replaced with samples. Rates use a zero denominator rule: if the denominator is 0, the rate is null and the UI says there is not enough data.

| Metric | Formula |
| --- | --- |
| Total leads | Count of non-archived leads in the workspace |
| New leads this month | Leads whose `created_at` falls in the current calendar month in the workspace timezone |
| Qualified leads | Leads whose status is `qualified` or any later open or won stage |
| Upcoming viewings | Viewings with status `scheduled` or `confirmed` and `starts_at` in the future |
| Overdue follow-ups | Tasks in `pending` or `in_progress` with `due_at` before now |
| Active deals | Deals whose stage is not `won` or `lost` and which are not archived |
| Total pipeline value | Sum of `expected_value` for active deals |
| Weighted pipeline value | Sum of `expected_value * probability / 100` for active deals |
| Closed-won value | Sum of `expected_value` for deals in `won` |
| Lead-to-viewing conversion | Distinct leads with at least one viewing, divided by total leads |
| Viewing-to-offer conversion | Distinct leads with a deal in `offer_submitted` or `won`, divided by distinct leads with a viewing |
| Follow-up completion rate | Tasks completed on or before `due_at`, divided by tasks that have a due date and are not cancelled |

Lead score, 0 to 100, is the sum of transparent rules. Missing data scores zero for that rule and is listed in the explanation.

| Rule | Points |
| --- | --- |
| Email present and valid | 10 |
| Phone present | 10 |
| Budget present and greater than zero | 20 |
| Preferred location present | 15 |
| Property type present | 10 |
| Buying timeline within 90 days | 20 |
| Buying timeline set but later than 90 days | 10 |
| Consent to be contacted is recorded | 15 |

Maximum is 100. The explanation lists each rule, the points awarded, and any missing field.

Assignment uses the workspace rule:

- `manual` — leave the lead unassigned when no agent is supplied.
- `round_robin` — next active agent in stable member order, skipping viewers and inactive members.
- `specific_agent` — the configured member, if that member is an active agent, admin, or owner.

If no eligible agent exists, the lead is saved unassigned and the run records that outcome. It is not marked as a successful assignment.

## 8. Automations

Workflows shipped with a workspace:

1. **New lead intake.** Validate payload, verify workspace, honor consent, save the lead, score, assign, create one follow-up task, write an activity, notify the assignee. The intake idempotency key prevents a retry from creating a second lead.
2. **Follow-up reminders.** Select incomplete tasks inside the reminder window. Queue an in-app notification. Send email only when Resend is configured, the recipient is allowed, and consent permits it. A deduplication key stops a retry from sending twice.
3. **Viewing reminders.** Same pattern for upcoming viewings and the workspace reminder offset.
4. **Lead assignment.** Round-robin or rule-based assignment among eligible agents.
5. **Follow-up sequence.** Configurable delays and stop conditions. The first version creates draft tasks and draft messages that an agent must approve before email is sent.

Jobs live in `automation_jobs`. A worker claims a job with a lock, applies a timeout, and records `automation_runs`. Success is written only after the action commits.

n8n is optional. When `N8N_WEBHOOK_BASE_URL` and `N8N_WEBHOOK_SECRET` are unset, the Automations page shows disconnected. BOLEXIS still runs the in-app job queue.

Webhook authentication is HMAC-SHA256 of the raw body with the timestamp header. Requests older than five minutes are rejected. The idempotency key is required.

## 9. AI assistant

The assistant is unavailable until `OPENAI_API_KEY` is set. Unavailable is a normal state, not an error that invents a summary.

Capabilities, all server-side and workspace-scoped:

- Summarize recorded requirements, tasks, budget, location, and timeline.
- Explain the rules-based score and name missing fields.
- Match properties that exist in the workspace and explain the overlap.
- Draft an email for review. Sending remains a separate approved action.
- Suggest a next step from recorded gaps.
- Summarize recorded activities only.

Controls: request validation, output validation, short timeout, per-user rate limit, minimum personal data, notes treated as untrusted, and no use of protected characteristics in ranking.

## 10. Integrations

| Provider | Required configuration | Connected means |
| --- | --- | --- |
| Supabase | URL, anon key, service role on the server, database migrations | Auth and queries succeed |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | A provider acceptance response was stored for that message |
| n8n | Base URL and webhook secret | A signed handshake or a real workflow response was stored |
| OpenAI | `OPENAI_API_KEY`, optional model name | A successful responses call |
| Google Calendar | OAuth client id, secret, redirect URL | A viewing row has a Google event id from a successful API call |

Property images accept JPEG, PNG, and WebP up to 5 MB. Other types are rejected.

## 11. Demo mode

Demo mode loads fictional records for a sample brokerage, Northline Realty. The banner states that the data is fictional. State changes use the same scoring, assignment, task, viewing, and pipeline functions as a live workspace.

Simulated email, calendar, AI, and n8n actions are labeled “not sent” or “not connected”. They never show a success check for a provider that did not respond.

Demo data is stored outside the production database.

## 12. Out of scope for the first build

- Native mobile apps.
- Payment processing and subscription billing.
- MLS or public listing portal syndication.
- Two-way inbox sync with Gmail or Outlook.
- Automatic sending of AI-written messages.
- Using protected personal characteristics in any score or match.
