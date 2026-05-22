-- Migration: enforce the monthly project-creation limit at the database level.
-- The web app creates projects with a direct browser upsert into `projects`,
-- so a row-level trigger is the only place the quota can be enforced reliably.
-- Limits come from plan_configs.limits->>'projects_per_month' (-1 = unlimited).

create or replace function public.enforce_project_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier  text;
  v_limit int;
  v_count int;
begin
  -- An upsert that targets an existing project is an update (re-sync),
  -- not a new project — never counts against quota.
  if exists (select 1 from public.projects where id = NEW.id) then
    return NEW;
  end if;

  -- Staff accounts are exempt from plan quotas.
  if exists (
    select 1 from public.profiles
    where id = NEW.user_id and role in ('admin', 'investor_readonly')
  ) then
    return NEW;
  end if;

  -- Resolve the user's plan tier from their active subscription.
  select plan_tier into v_tier
  from public.subscriptions
  where user_id = NEW.user_id and status in ('active', 'trialing')
  order by created_at desc
  limit 1;
  v_tier := coalesce(v_tier, 'free');

  -- Monthly project limit for that tier (-1 = unlimited).
  select coalesce((limits ->> 'projects_per_month')::int, -1) into v_limit
  from public.plan_configs
  where tier = v_tier;
  v_limit := coalesce(v_limit, case when v_tier = 'free' then 1 else -1 end);

  if v_limit >= 0 then
    select count(*) into v_count
    from public.projects
    where user_id = NEW.user_id
      and created_at >= date_trunc('month', now());

    if v_count >= v_limit then
      raise exception
        'PROJECT_QUOTA_EXCEEDED: the % plan allows % project(s) per month', v_tier, v_limit
        using errcode = 'check_violation';
    end if;
  end if;

  -- Keep the usage meter in sync for the admin dashboard.
  update public.usage_quotas
  set projects_created = projects_created + 1,
      updated_at = now()
  where user_id = NEW.user_id;

  return NEW;
end;
$$;

drop trigger if exists enforce_project_quota_trigger on public.projects;
create trigger enforce_project_quota_trigger
  before insert on public.projects
  for each row
  execute function public.enforce_project_quota();
