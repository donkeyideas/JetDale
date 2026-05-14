-- Migration 009: reality_checks + chat_messages tables + RLS + indexes

create table public.reality_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  summary text not null,
  concerns jsonb not null,
  proposed_changes jsonb,
  accepted boolean,
  accepted_changes jsonb,
  rejected_changes jsonb,
  user_response_at timestamptz,
  generation_cost_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reality_project on public.reality_checks(project_id);

create trigger reality_checks_updated_at
  before update on public.reality_checks
  for each row execute function public.set_updated_at();

alter table public.reality_checks enable row level security;

create policy "reality_select_own" on public.reality_checks
  for select using (auth.uid() = user_id);

create policy "reality_insert_own" on public.reality_checks
  for insert with check (auth.uid() = user_id);

create policy "reality_update_own" on public.reality_checks
  for update using (auth.uid() = user_id);

-- Chat messages

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'reality_check')),
  content text not null,
  references_artifact_ids uuid[],
  prompt_tokens integer,
  completion_tokens integer,
  cost_cents integer,
  created_at timestamptz not null default now()
);

create index idx_chat_project on public.chat_messages(project_id, created_at desc);

alter table public.chat_messages enable row level security;

create policy "chat_select_own" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "chat_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id);
