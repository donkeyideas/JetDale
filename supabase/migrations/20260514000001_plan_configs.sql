-- Migration: plan_configs — dynamic pricing & plan management

create table public.plan_configs (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique,
  name text not null,
  description text,
  monthly_price_cents integer not null default 0,
  annual_price_cents integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  limits jsonb not null default '{}',
  features jsonb not null default '[]',
  cta_text text not null default 'Get Started',
  cta_url text not null default '/start',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_plan_configs_tier on public.plan_configs(tier);
create index idx_plan_configs_active on public.plan_configs(is_active);

create trigger plan_configs_updated_at
  before update on public.plan_configs
  for each row execute function public.set_updated_at();

alter table public.plan_configs enable row level security;

create policy "plan_admin_all" on public.plan_configs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "plan_public_read" on public.plan_configs
  for select using (is_active = true);

-- Seed plans matching current hardcoded pricing
insert into public.plan_configs (tier, name, description, monthly_price_cents, annual_price_cents, is_active, is_featured, sort_order, limits, features, cta_text, cta_url) values
(
  'free',
  'Free',
  'Perfect for trying Jetdale on a single project. No credit card required.',
  0,
  0,
  true,
  false,
  0,
  '{"projects_per_month": 1, "artifacts_per_project": 5, "export_formats": "Markdown only", "reality_checks": "1/month", "voice_minutes": 10, "chat_messages_per_day": 10, "ai_model": "Flash"}',
  '[{"feature": "Projects per month", "value": "1"}, {"feature": "Artifacts per project", "value": "5"}, {"feature": "Export formats", "value": "Markdown only"}, {"feature": "Reality checks", "value": "1/month"}, {"feature": "Voice input", "value": "10 min/month"}, {"feature": "Chat messages", "value": "10/day"}, {"feature": "AI model", "value": "Flash"}]',
  'Get started free',
  '/start'
),
(
  'pro',
  'Pro',
  'Unlimited projects, all export formats, voice input, reality checks.',
  4900,
  39000,
  true,
  true,
  1,
  '{"projects_per_month": -1, "artifacts_per_project": -1, "export_formats": "All 9 formats", "reality_checks": "Unlimited", "voice_minutes": 240, "chat_messages_per_day": 200, "ai_model": "Flash + Pro"}',
  '[{"feature": "Projects per month", "value": "Unlimited"}, {"feature": "Artifacts per project", "value": "Unlimited"}, {"feature": "Export formats", "value": "All 9 formats"}, {"feature": "Reality checks", "value": "Unlimited"}, {"feature": "Voice input", "value": "4 hours/month"}, {"feature": "Chat messages", "value": "200/day"}, {"feature": "AI model", "value": "Flash + Pro"}]',
  'Subscribe to Pro',
  '/start'
),
(
  'team',
  'Team',
  'Everything in Pro plus team collaboration, shared projects, and admin dashboard.',
  9900,
  94800,
  false,
  false,
  2,
  '{"projects_per_month": -1, "artifacts_per_project": -1, "export_formats": "All 9 formats", "reality_checks": "Unlimited", "voice_minutes": 600, "chat_messages_per_day": 500, "ai_model": "Flash + Pro"}',
  '[{"feature": "Projects per month", "value": "Unlimited"}, {"feature": "Artifacts per project", "value": "Unlimited"}, {"feature": "Export formats", "value": "All 9 formats"}, {"feature": "Reality checks", "value": "Unlimited"}, {"feature": "Voice input", "value": "10 hours/month"}, {"feature": "Chat messages", "value": "500/day"}, {"feature": "AI model", "value": "Flash + Pro"}]',
  'Contact Sales',
  '/start'
),
(
  'enterprise',
  'Enterprise',
  'Custom pricing for large organizations with dedicated support and SLAs.',
  0,
  0,
  false,
  false,
  3,
  '{"projects_per_month": -1, "artifacts_per_project": -1, "export_formats": "All 9 formats", "reality_checks": "Unlimited", "voice_minutes": -1, "chat_messages_per_day": -1, "ai_model": "Flash + Pro + Custom"}',
  '[{"feature": "Projects per month", "value": "Unlimited"}, {"feature": "Artifacts per project", "value": "Unlimited"}, {"feature": "Export formats", "value": "All 9 formats"}, {"feature": "Reality checks", "value": "Unlimited"}, {"feature": "Voice input", "value": "Unlimited"}, {"feature": "Chat messages", "value": "Unlimited"}, {"feature": "AI model", "value": "All models"}]',
  'Contact Sales',
  '/start'
);
