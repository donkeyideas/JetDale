-- Add the `demand_analysis` artifact type.
--
-- Demand analysis is the gate: before users invest in vision, scope,
-- and budget, the plan should surface whether real demand exists, what
-- assumptions would kill the idea if false, and 3-5 cheap experiments
-- to test demand this week. It runs FIRST in the generation order so
-- downstream artifacts have a demand verdict to anchor against.
--
-- The archetypes.artifact_types arrays are updated in a separate
-- migration because Postgres forbids using a newly-added enum value
-- in the same transaction that added it. See 20260620000002.

alter type public.artifact_type add value if not exists 'demand_analysis';
