-- Migration 011: Materialized views for admin KPIs + refresh function

-- MRR snapshot
create materialized view public.mv_mrr_snapshot as
select
  date_trunc('day', now()) as snapshot_date,
  coalesce(sum(case
    when interval = 'month' then amount_cents
    when interval = 'year' then amount_cents / 12
    else 0
  end), 0) as mrr_cents,
  count(*) filter (where status = 'active') as active_subs,
  count(*) filter (where status = 'trialing') as trialing_subs,
  count(distinct user_id) as paying_customers
from public.subscriptions
where status in ('active', 'trialing');

-- Activation funnel by day (last 90 days)
create materialized view public.mv_activation_funnel as
select
  date_trunc('day', created_at) as day,
  count(*) filter (where event = 'signup') as signups,
  count(*) filter (where event = 'discovery_started') as discovery_started,
  count(*) filter (where event = 'discovery_completed') as discovery_completed,
  count(*) filter (where event = 'artifact_generation_completed') as artifacts_generated,
  count(*) filter (where event = 'export_completed') as exported,
  count(*) filter (where event = 'checkout_completed') as paid
from public.product_events
where created_at >= now() - interval '90 days'
group by 1;

-- Cohort retention (signup month -> activity in subsequent months)
create materialized view public.mv_cohort_retention as
with cohorts as (
  select
    id as user_id,
    date_trunc('month', created_at) as cohort_month
  from public.profiles
)
select
  c.cohort_month,
  count(distinct c.user_id) as cohort_size,
  date_trunc('month', e.created_at) as activity_month,
  count(distinct e.user_id) as active_users
from cohorts c
left join public.ai_events e on e.user_id = c.user_id
group by 1, 3
order by 1, 3;

-- Unit economics: cost vs revenue per user
create materialized view public.mv_unit_economics as
select
  p.id as user_id,
  p.email,
  s.plan_tier,
  s.amount_cents as mrr_cents,
  coalesce(sum(ai.cost_cents), 0) as ai_cost_cents_30d
from public.profiles p
left join public.subscriptions s on s.user_id = p.id and s.status in ('active', 'trialing')
left join public.ai_events ai on ai.user_id = p.id and ai.created_at > now() - interval '30 days'
group by 1, 2, 3, 4;

-- Unique indexes for concurrent refresh
create unique index mv_mrr_snapshot_idx on public.mv_mrr_snapshot(snapshot_date);
create unique index mv_activation_funnel_idx on public.mv_activation_funnel(day);
create unique index mv_cohort_retention_idx on public.mv_cohort_retention(cohort_month, activity_month);
create unique index mv_unit_economics_idx on public.mv_unit_economics(user_id);

-- Refresh function (called every 5 minutes by cron)
create or replace function public.refresh_admin_mvs()
returns void
language sql
security definer
as $$
  refresh materialized view concurrently public.mv_mrr_snapshot;
  refresh materialized view concurrently public.mv_activation_funnel;
  refresh materialized view concurrently public.mv_cohort_retention;
  refresh materialized view concurrently public.mv_unit_economics;
$$;

-- Monthly quota reset function (called daily at 00:00 UTC)
create or replace function public.reset_monthly_quotas()
returns void
language plpgsql
security definer
as $$
begin
  update public.usage_quotas
  set
    period_start = date_trunc('month', now()),
    projects_created = 0,
    discoveries_completed = 0,
    artifacts_generated = 0,
    exports_run = 0,
    voice_minutes_used = 0,
    ai_cost_cents = 0,
    updated_at = now()
  where period_start < date_trunc('month', now());
end;
$$;

-- Expired exports cleanup function (called every hour)
create or replace function public.cleanup_expired_exports()
returns void
language sql
security definer
as $$
  delete from public.exports
  where expires_at < now() and status = 'ready';
$$;
