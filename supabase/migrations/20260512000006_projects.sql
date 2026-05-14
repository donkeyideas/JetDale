-- Migration 006: projects table + RLS + indexes

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  archetype_id uuid references public.archetypes(id),
  name text not null,
  tagline text,
  spark_text text,
  phase public.project_phase not null default 'discovery',
  status public.project_status not null default 'active',
  progress_pct integer not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
  active_risks integer not null default 0,
  pending_decisions integer not null default 0,
  last_activity_at timestamptz default now(),
  next_action text,
  is_starred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create index idx_projects_user on public.projects(user_id) where deleted_at is null;
create index idx_projects_phase on public.projects(phase);
create index idx_projects_user_active on public.projects(user_id, last_activity_at desc) where status = 'active';

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id and deleted_at is null);

create policy "projects_select_admin" on public.projects
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );

create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);
