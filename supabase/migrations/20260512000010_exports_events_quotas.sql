-- Migration 010: exports, ai_events, usage_quotas, audit_log, feature_flags, product_events

-- Exports
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target public.export_target not null,
  status text not null default 'preparing' check (status in ('preparing', 'ready', 'failed')),
  storage_path text,
  file_size_bytes bigint,
  download_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exports_project on public.exports(project_id);
create index idx_exports_user on public.exports(user_id);
create index idx_exports_expires on public.exports(expires_at) where status = 'ready';

create trigger exports_updated_at
  before update on public.exports
  for each row execute function public.set_updated_at();

alter table public.exports enable row level security;

create policy "exports_select_own" on public.exports
  for select using (auth.uid() = user_id);

create policy "exports_insert_own" on public.exports
  for insert with check (auth.uid() = user_id);

-- AI events (audit log for every AI call)
create table public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  event_type public.ai_event_type not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  cost_cents integer not null default 0,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_ai_events_user on public.ai_events(user_id, created_at desc);
create index idx_ai_events_type on public.ai_events(event_type, created_at desc);
create index idx_ai_events_created on public.ai_events(created_at desc);

alter table public.ai_events enable row level security;

create policy "ai_events_admin_select" on public.ai_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );

-- Usage quotas (per-user monthly limits)
create table public.usage_quotas (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  period_start timestamptz not null default date_trunc('month', now()),
  projects_created integer not null default 0,
  discoveries_completed integer not null default 0,
  artifacts_generated integer not null default 0,
  exports_run integer not null default 0,
  voice_minutes_used numeric(8,2) not null default 0,
  ai_cost_cents integer not null default 0,
  total_projects integer not null default 0,
  total_artifacts integer not null default 0,
  total_exports integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger usage_quotas_updated_at
  before update on public.usage_quotas
  for each row execute function public.set_updated_at();

alter table public.usage_quotas enable row level security;

create policy "quotas_select_own" on public.usage_quotas
  for select using (auth.uid() = user_id);

create policy "quotas_admin_select" on public.usage_quotas
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );

-- Auto-create usage_quotas row when profile is created
create or replace function public.handle_new_profile_quotas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_quotas (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_quotas
  after insert on public.profiles
  for each row execute function public.handle_new_profile_quotas();

-- Audit log (admin actions)
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index idx_audit_action on public.audit_log(action, created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_admin_only" on public.audit_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Feature flags
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout_percentage integer not null default 0 check (rollout_percentage between 0 and 100),
  allowed_user_ids uuid[],
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

create policy "flags_read_all" on public.feature_flags
  for select using (true);

create policy "flags_admin_write" on public.feature_flags
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Product events (clickstream)
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  event text not null,
  properties jsonb default '{}',
  platform text,
  app_version text,
  created_at timestamptz not null default now()
);

create index idx_events_user on public.product_events(user_id, created_at desc);
create index idx_events_event on public.product_events(event, created_at desc);
create index idx_events_created on public.product_events(created_at desc);

alter table public.product_events enable row level security;

create policy "events_insert_own" on public.product_events
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "events_select_admin" on public.product_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
