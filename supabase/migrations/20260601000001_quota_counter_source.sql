-- Migration: project-quota trigger now reads the monotonic usage_quotas
-- counter instead of counting rows in the projects table.
--
-- The previous version counted rows in `projects` for the current month.
-- Hard-deleting a project removes its row, so a free user could
-- delete-and-recreate indefinitely without ever hitting their monthly
-- limit. The counter in `usage_quotas.projects_created` increments on
-- create but does NOT decrement on delete, so reading it instead makes
-- the monthly quota bypass-proof while keeping delete fully available
-- (no GDPR exposure, no dark-pattern UX, no brand damage).
--
-- reset_monthly_quotas() (called by cron-daily on the 1st of the month)
-- already resets this counter, so monthly behaviour is preserved.

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
    -- READ THE MONOTONIC COUNTER, not count(*) over the projects table.
    -- This is the line that closes the delete-and-recreate exploit.
    select coalesce(projects_created, 0) into v_count
    from public.usage_quotas
    where user_id = NEW.user_id;
    v_count := coalesce(v_count, 0);

    if v_count >= v_limit then
      raise exception
        'PROJECT_QUOTA_EXCEEDED: the % plan allows % project(s) per month', v_tier, v_limit
        using errcode = 'check_violation';
    end if;
  end if;

  -- Increment the monthly meter (drives the admin dashboard AND the next
  -- quota check above for this user).
  update public.usage_quotas
  set projects_created = projects_created + 1,
      updated_at = now()
  where user_id = NEW.user_id;

  -- Safety: if usage_quotas row was missing for this user, create it
  -- with the freshly-created project counted.
  insert into public.usage_quotas (user_id, projects_created)
  values (NEW.user_id, 1)
  on conflict (user_id) do nothing;

  return NEW;
end;
$$;
