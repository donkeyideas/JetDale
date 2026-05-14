-- Migration 008: artifacts table + RLS + indexes

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.artifact_type not null,
  status public.artifact_status not null default 'generating',
  version integer not null default 1,
  is_current boolean not null default true,
  title text,
  content_markdown text,
  content_json jsonb,
  generation_model text,
  generation_prompt_tokens integer,
  generation_completion_tokens integer,
  generation_cost_cents integer,
  generation_seconds numeric(6,2),
  edited_by_user boolean not null default false,
  last_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one current version per (project, type)
create unique index idx_artifacts_current on public.artifacts(project_id, type)
  where is_current = true;

create index idx_artifacts_project on public.artifacts(project_id);
create index idx_artifacts_type on public.artifacts(project_id, type);

create trigger artifacts_updated_at
  before update on public.artifacts
  for each row execute function public.set_updated_at();

alter table public.artifacts enable row level security;

create policy "artifacts_select_own" on public.artifacts
  for select using (auth.uid() = user_id);

create policy "artifacts_select_admin" on public.artifacts
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );

create policy "artifacts_insert_own" on public.artifacts
  for insert with check (auth.uid() = user_id);

create policy "artifacts_update_own" on public.artifacts
  for update using (auth.uid() = user_id);
