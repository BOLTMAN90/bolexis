-- BOLEXIS initial schema
-- Workspace-owned records carry workspace_id. Row level security is enabled
-- on every workspace-scoped table. Secrets in integration_secrets have no
-- policies for authenticated or anon clients.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.workspace_role as enum ('owner', 'admin', 'agent', 'viewer');
create type public.lead_source as enum (
  'website', 'referral', 'portal', 'walk_in', 'phone', 'social', 'other'
);
create type public.pipeline_stage as enum (
  'new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_submitted', 'won', 'lost'
);
create type public.property_category as enum ('residential', 'commercial');
create type public.listing_type as enum ('sale', 'rental');
create type public.property_type as enum (
  'house', 'apartment', 'condo', 'townhouse', 'land',
  'office', 'retail', 'industrial', 'mixed_use', 'other'
);
create type public.availability_status as enum (
  'available', 'under_offer', 'pending', 'leased', 'sold', 'off_market'
);
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
create type public.viewing_status as enum (
  'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
);
create type public.contact_type as enum (
  'buyer', 'seller', 'tenant', 'landlord', 'investor', 'other'
);
create type public.assignment_strategy as enum ('manual', 'round_robin', 'specific_agent');
create type public.automation_trigger as enum (
  'lead_created', 'task_due', 'viewing_upcoming', 'lead_unassigned', 'sequence_step'
);
create type public.automation_run_status as enum (
  'queued', 'running', 'succeeded', 'failed', 'skipped'
);
create type public.job_status as enum ('pending', 'running', 'succeeded', 'failed', 'cancelled');
create type public.integration_provider as enum (
  'resend', 'n8n', 'openai', 'google_calendar'
);
create type public.integration_status as enum ('disconnected', 'connected', 'error');
create type public.deal_outcome as enum ('open', 'won', 'lost');
create type public.notification_channel as enum ('in_app', 'email');
create type public.message_status as enum (
  'draft', 'approved', 'sent', 'failed', 'not_sent'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  timezone text not null default 'America/New_York',
  locale text not null default 'en-US',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_len check (char_length(timezone) between 1 and 80)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency char(3) not null default 'USD',
  timezone text not null default 'America/New_York',
  assignment_strategy public.assignment_strategy not null default 'round_robin',
  assignment_member_id uuid,
  last_round_robin_user_id uuid references public.profiles (id) on delete set null,
  follow_up_due_hours integer not null default 24,
  task_reminder_hours integer not null default 2,
  viewing_reminder_hours integer not null default 24,
  intake_key_hash text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_name_len check (char_length(name) between 2 and 120),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint workspaces_follow_up_hours check (follow_up_due_hours between 1 and 720),
  constraint workspaces_task_reminder check (task_reminder_hours between 0 and 168),
  constraint workspaces_viewing_reminder check (viewing_reminder_hours between 0 and 168)
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null,
  active boolean not null default true,
  round_robin_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

alter table public.workspaces
  add constraint workspaces_assignment_member_fk
  foreign key (assignment_member_id) references public.workspace_members (id) on delete set null;

create trigger workspace_members_set_updated_at
  before update on public.workspace_members
  for each row execute function public.set_updated_at();

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invitations_not_owner check (role <> 'owner'),
  constraint invitations_email_len check (char_length(email) between 3 and 320)
);

create index workspace_invitations_workspace_idx
  on public.workspace_invitations (workspace_id, email);

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  contact_type public.contact_type not null default 'buyer',
  notes text not null default '',
  consent_email boolean not null default false,
  consent_sms boolean not null default false,
  consent_recorded_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_name_len check (char_length(full_name) between 1 and 160)
);

create index contacts_workspace_idx on public.contacts (workspace_id) where archived_at is null;
create index contacts_email_idx on public.contacts (workspace_id, lower(email));
create index contacts_phone_idx on public.contacts (workspace_id, phone);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete restrict,
  full_name text not null,
  email text,
  phone text,
  source public.lead_source not null default 'other',
  status public.pipeline_stage not null default 'new',
  assigned_user_id uuid references public.profiles (id) on delete set null,
  budget_amount numeric(14, 2),
  budget_currency char(3) not null default 'USD',
  preferred_location text,
  property_type public.property_type,
  buying_timeline_days integer,
  notes text not null default '',
  qualification_score integer not null default 0,
  score_explanation jsonb not null default '[]'::jsonb,
  prefer_email boolean not null default true,
  prefer_phone boolean not null default false,
  prefer_sms boolean not null default false,
  consent_to_contact boolean not null default false,
  consent_recorded_at timestamptz,
  idempotency_key text,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_name_len check (char_length(full_name) between 1 and 160),
  constraint leads_score_range check (qualification_score between 0 and 100),
  constraint leads_budget_nonnegative check (budget_amount is null or budget_amount >= 0),
  constraint leads_timeline_nonnegative check (
    buying_timeline_days is null or buying_timeline_days >= 0
  ),
  unique (workspace_id, idempotency_key)
);

