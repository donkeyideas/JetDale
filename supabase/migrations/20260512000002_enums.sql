-- Migration 002: All enum types

create type public.plan_tier as enum ('free', 'pro', 'team', 'enterprise');
create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'paused', 'expired');
create type public.project_phase as enum ('discovery', 'reality_check', 'artifacts', 'refine', 'export', 'live');
create type public.project_status as enum ('active', 'archived', 'deleted');
create type public.discovery_status as enum ('in_progress', 'completed', 'abandoned');
create type public.artifact_type as enum (
  'vision', 'scope', 'personas', 'roadmap', 'tech_stack',
  'wireframes', 'risk_register', 'success_metrics', 'budget',
  'decision_log', 'pre_mortem', 'pitch_deck'
);
create type public.artifact_status as enum ('generating', 'ready', 'failed', 'stale');
create type public.export_target as enum (
  'claude_code', 'cursor', 'lovable', 'bolt', 'replit',
  'zip_markdown', 'pdf', 'pitch_deck', 'rfp'
);
create type public.ai_event_type as enum (
  'discovery_question', 'discovery_answer', 'reality_check',
  'artifact_generation', 'workspace_chat', 'export_prep'
);
create type public.user_role as enum ('user', 'admin', 'support', 'investor_readonly');
