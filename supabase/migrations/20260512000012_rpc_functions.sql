-- Migration 012: RPC functions for atomic increments (used by Edge Functions)

-- Increment AI cost in usage_quotas
create or replace function public.increment_ai_cost(p_user_id uuid, p_cost integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.usage_quotas
  set ai_cost_cents = ai_cost_cents + p_cost,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Increment a specific quota field
create or replace function public.increment_quota_field(
  p_user_id uuid,
  p_field text,
  p_amount integer default 1
)
returns void
language plpgsql
security definer
as $$
begin
  execute format(
    'update public.usage_quotas set %I = %I + $1, updated_at = now() where user_id = $2',
    p_field, p_field
  ) using p_amount, p_user_id;
end;
$$;

-- Increment voice minutes
create or replace function public.increment_voice_minutes(
  p_user_id uuid,
  p_minutes numeric
)
returns void
language plpgsql
security definer
as $$
begin
  update public.usage_quotas
  set voice_minutes_used = voice_minutes_used + p_minutes,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- Increment lifetime totals
create or replace function public.increment_lifetime_total(
  p_user_id uuid,
  p_field text,
  p_amount integer default 1
)
returns void
language plpgsql
security definer
as $$
begin
  execute format(
    'update public.usage_quotas set %I = %I + $1, updated_at = now() where user_id = $2',
    p_field, p_field
  ) using p_amount, p_user_id;
end;
$$;

-- Increment archetype project count (denormalized stat)
create or replace function public.increment_archetype_project_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.archetype_id is not null then
    update public.archetypes
    set project_count = project_count + 1,
        updated_at = now()
    where id = new.archetype_id;
  end if;
  return new;
end;
$$;

create trigger on_project_created_archetype_count
  after insert on public.projects
  for each row execute function public.increment_archetype_project_count();

-- Increment export download count
create or replace function public.increment_export_downloads(p_export_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.exports
  set download_count = download_count + 1,
      updated_at = now()
  where id = p_export_id;
end;
$$;