create index leads_workspace_status_idx on public.leads (workspace_id, status) where archived_at is null;
create index leads_workspace_created_idx on public.leads (workspace_id, created_at desc);
create index leads_assignee_idx on public.leads (workspace_id, assigned_user_id);

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  description text not null default '',
  category public.property_category not null,
  property_type public.property_type not null,
  listing_type public.listing_type not null,
  price_amount numeric(14, 2) not null,
  price_currency char(3) not null default 'USD',
  address_line text not null default '',
  city text not null default '',
  region text not null default '',
  postal_code text not null default '',
  country text not null default '',
  bedrooms numeric(4, 1),
  bathrooms numeric(4, 1),
  area_value numeric(12, 2),
  area_unit text not null default 'sqft',
  availability public.availability_status not null default 'available',
  assigned_user_id uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_title_len check (char_length(title) between 1 and 180),
  constraint properties_price_nonnegative check (price_amount >= 0),
  constraint properties_area_unit check (area_unit in ('sqft', 'sqm')),
  constraint properties_rooms_nonnegative check (
    (bedrooms is null or bedrooms >= 0) and (bathrooms is null or bathrooms >= 0)
  )
);

create index properties_workspace_idx on public.properties (workspace_id, availability) where archived_at is null;
create index properties_location_idx on public.properties (workspace_id, lower(city));

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index property_images_property_idx on public.property_images (property_id, sort_order);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete restrict,
  property_id uuid references public.properties (id) on delete set null,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  title text not null,
  stage public.pipeline_stage not null default 'new',
  expected_value numeric(14, 2) not null default 0,
  currency char(3) not null default 'USD',
  probability integer not null default 10,
  expected_close_date date,
  outcome public.deal_outcome not null default 'open',
  lost_reason text,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_title_len check (char_length(title) between 1 and 180),
  constraint deals_value_nonnegative check (expected_value >= 0),
  constraint deals_probability_range check (probability between 0 and 100),
  constraint deals_outcome_matches_stage check (
    (stage = 'won' and outcome = 'won')
    or (stage = 'lost' and outcome = 'lost')
    or (stage not in ('won', 'lost') and outcome = 'open')
  )
);

create index deals_workspace_stage_idx on public.deals (workspace_id, stage) where archived_at is null;
create index deals_lead_idx on public.deals (lead_id);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  description text not null default '',
  priority public.task_priority not null default 'medium',
  due_at timestamptz,
  status public.task_status not null default 'pending',
  assigned_user_id uuid references public.profiles (id) on delete set null,
  lead_id uuid references public.leads (id) on delete restrict,
  deal_id uuid references public.deals (id) on delete restrict,
  property_id uuid references public.properties (id) on delete set null,
  idempotency_key text,
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_len check (char_length(title) between 1 and 180),
  unique (workspace_id, idempotency_key)
);

create index tasks_due_idx on public.tasks (workspace_id, status, due_at);
create index tasks_assignee_idx on public.tasks (workspace_id, assigned_user_id, status);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  record_type text not null,
  record_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now(),
  constraint activities_event_len check (char_length(event_type) between 1 and 80),
  constraint activities_record_type_len check (char_length(record_type) between 1 and 40)
);

create index activities_workspace_created_idx on public.activities (workspace_id, created_at desc);
create index activities_record_idx on public.activities (workspace_id, record_type, record_id);

create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete restrict,
  property_id uuid not null references public.properties (id) on delete restrict,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  status public.viewing_status not null default 'scheduled',
  notes text not null default '',
  google_event_id text,
  google_sync_status text not null default 'not_connected',
  reminder_sent_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viewings_time_order check (ends_at > starts_at),
  constraint viewings_google_status check (
    google_sync_status in ('not_connected', 'pending', 'synced', 'error')
  )
);

create index viewings_schedule_idx on public.viewings (workspace_id, starts_at);
create index viewings_agent_idx on public.viewings (workspace_id, assigned_user_id, starts_at);

alter table public.viewings
  add constraint viewings_no_agent_overlap
  exclude using gist (
    workspace_id with =,
    assigned_user_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('scheduled', 'confirmed') and assigned_user_id is not null);

