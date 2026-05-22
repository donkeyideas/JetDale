-- Migration: Jetdale review score on reality_checks.
-- Every reality check now derives a 5-axis review score from its concerns
-- (severity-weighted deductions). The score is FROZEN per run so users
-- see their grade improve as they address issues across versions.
--
-- Axes: clarity, feasibility, market, riskReadiness, buildReadiness.
-- Each axis starts at 100; concerns deduct by severity (high 15, med 8, low 3).

alter table public.reality_checks
  add column if not exists overall_score integer,
  add column if not exists letter_grade text,
  add column if not exists axis_scores  jsonb;
