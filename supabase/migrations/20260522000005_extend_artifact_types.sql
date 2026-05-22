-- Migration: extend the artifact_type enum with the 5 values the web
-- frontend has been generating but the enum was missing. Without these
-- values, supabase.from('artifacts').upsert({ type: <new value> }) was
-- failing with 400 (invalid enum) for every project — those artifacts
-- only ever existed in browser localStorage.
--
-- Note: `ALTER TYPE ... ADD VALUE` works inside a transaction in PG 12+
-- (Supabase runs 15+); the new values just can't be USED in the same
-- transaction. That's fine — this migration only adds them.

alter type public.artifact_type add value if not exists 'competitive_analysis';
alter type public.artifact_type add value if not exists 'user_journey';
alter type public.artifact_type add value if not exists 'architecture_overview';
alter type public.artifact_type add value if not exists 'raci_matrix';
alter type public.artifact_type add value if not exists 'go_to_market';
