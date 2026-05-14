-- Migration: blog_posts, social_posts, email_templates, site_content, api_configs

-- Blog posts & guides
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'blog' check (type in ('blog', 'guide')),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image text,
  author_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  tags text[] default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blog_slug on public.blog_posts(slug);
create index idx_blog_status on public.blog_posts(status);
create index idx_blog_type on public.blog_posts(type);

create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

create policy "blog_admin_all" on public.blog_posts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "blog_public_read" on public.blog_posts
  for select using (status = 'published');

-- Social posts
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('twitter', 'linkedin', 'facebook', 'instagram')),
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  engagement jsonb default '{}',
  error_message text,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_social_status on public.social_posts(status);
create index idx_social_platform on public.social_posts(platform);

create trigger social_posts_updated_at
  before update on public.social_posts
  for each row execute function public.set_updated_at();

alter table public.social_posts enable row level security;

create policy "social_admin_all" on public.social_posts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Email templates
create table public.email_templates (
  id text primary key,
  name text not null,
  category text not null check (category in ('transactional', 'lifecycle', 'auth')),
  subject text not null,
  html_body text not null default '',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

create policy "email_admin_all" on public.email_templates
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed default email templates
insert into public.email_templates (id, name, category, subject, description, html_body) values
  ('welcome', 'Welcome Email', 'transactional', 'Welcome to Jetdale!', 'Sent when a new user signs up', '<html><body><h1>Welcome to Jetdale</h1><p>Hi {{name}},</p><p>Thanks for joining Jetdale! We''re excited to help you plan your next project.</p><p>Get started by creating your first project.</p><p>— The Jetdale Team</p></body></html>'),
  ('trial_expiring', 'Trial Expiring', 'lifecycle', 'Your Jetdale trial ends in 3 days', 'Sent 3 days before trial expiration', '<html><body><h1>Your trial is ending soon</h1><p>Hi {{name}},</p><p>Your Jetdale trial expires in 3 days. Upgrade to Pro to keep all your projects and AI-generated documents.</p><p><a href="{{upgrade_url}}">Upgrade Now</a></p></body></html>'),
  ('trial_expired', 'Trial Expired', 'lifecycle', 'Your Jetdale trial has ended', 'Sent when trial expires', '<html><body><h1>Your trial has ended</h1><p>Hi {{name}},</p><p>Your Jetdale trial has expired. Your projects are safe — upgrade anytime to access them again.</p><p><a href="{{upgrade_url}}">Upgrade to Pro</a></p></body></html>'),
  ('password_reset', 'Password Reset', 'auth', 'Reset your Jetdale password', 'Sent when user requests password reset', '<html><body><h1>Reset your password</h1><p>Hi {{name}},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="{{reset_url}}">Reset Password</a></p></body></html>'),
  ('magic_link', 'Magic Link', 'auth', 'Your Jetdale sign-in link', 'Sent for passwordless sign-in', '<html><body><h1>Sign in to Jetdale</h1><p>Click the link below to sign in. This link expires in 10 minutes.</p><p><a href="{{magic_url}}">Sign In</a></p></body></html>'),
  ('team_invite', 'Team Invite', 'auth', 'You''ve been invited to Jetdale', 'Sent when an admin invites a team member', '<html><body><h1>You''re invited!</h1><p>{{inviter}} has invited you to join their team on Jetdale.</p><p><a href="{{invite_url}}">Accept Invite</a></p></body></html>');

-- Site content (marketing pages)
create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section text not null,
  content jsonb not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (page, section)
);

create index idx_content_page on public.site_content(page);

create trigger site_content_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;

create policy "content_admin_all" on public.site_content
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "content_public_read" on public.site_content
  for select using (is_active = true);

-- API configs
create table public.api_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  display_name text not null,
  api_key_encrypted text,
  base_url text,
  is_active boolean not null default false,
  config jsonb default '{}',
  last_tested_at timestamptz,
  test_status text check (test_status in ('success', 'failed', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger api_configs_updated_at
  before update on public.api_configs
  for each row execute function public.set_updated_at();

alter table public.api_configs enable row level security;

create policy "api_admin_all" on public.api_configs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed default API providers
insert into public.api_configs (provider, display_name, is_active) values
  ('deepseek', 'DeepSeek', true),
  ('supabase', 'Supabase', true),
  ('stripe', 'Stripe', true),
  ('resend', 'Resend (Email)', false);