create trigger viewings_set_updated_at
  before update on public.viewings
  for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  channel public.notification_channel not null default 'in_app',
  title text not null,
  body text not null default '',
  dedupe_key text,
  read_at timestamptz,
  delivery_status text not null default 'queued',
  provider_message_id text,
  error_detail text,
  created_at timestamptz not null default now(),
  constraint notifications_delivery_status check (
    delivery_status in ('queued', 'sent', 'failed', 'skipped', 'not_configured')
  ),
  unique (workspace_id, recipient_id, dedupe_key)
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Automation
-- ---------------------------------------------------------------------------

create table public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null,
  name text not null,
  description text not null default '',
  trigger_type public.automation_trigger not null,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create trigger automation_workflows_set_updated_at
  before update on public.automation_workflows
  for each row execute function public.set_updated_at();

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  workflow_id uuid not null references public.automation_workflows (id) on delete cascade,
  status public.automation_run_status not null default 'queued',
  correlation_id uuid not null default gen_random_uuid(),
  idempotency_key text not null,
  started_at timestamptz,
  finished_at timestamptz,
  error_detail text,
  retry_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

create index automation_runs_workflow_idx
  on public.automation_runs (workflow_id, created_at desc);

create table public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  workflow_id uuid references public.automation_workflows (id) on delete cascade,
  run_id uuid references public.automation_runs (id) on delete set null,
  status public.job_status not null default 'pending',
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

create index automation_jobs_due_idx
  on public.automation_jobs (status, run_after)
  where status = 'pending';

create trigger automation_jobs_set_updated_at
  before update on public.automation_jobs
  for each row execute function public.set_updated_at();

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider public.integration_provider not null,
  status public.integration_status not null default 'disconnected',
  account_reference text,
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create trigger integration_connections_set_updated_at
  before update on public.integration_connections
  for each row execute function public.set_updated_at();

-- Ciphertext is written only by the service role. No client policies exist.
create table public.integration_secrets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider public.integration_provider not null,
  secret_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create trigger integration_secrets_set_updated_at
  before update on public.integration_secrets
  for each row execute function public.set_updated_at();

create table public.message_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  channel text not null default 'email',
  subject text not null default '',
  body text not null,
  source text not null default 'agent',
  status public.message_status not null default 'draft',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  provider_message_id text,
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_drafts_source check (source in ('agent', 'ai')),
  constraint message_drafts_channel check (channel in ('email', 'sms'))
);

create index message_drafts_lead_idx on public.message_drafts (lead_id, created_at desc);

create trigger message_drafts_set_updated_at
  before update on public.message_drafts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Same-workspace guards
-- ---------------------------------------------------------------------------

create or replace function public.assert_same_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  lead_workspace uuid;
  property_workspace uuid;
  deal_workspace uuid;
  contact_workspace uuid;
begin
  if tg_table_name = 'deals' then
    select workspace_id into lead_workspace from public.leads where id = new.lead_id;
    if lead_workspace is distinct from new.workspace_id then
      raise exception 'Lead does not belong to this workspace';
    end if;
    if new.property_id is not null then
      select workspace_id into property_workspace from public.properties where id = new.property_id;
      if property_workspace is distinct from new.workspace_id then
        raise exception 'Property does not belong to this workspace';
      end if;
    end if;
  elsif tg_table_name = 'viewings' then
    select workspace_id into lead_workspace from public.leads where id = new.lead_id;
    select workspace_id into property_workspace from public.properties where id = new.property_id;
    if lead_workspace is distinct from new.workspace_id
      or property_workspace is distinct from new.workspace_id then
      raise exception 'Viewing records must belong to the same workspace';
    end if;
  elsif tg_table_name = 'tasks' then
    if new.lead_id is not null then
      select workspace_id into lead_workspace from public.leads where id = new.lead_id;
      if lead_workspace is distinct from new.workspace_id then
        raise exception 'Task lead does not belong to this workspace';
      end if;
    end if;
    if new.deal_id is not null then
      select workspace_id into deal_workspace from public.deals where id = new.deal_id;
      if deal_workspace is distinct from new.workspace_id then
        raise exception 'Task deal does not belong to this workspace';
      end if;
    end if;
    if new.property_id is not null then
      select workspace_id into property_workspace from public.properties where id = new.property_id;
      if property_workspace is distinct from new.workspace_id then
        raise exception 'Task property does not belong to this workspace';
      end if;
    end if;
  elsif tg_table_name = 'leads' then
    if new.contact_id is not null then
      select workspace_id into contact_workspace from public.contacts where id = new.contact_id;
      if contact_workspace is distinct from new.workspace_id then
        raise exception 'Contact does not belong to this workspace';
      end if;
    end if;
  elsif tg_table_name = 'property_images' then
    select workspace_id into property_workspace from public.properties where id = new.property_id;
    if property_workspace is distinct from new.workspace_id then
      raise exception 'Image property does not belong to this workspace';
    end if;
  end if;
  return new;
