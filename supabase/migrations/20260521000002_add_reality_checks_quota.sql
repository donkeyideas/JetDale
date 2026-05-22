-- Migration: separate reality-check usage from discovery usage.
-- Previously ai-reality-check incremented `discoveries_completed`, so on the
-- Free tier a reality check and a discovery shared one counter. This adds a
-- dedicated `reality_checks_completed` column and wires it into the monthly reset.

alter table public.usage_quotas
  add column if not exists reality_checks_completed integer not null default 0;

-- Backfill: existing rows start the new counter at 0 (handled by the default).
-- We intentionally do NOT migrate values out of discoveries_completed — that
-- column's history is a mix of both actions and cannot be split retroactively.

-- Include the new column in the monthly quota reset.
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
    reality_checks_completed = 0,
    artifacts_generated = 0,
    exports_run = 0,
    voice_minutes_used = 0,
    ai_cost_cents = 0,
    updated_at = now()
  where period_start < date_trunc('month', now());
end;
$$;
