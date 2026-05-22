-- Fix infinite recursion in RLS policies
-- The admin policies all do `exists (select 1 from public.profiles where ...)`.
-- When that subquery hits the profiles table, RLS re-evaluates profiles' own
-- admin policy, which queries profiles again — infinite recursion.
--
-- The admin app uses the service role key via createSupabaseAdminClient(),
-- which bypasses RLS entirely. So these admin policies aren't needed.
-- Dropping them fixes the recursion and lets normal users read their own data.

drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "subscriptions_select_admin" on public.subscriptions;
drop policy if exists "projects_select_admin" on public.projects;
drop policy if exists "discovery_select_admin" on public.discovery_sessions;
drop policy if exists "artifacts_select_admin" on public.artifacts;
drop policy if exists "archetypes_admin_all" on public.archetypes;
drop policy if exists "plan_admin_all" on public.plan_configs;
drop policy if exists "ai_events_admin_select" on public.ai_events;
drop policy if exists "quotas_admin_select" on public.usage_quotas;
drop policy if exists "audit_admin_only" on public.audit_log;
drop policy if exists "flags_admin_write" on public.feature_flags;
drop policy if exists "events_select_admin" on public.product_events;
drop policy if exists "blog_admin_all" on public.blog_posts;
drop policy if exists "social_admin_all" on public.social_posts;
drop policy if exists "email_admin_all" on public.email_templates;
drop policy if exists "content_admin_all" on public.site_content;
drop policy if exists "api_admin_all" on public.api_configs;