end;
$$;

create trigger deals_same_workspace
  before insert or update on public.deals
  for each row execute function public.assert_same_workspace();

create trigger viewings_same_workspace
  before insert or update on public.viewings
  for each row execute function public.assert_same_workspace();

create trigger tasks_same_workspace
  before insert or update on public.tasks
  for each row execute function public.assert_same_workspace();

create trigger leads_same_workspace
  before insert or update on public.leads
  for each row execute function public.assert_same_workspace();

create trigger property_images_same_workspace
  before insert or update on public.property_images
  for each row execute function public.assert_same_workspace();

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- security definer so policies can read membership without recursive RLS.
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and active = true
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace uuid,
  allowed public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and active = true
      and role = any (allowed)
  );
$$;

create or replace function public.shares_workspace(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and mine.active = true
      and theirs.user_id = other_user
      and theirs.active = true
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public;
revoke all on function public.shares_workspace(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function public.shares_workspace(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Workspace creation keeps the creator as owner in one transaction.
-- ---------------------------------------------------------------------------

create or replace function public.create_workspace(workspace_name text, workspace_slug text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (workspace_name, workspace_slug, auth.uid())
  returning * into created;

  insert into public.workspace_members (workspace_id, user_id, role, round_robin_order)
  values (created.id, auth.uid(), 'owner', 0);

  insert into public.automation_workflows (workspace_id, key, name, description, trigger_type, config)
  values
    (
      created.id,
      'new_lead_intake',
      'New lead intake',
      'Validate an inquiry, score it, assign an agent, create a follow-up, and notify that agent.',
      'lead_created',
      '{"actions":["validate","score","assign","create_task","notify"]}'::jsonb
    ),
    (
      created.id,
      'follow_up_reminders',
      'Follow-up reminders',
      'Notify assignees when incomplete tasks enter the reminder window.',
      'task_due',
      '{"actions":["select_due_tasks","queue_notification","email_if_configured"]}'::jsonb
    ),
    (
      created.id,
      'viewing_reminders',
      'Viewing reminders',
      'Queue reminders for upcoming property viewings.',
      'viewing_upcoming',
      '{"actions":["select_upcoming","queue_notification"]}'::jsonb
    ),
    (
      created.id,
      'lead_assignment',
      'Lead assignment',
      'Assign unassigned leads with the workspace rule.',
      'lead_unassigned',
      '{"actions":["round_robin_or_rule"]}'::jsonb
    ),
    (
      created.id,
      'follow_up_sequence',
      'Lead follow-up sequence',
      'Prepare follow-up drafts. An agent must approve a message before it is sent.',
      'sequence_step',
      '{"requiresApproval":true,"steps":[{"delayHours":24},{"delayHours":72}]}'::jsonb
    );

  return created;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent the last owner from being removed or demoted.
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and (old.role = 'owner') and (new.role <> 'owner' or new.active = false)) then
    select count(*) into remaining
    from public.workspace_members
    where workspace_id = old.workspace_id
      and role = 'owner'
      and active = true
      and id <> old.id;
    if remaining < 1 then
      raise exception 'A workspace must keep one active owner';
    end if;
  end if;
  if tg_op = 'UPDATE' or tg_op = 'INSERT' then
    return new;
  end if;
  return old;
end;
$$;

create trigger workspace_members_protect_owner
  before update or delete on public.workspace_members
  for each row execute function public.protect_last_owner();

-- Only an existing owner may grant the owner role. The first member inserted
-- for a workspace is the exception used by create_workspace.
create or replace function public.prevent_owner_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_count integer;
begin
  if new.role <> 'owner' then
    return new;
  end if;

  select count(*) into owner_count
  from public.workspace_members
  where workspace_id = new.workspace_id
    and role = 'owner'
    and active = true;

  if owner_count = 0 then
    return new;
  end if;

  if not public.has_workspace_role(new.workspace_id, array['owner']::public.workspace_role[]) then
    raise exception 'Only an owner can grant the owner role';
  end if;

  return new;
end;
$$;

create trigger workspace_members_owner_escalation
  before insert or update of role on public.workspace_members
  for each row execute function public.prevent_owner_escalation();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.viewings enable row level security;
alter table public.notifications enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.integration_connections enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.message_drafts enable row level security;

create policy profiles_select_self_or_coworker
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.shares_workspace(id));

create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy workspaces_select_member
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

create policy workspaces_update_admin
  on public.workspaces for update
  to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));

