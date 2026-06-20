-- Prepend `demand_analysis` to every archetype's artifact_types so the
-- generation pipeline picks it up automatically. This runs in a
-- separate transaction from the ALTER TYPE because Postgres forbids
-- using a newly-added enum value in the same transaction that added it.
--
-- Idempotent: skips rows that already have demand_analysis.

update public.archetypes
set artifact_types =
  array['demand_analysis'::public.artifact_type] || artifact_types
where not ('demand_analysis'::public.artifact_type = any(artifact_types));
