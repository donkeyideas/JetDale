-- Migration: cross-artifact contradictions on reality_checks.
-- The reality check now finds two distinct categories of issues:
--   1. concerns  — real-world risks (legal, market, technical, etc.)
--   2. contradictions — internal inconsistencies between the artifacts
--      (e.g., vision promises X but scope deferred X; budget funds Y
--      but roadmap doesn't include Y; success metrics reference a
--      feature scope removed). Each contradiction names the artifacts
--      it spans so the workspace can mark them inline.

alter table public.reality_checks
  add column if not exists contradictions jsonb not null default '[]'::jsonb;