create policy workspaces_delete_owner
  on public.workspaces for delete
  to authenticated
  using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));

create policy members_select
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy members_insert_admin
  on public.workspace_members for insert
  to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy members_update_admin
  on public.workspace_members for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy members_delete_admin
  on public.workspace_members for delete
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy invitations_select_admin
  on public.workspace_invitations for select
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy invitations_write_admin
  on public.workspace_invitations for insert
  to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy invitations_update_admin
  on public.workspace_invitations for update
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

create policy invitations_delete_admin
  on public.workspace_invitations for delete
  to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

-- CRM: members read, agents and above write. Viewers cannot mutate.
-- Activities are insert-only for agents and above. Nobody updates history.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'contacts', 'leads', 'properties', 'property_images', 'deals', 'tasks',
    'viewings', 'automation_workflows', 'automation_runs', 'automation_jobs',
    'integration_connections', 'message_drafts'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',
      tbl || '_select', tbl
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_workspace_role(workspace_id, array[''owner'', ''admin'', ''agent'']::public.workspace_role[]))',
      tbl || '_insert', tbl
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_workspace_role(workspace_id, array[''owner'', ''admin'', ''agent'']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array[''owner'', ''admin'', ''agent'']::public.workspace_role[]))',
      tbl || '_update', tbl
    );
  end loop;
end $$;

create policy activities_select
  on public.activities for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy activities_insert
  on public.activities for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'agent']::public.workspace_role[])
  );

create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy notifications_insert_agent
  on public.notifications for insert
  to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'agent']::public.workspace_role[])
  );

-- integration_secrets: RLS on, zero policies. Service role bypasses RLS.

grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.workspace_invitations to authenticated;
grant select, insert, update on public.contacts to authenticated;
grant select, insert, update on public.leads to authenticated;
grant select, insert, update on public.properties to authenticated;
grant select, insert, update, delete on public.property_images to authenticated;

create policy property_images_delete
  on public.property_images for delete
  to authenticated
  using (
    public.has_workspace_role(workspace_id, array['owner', 'admin', 'agent']::public.workspace_role[])
  );
grant select, insert, update on public.deals to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert on public.activities to authenticated;
grant select, insert, update on public.viewings to authenticated;
grant select, insert, update on public.notifications to authenticated;
grant select, insert, update on public.automation_workflows to authenticated;
grant select, insert, update on public.automation_runs to authenticated;
grant select, insert, update on public.automation_jobs to authenticated;
grant select, insert, update on public.integration_connections to authenticated;
grant select, insert, update on public.message_drafts to authenticated;

revoke all on public.integration_secrets from anon, authenticated;
revoke all on all tables in schema public from anon;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
revoke execute on function public.prevent_owner_escalation() from public, anon;
revoke execute on function public.create_workspace(text, text) from public, anon;
revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
revoke execute on function public.shares_workspace(uuid) from public, anon;

alter table public.profiles force row level security;
alter table public.workspaces force row level security;
alter table public.workspace_members force row level security;
alter table public.workspace_invitations force row level security;
alter table public.contacts force row level security;
alter table public.leads force row level security;
alter table public.properties force row level security;
alter table public.property_images force row level security;
alter table public.deals force row level security;
alter table public.tasks force row level security;
alter table public.activities force row level security;
alter table public.viewings force row level security;
alter table public.notifications force row level security;
alter table public.automation_workflows force row level security;
alter table public.automation_runs force row level security;
alter table public.automation_jobs force row level security;
alter table public.integration_connections force row level security;
alter table public.integration_secrets force row level security;
alter table public.message_drafts force row level security;

-- Trigger functions stay out of the public API. Policies and create_workspace remain callable by signed-in members.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, supabase_auth_admin;

alter function public.set_updated_at() set schema private;
alter function public.assert_same_workspace() set schema private;
alter function public.protect_last_owner() set schema private;
alter function public.prevent_owner_escalation() set schema private;
alter function public.handle_new_user() set schema private;

revoke all on function private.set_updated_at() from public, anon;
revoke all on function private.assert_same_workspace() from public, anon;
revoke all on function private.protect_last_owner() from public, anon;
revoke all on function private.prevent_owner_escalation() from public, anon;
revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;
grant execute on function private.set_updated_at() to authenticated;
grant execute on function private.assert_same_workspace() to authenticated;
grant execute on function private.protect_last_owner() to authenticated;
grant execute on function private.prevent_owner_escalation() to authenticated;
