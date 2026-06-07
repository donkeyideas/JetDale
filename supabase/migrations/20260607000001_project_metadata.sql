-- Add a metadata jsonb column to projects so the planning pipeline can
-- cache the Decision Ledger and audit results without polluting the
-- artifact list. The ledger is plumbing — users see vision/scope/etc,
-- not the structured ledger that downstream prompts read from.

alter table public.projects
  add column if not exists metadata jsonb not null default '{}';
