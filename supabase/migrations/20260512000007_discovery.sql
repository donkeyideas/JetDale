-- Migration 007: discovery_sessions + discovery_answers tables + RLS + indexes

create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  archetype_id uuid not null references public.archetypes(id),
  archetype_script_version integer not null,
  status public.discovery_status not null default 'in_progress',
  current_question_index integer not null default 0,
  total_questions integer not null,
  summary jsonb,
  voice_minutes_used numeric(8,2) default 0,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  cost_cents integer default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_discovery_project on public.discovery_sessions(project_id);
create index idx_discovery_user on public.discovery_sessions(user_id);
create index idx_discovery_status on public.discovery_sessions(status);

create trigger discovery_sessions_updated_at
  before update on public.discovery_sessions
  for each row execute function public.set_updated_at();

alter table public.discovery_sessions enable row level security;

create policy "discovery_select_own" on public.discovery_sessions
  for select using (auth.uid() = user_id);

create policy "discovery_select_admin" on public.discovery_sessions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );

create policy "discovery_insert_own" on public.discovery_sessions
  for insert with check (auth.uid() = user_id);

create policy "discovery_update_own" on public.discovery_sessions
  for update using (auth.uid() = user_id);

-- Discovery answers

create table public.discovery_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  question_index integer not null,
  question_key text not null,
  question_text text not null,
  question_type text not null,
  answer_value jsonb not null,
  answer_text text,
  voice_used boolean default false,
  voice_provider text,
  ai_followup text,
  created_at timestamptz not null default now(),
  unique (session_id, question_index)
);

create index idx_answers_session on public.discovery_answers(session_id);

alter table public.discovery_answers enable row level security;

create policy "answers_select_own_via_session" on public.discovery_answers
  for select using (
    exists (select 1 from public.discovery_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "answers_insert_own_via_session" on public.discovery_answers
  for insert with check (
    exists (select 1 from public.discovery_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
