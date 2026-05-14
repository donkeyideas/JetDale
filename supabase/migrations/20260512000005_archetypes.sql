-- Migration 005: archetypes table + RLS + indexes

create table public.archetypes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text,
  icon_name text,
  script_version integer not null default 1,
  question_count integer not null,
  estimated_minutes integer not null default 20,
  artifact_types public.artifact_type[] not null default '{}',
  expert_persona text,
  is_active boolean not null default true,
  is_premium boolean not null default false,
  project_count integer not null default 0,
  completion_rate numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_archetypes_active on public.archetypes(is_active) where is_active = true;
create index idx_archetypes_category on public.archetypes(category);
create index idx_archetypes_slug on public.archetypes(slug);

create trigger archetypes_updated_at
  before update on public.archetypes
  for each row execute function public.set_updated_at();

alter table public.archetypes enable row level security;

create policy "archetypes_select_all" on public.archetypes
  for select using (is_active = true);

create policy "archetypes_admin_all" on public.archetypes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
