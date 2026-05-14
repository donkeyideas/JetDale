# Jetdale — Claude Code Build Specification

**Version:** 1.0
**Last updated:** May 12, 2026
**Tagline:** The AI Project Architect — Plan before you build.
**Audience:** Claude Code agent building this product end-to-end.

---

## 0. How to read this document

This is a build spec, not a brainstorm. Every section is normative — meaning "this is what gets built." If something here conflicts with an assumption from your training data, this document wins.

**Rules for Claude Code building from this spec:**

1. **Do not improvise architecture.** The stack is fixed (Section 1). Do not swap libraries unless I explicitly approve.
2. **Do not skip RLS.** Every Supabase table must have Row Level Security enabled with explicit policies. Mobile app has the anon key in the binary; RLS is the only real security.
3. **Do not call DeepSeek from the mobile client.** All AI calls go through the backend (Supabase Edge Functions or Vercel serverless). The DeepSeek API key never touches the client.
4. **Build in the order specified (Section 14).** Don't build the admin dashboard before the discovery flow works. Don't build payments before users can create projects.
5. **Stop and ask before destructive operations.** Migrations that drop columns, anything that touches production data, anything that costs more than $5 to run.
6. **Use Expo SDK 55 conventions.** New Architecture is mandatory. Code lives in `/src/app`. Use Native Tabs API. Use Expo Router v7.
7. **All money is in cents (integers).** Never store dollars as floats. Stripe and Postgres both prefer integer cents.
8. **All timestamps are `timestamptz` (UTC).** Convert to local time only at the UI layer.
9. **All IDs are UUIDs.** Use `gen_random_uuid()` in Postgres. Never use sequential integers as primary keys for any user-facing entity.
10. **No magic numbers.** Every threshold (free plan limits, rate limits, retention windows) goes in `src/config/limits.ts`.

---

## 1. Tech stack (locked)

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Mobile/web framework | Expo | SDK 55 | New Architecture, React Native 0.83, React 19.2, Expo Router v7 |
| Backend / DB / Auth / Storage | Supabase | latest | Postgres 15+, Auth, Storage, Edge Functions (Deno) |
| Web app + serverless functions | Vercel | Next.js 15+ App Router | Admin dashboard, marketing site, webhook endpoints |
| AI inference | DeepSeek API | `deepseek-v4-flash` and `deepseek-v4-pro` | OpenAI-compatible. **Never** use deprecated `deepseek-chat` or `deepseek-reasoner` aliases — they sunset July 24, 2026. |
| Mobile payments | RevenueCat | latest | Wraps StoreKit (iOS) + Google Play Billing (Android). Webhooks to Supabase. |
| Web payments | Stripe | latest | Checkout + Billing Portal for web Pro/Team plans |
| Email | Resend | latest | Transactional + receipts |
| Push notifications | Expo Notifications | bundled | Use `expo-notifications` |
| Voice-to-text (free path) | Web Speech API (web) + `expo-speech-recognition` (mobile) | latest | Live transcript |
| Voice-to-text (premium path) | DeepSeek API does not offer Whisper. Use Groq's hosted Whisper (`whisper-large-v3-turbo`) | — | Cheap, fast. Backend-only. |
| Analytics | PostHog | self-hosted or cloud | Product analytics, feature flags, session replay |
| Error monitoring | Sentry | latest | Mobile + web + backend |
| CI/CD mobile | EAS Build + EAS Submit | latest | Production builds, app store submission |
| CI/CD web | Vercel | — | Auto-deploy from `main` |
| Logging | Axiom or Better Stack | — | Edge function and Vercel log aggregation |

**Hard rules:**
- Do not introduce any other backend services without writing an ADR (architecture decision record) in `/docs/adr/`.
- Do not use Firebase. Do not use Auth0. Supabase Auth is the single source of identity.
- Do not call DeepSeek directly from the mobile/web client. Proxy everything through `supabase/functions/ai-*`.

---

## 2. Repository structure

This is a monorepo. Use pnpm workspaces.

```
jetdale/
├── apps/
│   ├── mobile/                      # Expo 55 app (iOS + Android + web)
│   │   ├── src/
│   │   │   ├── app/                 # Expo Router routes (SDK 55: code lives in /src/app)
│   │   │   │   ├── (auth)/          # signin, signup, forgot-password
│   │   │   │   ├── (onboarding)/    # post-signup welcome
│   │   │   │   ├── (tabs)/          # main tabbed app (Native Tabs API)
│   │   │   │   │   ├── index.tsx    # Dashboard
│   │   │   │   │   ├── projects.tsx
│   │   │   │   │   ├── learn.tsx
│   │   │   │   │   └── settings.tsx
│   │   │   │   ├── project/
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── index.tsx           # workspace
│   │   │   │   │       ├── artifact/[slug].tsx
│   │   │   │   │       └── export.tsx
│   │   │   │   ├── discovery/
│   │   │   │   │   ├── start.tsx
│   │   │   │   │   ├── [sessionId]/
│   │   │   │   │   │   └── q/[step].tsx
│   │   │   │   │   └── complete/[sessionId].tsx
│   │   │   │   ├── paywall.tsx
│   │   │   │   └── _layout.tsx
│   │   │   ├── components/          # Shared UI primitives
│   │   │   ├── features/            # Feature-grouped logic (discovery, artifacts, projects, billing)
│   │   │   ├── lib/                 # supabase client, revenue-cat client, hooks
│   │   │   ├── config/              # constants, limits, archetypes manifest
│   │   │   ├── types/               # generated supabase types + app types
│   │   │   └── theme/               # tokens, typography
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   │
│   └── admin/                       # Next.js 15 (App Router) — admin + marketing site
│       ├── src/
│       │   ├── app/
│       │   │   ├── (marketing)/     # public landing pages
│       │   │   ├── (admin)/         # /admin/* gated to admin role
│       │   │   └── api/             # webhook receivers, server actions
│       │   ├── components/
│       │   ├── lib/
│       │   └── server/
│       ├── next.config.js
│       └── package.json
│
├── packages/
│   ├── shared/                      # Types, archetype definitions, prompt templates
│   │   ├── src/
│   │   │   ├── archetypes/          # JSON schemas + scripts per archetype
│   │   │   ├── prompts/             # System prompts for DeepSeek
│   │   │   ├── artifact-schemas/    # Zod schemas for each artifact type
│   │   │   └── types.ts
│   │   └── package.json
│   └── ui/                          # Shared design system (if needed)
│
├── supabase/
│   ├── migrations/                  # SQL migrations (numbered, append-only)
│   ├── functions/                   # Edge Functions (Deno)
│   │   ├── ai-discovery/            # Discovery Q&A streaming
│   │   ├── ai-artifact-gen/         # Artifact generation
│   │   ├── ai-reality-check/        # Reality-check pass
│   │   ├── ai-chat/                 # Workspace chat
│   │   ├── revenuecat-webhook/
│   │   ├── stripe-webhook/
│   │   └── _shared/                 # Shared utilities (rate limiting, auth checks)
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── adr/                         # Architecture decision records
│   ├── runbooks/                    # On-call procedures
│   └── archetypes/                  # Human-readable archetype docs
│
├── .env.example
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                       # Turbo (optional, for build caching)
└── README.md
```

---

## 3. Environment variables

Create `.env.example` with this exact content. **Never** commit the real `.env`.

```
# ============== SUPABASE ==============
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx     # New-style key (not legacy "anon")
SUPABASE_SECRET_KEY=sb_secret_xxxxx                            # Server-only. NEVER expose.
SUPABASE_JWT_SECRET=xxxxx                                      # For verifying JWTs in Vercel functions

# ============== DEEPSEEK ==============
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL_FAST=deepseek-v4-flash
DEEPSEEK_MODEL_DEEP=deepseek-v4-pro

# ============== GROQ (for voice transcription) ==============
GROQ_API_KEY=gsk_xxxxx
GROQ_WHISPER_MODEL=whisper-large-v3-turbo

# ============== STRIPE (web payments) ==============
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# ============== REVENUECAT (mobile payments) ==============
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxx
REVENUECAT_WEBHOOK_SECRET=xxxxx
REVENUECAT_SECRET_API_KEY=sk_xxxxx

# ============== EMAIL ==============
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=hello@jetdale.com

# ============== ANALYTICS ==============
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# ============== ERROR MONITORING ==============
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxx
SENTRY_ORG=jetdale
SENTRY_PROJECT_MOBILE=jetdale-mobile
SENTRY_PROJECT_WEB=jetdale-web

# ============== APP CONFIG ==============
EXPO_PUBLIC_APP_URL=https://jetdale.com
EXPO_PUBLIC_API_URL=https://api.jetdale.com
EXPO_PUBLIC_ENV=production                                     # development | preview | production
```

**Validation:** Build `src/config/env.ts` that validates all env vars at startup using Zod. App must crash with a clear error if any required var is missing.

---

## 4. Brand and design tokens

### Color palette (locked)

```ts
// src/theme/tokens.ts
export const colors = {
  ink:      '#0E0F0C',
  paper:    '#F4F1EA',
  paper2:   '#EAE5D9',
  paper3:   '#DDD6C5',
  rule:     '#2A2B26',
  accent:   '#FF5B1F',  // burnt orange — primary CTA
  accent2:  '#E84A0F',  // hover / pressed
  moss:     '#2E4A2C',  // success
  gold:     '#C9A227',  // warnings / highlights
  muted:    '#6B6B62',  // secondary text
  error:    '#C7321A',
} as const;
```

### Typography

- **Display:** Bricolage Grotesque, 600 weight, tight tracking (-0.035em). Used for headings, large numerals.
- **Body:** Manrope, 400/500/600. Used for everything else.
- **Mono:** Space Mono, 400/700. Used for labels, codes, KPI metadata, dates.

Type scale (rem on web, equivalent points on mobile):

| Token | Web (rem) | Mobile (pt) | Use |
|---|---|---|---|
| `display-xl` | 6rem | 56 | Hero headline |
| `display-lg` | 3.5rem | 40 | Page titles |
| `display-md` | 2.25rem | 28 | Section titles |
| `display-sm` | 1.5rem | 20 | Card titles, h3 |
| `body-lg` | 1.125rem | 17 | Lead paragraphs |
| `body-md` | 1rem | 15 | Default body |
| `body-sm` | 0.875rem | 13 | Secondary text |
| `mono-xs` | 0.6875rem | 10 | Eyebrow labels, metadata |

### Spacing scale

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 120` (px on web, dp on mobile). Use these. Never use arbitrary values.

### Border radius

`4, 6, 8, 12, 999` (999 = pill).

### Motion

- Default transition: 150ms ease-out
- Page transitions: 200ms ease-in-out
- Hover lift: `translateY(-2px)`
- Press: `scale(0.98)`
- Mic pulse: 1.5s ease-in-out infinite

### Voice

- Confident, not corporate. Senior PM, not customer success.
- Never apologize unprompted.
- Never use "delve," "leverage," "robust," "cutting-edge," or any LinkedIn-bingo phrases.
- Push back when the user is wrong. Reality Check feature is a feature, not a bug.
- Headlines use Title Case sparingly; prefer sentence case for everything except hero titles.

---

## 5. Database schema

This is the canonical schema. Build it in this exact order. Each table includes RLS policies — these are not optional.

### 5.1 Conventions

- Every table has: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now() not null`, `updated_at timestamptz default now() not null`.
- Every row mutation triggers `updated_at` via a `set_updated_at()` trigger (defined once, reused).
- Soft delete via `deleted_at timestamptz null` where listed. Never hard-delete user-owned content.
- All money columns are `integer` (cents). Currency is implied USD; add `currency text` column if multi-currency ever happens.
- Use Postgres enums via `create type`. List values exhaustively below.

### 5.2 Enums

```sql
create type plan_tier as enum ('free', 'pro', 'team', 'enterprise');
create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'paused', 'expired');
create type project_phase as enum ('discovery', 'reality_check', 'artifacts', 'refine', 'export', 'live');
create type project_status as enum ('active', 'archived', 'deleted');
create type discovery_status as enum ('in_progress', 'completed', 'abandoned');
create type artifact_type as enum (
  'vision', 'scope', 'personas', 'roadmap', 'tech_stack',
  'wireframes', 'risk_register', 'success_metrics', 'budget',
  'decision_log', 'pre_mortem', 'pitch_deck'
);
create type artifact_status as enum ('generating', 'ready', 'failed', 'stale');
create type export_target as enum (
  'claude_code', 'cursor', 'lovable', 'bolt', 'replit',
  'zip_markdown', 'pdf', 'pitch_deck', 'rfp'
);
create type ai_event_type as enum (
  'discovery_question', 'discovery_answer', 'reality_check',
  'artifact_generation', 'workspace_chat', 'export_prep'
);
create type user_role as enum ('user', 'admin', 'support', 'investor_readonly');
```

### 5.3 Tables (with RLS)

#### `profiles` — extends `auth.users`

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'user',
  onboarding_completed boolean not null default false,
  voice_preference text default 'auto',          -- 'auto' | 'web_speech' | 'whisper'
  email_notifications boolean not null default true,
  push_token text,                                -- Expo push token
  timezone text default 'UTC',
  marketing_opt_in boolean not null default false,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger: create profile row on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

#### `subscriptions`

```sql
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_tier plan_tier not null default 'free',
  status subscription_status not null default 'active',
  -- Provider tracking
  provider text,                                   -- 'stripe' | 'revenuecat_ios' | 'revenuecat_android' | 'manual'
  provider_subscription_id text,                   -- Stripe sub id OR RevenueCat entitlement
  provider_customer_id text,
  -- Billing
  amount_cents integer,
  interval text,                                   -- 'month' | 'year'
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  -- Metadata
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_subscription_id)
);

create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_period_end on public.subscriptions(current_period_end);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "subscriptions_select_admin" on public.subscriptions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
-- Writes only from service_role (webhooks). No client policy.
```

#### `archetypes`

```sql
create table public.archetypes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                       -- e.g. 'indie_saas', 'mobile_game', 'wedding'
  name text not null,
  category text not null,                          -- 'software' | 'creator' | 'physical' | 'event' | 'service'
  description text,
  icon_name text,
  -- Discovery script (versioned)
  script_version integer not null default 1,
  question_count integer not null,
  estimated_minutes integer not null default 20,
  -- Artifact templates this archetype produces
  artifact_types artifact_type[] not null default '{}',
  -- AI persona for this archetype
  expert_persona text,                             -- e.g. "ex-Shopify PM with 10 years marketplace experience"
  -- Visibility
  is_active boolean not null default true,
  is_premium boolean not null default false,       -- gated to Pro+
  -- Stats (denormalized for admin dashboard)
  project_count integer not null default 0,
  completion_rate numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_archetypes_active on public.archetypes(is_active) where is_active = true;
create index idx_archetypes_category on public.archetypes(category);

alter table public.archetypes enable row level security;
create policy "archetypes_select_all" on public.archetypes
  for select using (is_active = true);
create policy "archetypes_admin_all" on public.archetypes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

#### `projects`

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  archetype_id uuid references public.archetypes(id),
  -- Identity
  name text not null,
  tagline text,                                    -- "neighborhood dog sitters"
  spark_text text,                                 -- the one-sentence original idea
  -- State
  phase project_phase not null default 'discovery',
  status project_status not null default 'active',
  progress_pct integer not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
  -- Derived insights (cached for dashboard speed)
  active_risks integer not null default 0,
  pending_decisions integer not null default 0,
  last_activity_at timestamptz default now(),
  next_action text,                                -- "Review wireframes & approve user flow"
  -- Settings
  is_starred boolean not null default false,
  -- Meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create index idx_projects_user on public.projects(user_id) where deleted_at is null;
create index idx_projects_phase on public.projects(phase);
create index idx_projects_user_active on public.projects(user_id, last_activity_at desc) where status = 'active';

alter table public.projects enable row level security;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id and deleted_at is null);
create policy "projects_select_admin" on public.projects
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);
```

#### `discovery_sessions`

Tracks each interview run. Append-only history (we keep prior sessions if a user redoes discovery).

```sql
create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  archetype_id uuid not null references public.archetypes(id),
  archetype_script_version integer not null,
  status discovery_status not null default 'in_progress',
  current_question_index integer not null default 0,
  total_questions integer not null,
  -- Final summarized output that feeds artifact gen
  summary jsonb,
  -- Voice usage stats
  voice_minutes_used numeric(8,2) default 0,
  -- Token usage tracking
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  cost_cents integer default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_discovery_project on public.discovery_sessions(project_id);
create index idx_discovery_user on public.discovery_sessions(user_id);
create index idx_discovery_status on public.discovery_sessions(status);

alter table public.discovery_sessions enable row level security;
create policy "discovery_select_own" on public.discovery_sessions
  for select using (auth.uid() = user_id);
create policy "discovery_select_admin" on public.discovery_sessions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
create policy "discovery_insert_own" on public.discovery_sessions
  for insert with check (auth.uid() = user_id);
create policy "discovery_update_own" on public.discovery_sessions
  for update using (auth.uid() = user_id);
```

#### `discovery_answers`

```sql
create table public.discovery_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  question_index integer not null,
  question_key text not null,                      -- 'problem_pain', 'budget_range'
  question_text text not null,                     -- the rendered question shown to the user
  question_type text not null,                     -- 'open_text' | 'single_select' | 'multi_select' | 'numeric'
  answer_value jsonb not null,                     -- raw answer
  answer_text text,                                -- denormalized text for FTS
  voice_used boolean default false,
  voice_provider text,                             -- 'web_speech' | 'whisper'
  ai_followup text,                                -- the AI's response/next question
  created_at timestamptz not null default now(),
  unique (session_id, question_index)
);

create index idx_answers_session on public.discovery_answers(session_id);

alter table public.discovery_answers enable row level security;
create policy "answers_select_own_via_session" on public.discovery_answers
  for select using (
    exists (select 1 from public.discovery_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
create policy "answers_insert_own_via_session" on public.discovery_answers
  for insert with check (
    exists (select 1 from public.discovery_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
```

#### `artifacts`

```sql
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type artifact_type not null,
  status artifact_status not null default 'generating',
  version integer not null default 1,
  is_current boolean not null default true,        -- only one current version per (project, type)
  -- Content
  title text,
  content_markdown text,                           -- rendered MD for display + export
  content_json jsonb,                              -- structured form for editing
  -- Generation metadata
  generation_model text,                           -- 'deepseek-v4-flash' | 'deepseek-v4-pro'
  generation_prompt_tokens integer,
  generation_completion_tokens integer,
  generation_cost_cents integer,
  generation_seconds numeric(6,2),
  -- User edits
  edited_by_user boolean not null default false,
  last_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_artifacts_current on public.artifacts(project_id, type)
  where is_current = true;
create index idx_artifacts_project on public.artifacts(project_id);
create index idx_artifacts_type on public.artifacts(project_id, type);

alter table public.artifacts enable row level security;
create policy "artifacts_select_own" on public.artifacts
  for select using (auth.uid() = user_id);
create policy "artifacts_select_admin" on public.artifacts
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
create policy "artifacts_insert_own" on public.artifacts
  for insert with check (auth.uid() = user_id);
create policy "artifacts_update_own" on public.artifacts
  for update using (auth.uid() = user_id);
```

#### `reality_checks`

```sql
create table public.reality_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Generated assessment
  summary text not null,
  concerns jsonb not null,                          -- [{severity, area, message, suggested_action}]
  proposed_changes jsonb,                           -- [{artifact_type, change_description}]
  -- User response
  accepted boolean,
  accepted_changes jsonb,
  rejected_changes jsonb,
  user_response_at timestamptz,
  -- Cost tracking
  generation_cost_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reality_project on public.reality_checks(project_id);

alter table public.reality_checks enable row level security;
create policy "reality_select_own" on public.reality_checks
  for select using (auth.uid() = user_id);
create policy "reality_insert_own" on public.reality_checks
  for insert with check (auth.uid() = user_id);
create policy "reality_update_own" on public.reality_checks
  for update using (auth.uid() = user_id);
```

#### `chat_messages` (workspace AI chat)

```sql
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'reality_check')),
  content text not null,
  -- For citations and grounded responses
  references_artifact_ids uuid[],
  -- Cost
  prompt_tokens integer,
  completion_tokens integer,
  cost_cents integer,
  created_at timestamptz not null default now()
);

create index idx_chat_project on public.chat_messages(project_id, created_at desc);

alter table public.chat_messages enable row level security;
create policy "chat_select_own" on public.chat_messages
  for select using (auth.uid() = user_id);
create policy "chat_insert_own" on public.chat_messages
  for insert with check (auth.uid() = user_id);
```

#### `exports`

```sql
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target export_target not null,
  status text not null default 'preparing' check (status in ('preparing','ready','failed')),
  storage_path text,                                -- supabase storage path for the zip/pdf
  file_size_bytes bigint,
  download_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exports_project on public.exports(project_id);

alter table public.exports enable row level security;
create policy "exports_select_own" on public.exports
  for select using (auth.uid() = user_id);
create policy "exports_insert_own" on public.exports
  for insert with check (auth.uid() = user_id);
```

#### `ai_events` — audit log for every AI call

```sql
create table public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  event_type ai_event_type not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  cost_cents integer not null default 0,
  latency_ms integer,
  success boolean not null default true,
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_ai_events_user on public.ai_events(user_id, created_at desc);
create index idx_ai_events_type on public.ai_events(event_type, created_at desc);
create index idx_ai_events_created on public.ai_events(created_at desc);

alter table public.ai_events enable row level security;
-- No client read access. Admin only.
create policy "ai_events_admin_select" on public.ai_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
```

#### `usage_quotas` — per-user limits

```sql
create table public.usage_quotas (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- Monthly counters (reset on first of month UTC)
  period_start timestamptz not null default date_trunc('month', now()),
  projects_created integer not null default 0,
  discoveries_completed integer not null default 0,
  artifacts_generated integer not null default 0,
  exports_run integer not null default 0,
  voice_minutes_used numeric(8,2) not null default 0,
  ai_cost_cents integer not null default 0,
  -- Lifetime
  total_projects integer not null default 0,
  total_artifacts integer not null default 0,
  total_exports integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.usage_quotas enable row level security;
create policy "quotas_select_own" on public.usage_quotas
  for select using (auth.uid() = user_id);
create policy "quotas_admin_select" on public.usage_quotas
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
```

#### `audit_log` — admin actions

```sql
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,                             -- 'user_role_changed', 'subscription_overridden', 'project_force_delete'
  target_type text,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index idx_audit_action on public.audit_log(action, created_at desc);

alter table public.audit_log enable row level security;
create policy "audit_admin_only" on public.audit_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

#### `feature_flags`

```sql
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout_percentage integer not null default 0 check (rollout_percentage between 0 and 100),
  allowed_user_ids uuid[],
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
create policy "flags_read_all" on public.feature_flags for select using (true);
create policy "flags_admin_write" on public.feature_flags
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

### 5.4 Materialized views for admin KPIs

These power the admin dashboard cheaply. Refresh every 5 minutes via a Supabase scheduled function.

```sql
-- MRR snapshot
create materialized view public.mv_mrr_snapshot as
select
  date_trunc('day', now()) as snapshot_date,
  sum(case when interval = 'month' then amount_cents
           when interval = 'year' then amount_cents / 12
           else 0 end) as mrr_cents,
  count(*) filter (where status = 'active') as active_subs,
  count(*) filter (where status = 'trialing') as trialing_subs,
  count(distinct user_id) as paying_customers
from public.subscriptions
where status in ('active','trialing');

-- Funnel by day (last 90 days)
create materialized view public.mv_activation_funnel as
select
  date_trunc('day', created_at) as day,
  count(*) filter (where event = 'signup') as signups,
  count(*) filter (where event = 'discovery_started') as discovery_started,
  count(*) filter (where event = 'discovery_completed') as discovery_completed,
  count(*) filter (where event = 'artifacts_generated') as artifacts_generated,
  count(*) filter (where event = 'exported') as exported,
  count(*) filter (where event = 'paid') as paid
from public.product_events
where created_at >= now() - interval '90 days'
group by 1;

-- Cohort retention (signup month → activity in subsequent months)
create materialized view public.mv_cohort_retention as
with cohorts as (
  select
    id as user_id,
    date_trunc('month', created_at) as cohort_month
  from public.profiles
)
select
  c.cohort_month,
  count(distinct c.user_id) as cohort_size,
  date_trunc('month', e.created_at) as activity_month,
  count(distinct e.user_id) as active_users
from cohorts c
left join public.ai_events e on e.user_id = c.user_id
group by 1, 3
order by 1, 3;

-- Cost vs revenue per user
create materialized view public.mv_unit_economics as
select
  p.id as user_id,
  p.email,
  s.plan_tier,
  s.amount_cents as mrr_cents,
  coalesce(sum(ai.cost_cents), 0) as ai_cost_cents_30d
from public.profiles p
left join public.subscriptions s on s.user_id = p.id and s.status in ('active','trialing')
left join public.ai_events ai on ai.user_id = p.id and ai.created_at > now() - interval '30 days'
group by 1, 2, 3, 4;

-- Refresh schedule
create or replace function refresh_admin_mvs() returns void language sql as $$
  refresh materialized view concurrently public.mv_mrr_snapshot;
  refresh materialized view concurrently public.mv_activation_funnel;
  refresh materialized view concurrently public.mv_cohort_retention;
  refresh materialized view concurrently public.mv_unit_economics;
$$;
```

### 5.5 `product_events` — clickstream

```sql
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  event text not null,
  properties jsonb default '{}',
  platform text,                                    -- 'ios' | 'android' | 'web'
  app_version text,
  created_at timestamptz not null default now()
);

create index idx_events_user on public.product_events(user_id, created_at desc);
create index idx_events_event on public.product_events(event, created_at desc);
create index idx_events_created on public.product_events(created_at desc);

alter table public.product_events enable row level security;
create policy "events_insert_own" on public.product_events
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "events_select_admin" on public.product_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'investor_readonly'))
  );
```

### 5.6 Standard event names

Build this as a typed enum in `packages/shared/src/events.ts`. Only emit events from this list:

```
signup, signin, signout,
onboarding_started, onboarding_completed,
project_created, project_renamed, project_archived, project_deleted,
discovery_started, discovery_question_answered, discovery_completed, discovery_abandoned,
voice_recording_started, voice_recording_completed,
reality_check_run, reality_check_accepted, reality_check_rejected,
artifact_generation_started, artifact_generation_completed, artifact_generation_failed,
artifact_edited, artifact_regenerated,
chat_message_sent,
export_initiated, export_completed, export_downloaded,
paywall_viewed, plan_selected, checkout_started, checkout_completed,
subscription_created, subscription_upgraded, subscription_downgraded, subscription_canceled,
app_opened, app_backgrounded, push_token_registered
```

---

## 6. Authentication

### 6.1 Mobile (Expo)

Use `@supabase/supabase-js` with `expo-sqlite/localStorage/install` for session persistence. Wrap encrypted-at-rest token in `expo-secure-store`.

```ts
// src/lib/supabase.ts
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

export const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

**Auth flows to build (mobile):**
1. **Email + password** — primary
2. **Sign in with Apple** — REQUIRED on iOS if any other social login is offered (App Store policy)
3. **Sign in with Google** — use `expo-auth-session` for web flow OR `@react-native-google-signin/google-signin` for native (requires custom dev client)
4. **Magic link / OTP** — email-based one-time code
5. **Forgot password** — email reset link with deep-link handling

**Deep linking config (`app.json`):**
```json
{
  "expo": {
    "scheme": "jetdale",
    "ios": {
      "bundleIdentifier": "com.jetdale.app",
      "associatedDomains": ["applinks:jetdale.com"]
    },
    "android": {
      "package": "com.jetdale.app",
      "intentFilters": [{
        "action": "VIEW",
        "data": [{ "scheme": "https", "host": "jetdale.com" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

### 6.2 Auth provider pattern

```ts
// src/lib/auth/AuthProvider.tsx
// - Wraps the entire app
// - Listens to onAuthStateChange
// - Exposes useAuth() hook with { user, session, loading, signIn, signUp, signOut }
// - Persists last route on unauthenticated redirect
// - Triggers analytics events (signin, signout)
```

### 6.3 Admin/web auth

The admin panel runs at `admin.jetdale.com` (or `/admin` subroute) on Vercel. Same Supabase project. Server-side check on every admin route: `profile.role IN ('admin','support','investor_readonly')`. Investor role gets read-only access — all mutation endpoints check `role = 'admin'`.

### 6.4 Session security

- JWT lifetime: 1 hour (Supabase default)
- Refresh token lifetime: 30 days
- Force re-auth for: payment changes, account deletion, role changes
- 2FA: required for admin accounts (TOTP via `supabase.auth.mfa`)

---

## 7. DeepSeek integration

### 7.1 Rules

1. **Server-side only.** Mobile/web clients call your Edge Functions; Edge Functions call DeepSeek.
2. **Model selection:**
   - `deepseek-v4-flash` for: discovery Q&A, workspace chat, simple artifact generation. Default model. ~$0.14/$0.28 per 1M tokens.
   - `deepseek-v4-pro` for: reality-check pass, complex artifact generation (roadmaps, risk registers, pitch decks). Currently 75% off until May 31, 2026 (~$0.435/$0.87 per 1M tokens, normal rate ~$1.74/$3.48).
3. **OpenAI-compatible API.** Use the `openai` SDK pointed at `https://api.deepseek.com`. Do NOT use the legacy `deepseek-chat` / `deepseek-reasoner` aliases — they deprecate July 24, 2026.
4. **Stream wherever the user is watching.** Discovery, chat, artifact gen → stream tokens. Reality check and export prep → buffered.
5. **Log every call** to `ai_events` table with token counts and cost.
6. **Rate-limit per user.** See Section 12.
7. **Set max_tokens conservatively.** 1M context is available but expensive; use 32K-128K for most calls.

### 7.2 Shared DeepSeek client (Edge Function)

```ts
// supabase/functions/_shared/deepseek.ts
import OpenAI from "npm:openai@^4.0.0";

const client = new OpenAI({
  apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
  baseURL: Deno.env.get("DEEPSEEK_BASE_URL"),
});

export async function callDeepSeek(opts: {
  model: 'deepseek-v4-flash' | 'deepseek-v4-pro';
  messages: Array<{role: string, content: string}>;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  user_id?: string;
  project_id?: string;
  event_type: string;
}) {
  const start = Date.now();
  try {
    const response = await client.chat.completions.create({
      model: opts.model,
      messages: opts.messages,
      stream: opts.stream ?? false,
      max_tokens: opts.max_tokens ?? 32000,
      temperature: opts.temperature ?? 0.4,
    });
    // Log to ai_events table (token counts, cost)
    // Cost calc: see pricing table in Section 1
    return response;
  } catch (err) {
    // Log failure to ai_events with error_message
    throw err;
  }
}
```

### 7.3 Cost calculation

Build `costPerCall()` helper in `_shared/cost.ts`:

```
costCents(model, promptTokens, completionTokens):
  if model = 'deepseek-v4-flash':
    return ceil((promptTokens / 1_000_000) * 14 + (completionTokens / 1_000_000) * 28)
  if model = 'deepseek-v4-pro':
    // Promo price until May 31, 2026; switch to regular price after
    promoActive = now < 2026-06-01T00:00:00Z
    inputRate = promoActive ? 43.5 : 174  // cents per 1M tokens × 100
    outputRate = promoActive ? 87 : 348
    return ceil((promptTokens / 1_000_000) * inputRate + (completionTokens / 1_000_000) * outputRate)
```

Store as integer cents in `ai_events.cost_cents`.

### 7.4 Prompt structure

Every system prompt lives in `packages/shared/src/prompts/`. Build these:

- `discovery-spine.ts` — universal interview backbone
- `discovery/{archetype-slug}.ts` — archetype-specific overlay
- `reality-check.ts` — challenger prompt
- `artifact/{type}.ts` — one per artifact type
- `chat-workspace.ts` — refinement chat

Prompts must:
- Open with the AI's persona ("You are a senior product lead with 12 years of experience shipping consumer marketplaces. You speak directly, push back when needed, and never use corporate jargon.")
- Include the user's current discovery transcript and current artifact state
- Define the exact output format (JSON schema for structured outputs; markdown for human-readable)
- End with a "what NOT to do" section that lists banned phrases and antipatterns

---

## 8. Archetypes

### 8.1 Launch archetypes (Phase 1 — first 60 days)

Build these five. Build them deep before adding more.

| Slug | Name | Category | Target users |
|---|---|---|---|
| `indie_software` | Indie software / SaaS | software | Solo founders, indie hackers |
| `ai_built_app` | App built with AI builders | software | Non-technical "vibe coders" using Lovable, Cursor, Claude Code |
| `mobile_game` | Indie game | software | Game devs (Unity, Unreal, Godot, GameMaker) |
| `wedding_event` | Wedding or event | event | Couples, planners |
| `home_renovation` | Home renovation project | physical | Homeowners |

### 8.2 Archetype definition file format

Each archetype is a TypeScript module in `packages/shared/src/archetypes/{slug}.ts`:

```ts
import { ArchetypeDefinition } from '../types';

export const indieSaaS: ArchetypeDefinition = {
  slug: 'indie_software',
  name: 'Indie software / SaaS',
  category: 'software',
  scriptVersion: 1,
  expertPersona: 'You are a former indie hacker who has shipped 4 SaaS products...',
  estimatedMinutes: 22,
  questions: [
    {
      key: 'spark',
      type: 'open_text',
      question: 'In one sentence, what are you building?',
      helper: 'Don\'t overthink it. Describe the thing.',
      voiceEnabled: true,
      followUpPrompt: '...prompt for AI to acknowledge and confirm archetype...',
    },
    {
      key: 'audience',
      type: 'open_text',
      question: 'Who is this for, and how do they live without it today?',
      helper: 'Be specific. A person, not a market.',
      // ...
    },
    // ...30-50 questions per archetype
  ],
  artifactTypes: [
    'vision', 'scope', 'personas', 'roadmap',
    'tech_stack', 'risk_register', 'success_metrics', 'budget',
  ],
  artifactGenerationOrder: [
    'vision', 'personas', 'scope', 'success_metrics',
    'roadmap', 'tech_stack', 'risk_register', 'budget',
  ],
};
```

### 8.3 Question types

```ts
type QuestionType =
  | 'open_text'        // textarea, voice-enabled
  | 'single_select'    // tappable options, one answer
  | 'multi_select'     // tappable options, multi answer
  | 'numeric'          // number input (budget, timeline)
  | 'range'            // slider (e.g. 1-10 confidence)
  | 'archetype_confirm' // special: confirms or changes the archetype
  | 'reality_check_response'; // accept/reject AI pushback
```

### 8.4 Branching logic

Each question can have a `branchOn` function: `(allAnswers) => nextQuestionKey | 'end'`. Most paths are linear, but specific signals trigger branches:

- "I have $0 budget" → branch into bootstrap path (skip "agency hire" questions)
- "I've never built anything" → branch into teach-as-you-go (more hand-holding, simpler vocabulary)
- Game dev "premium" → skip live-ops questions; "F2P" → deep dive on monetization

### 8.5 Detailed scripts

> **NOTE:** The full discovery scripts for each archetype (30-50 questions each, with branching rules, expert persona prompts, and example AI follow-ups) are a separate deliverable to be produced *after* this spec, in `packages/shared/src/archetypes/`. Each script is ~800-1500 lines of prompt engineering. Do not generate generic placeholders — wait for the proper script content.

---

## 9. Edge Functions (the AI brain)

All AI orchestration lives in `supabase/functions/`. Each function is a self-contained Deno script.

### 9.1 `ai-discovery`

Handles a single turn of the discovery interview.

**Request:**
```ts
POST /functions/v1/ai-discovery
Authorization: Bearer <user_jwt>
{
  sessionId: string,
  questionIndex: number,
  answer: { type: string, value: any, text?: string }
}
```

**Behavior:**
1. Verify user owns `sessionId` (RLS does this, but double-check)
2. Insert answer into `discovery_answers`
3. Load the archetype script and all prior answers
4. Determine next question (with branching logic)
5. Build a streaming prompt to DeepSeek for the AI's contextual response/transition
6. Stream tokens back via Server-Sent Events
7. Log to `ai_events`
8. On `questionIndex == total - 1`, mark session `completed` and trigger artifact generation

### 9.2 `ai-artifact-gen`

Generates one or all artifacts for a project.

**Request:**
```ts
POST /functions/v1/ai-artifact-gen
{
  projectId: string,
  artifactType?: artifact_type,  // if omitted, generates all
  forceRegenerate?: boolean
}
```

**Behavior:**
1. Load discovery summary + all prior answers
2. Load any existing artifacts (for cross-referencing)
3. For each artifact type to generate:
   - Mark prior version `is_current = false`
   - Insert new row with `status = 'generating'`
   - Build system prompt (archetype expert + artifact template)
   - Call DeepSeek (Pro for complex; Flash for simple)
   - Parse output (JSON for structured artifacts; MD for prose)
   - Validate with Zod schema from `packages/shared/src/artifact-schemas/`
   - Update row with content and `status = 'ready'`
4. Update `projects.progress_pct` and `last_activity_at`
5. Emit `artifact_generation_completed` product event

### 9.3 `ai-reality-check`

Runs the challenger pass.

**Behavior:**
1. Load all current artifacts + discovery answers
2. Use `deepseek-v4-pro` (this is the highest-leverage AI call in the product — do not cheap out)
3. Prompt asks: "What's unrealistic? What's missing? What will kill this project? Where are the contradictions?"
4. Output: structured JSON with `concerns[]` and `proposed_changes[]`
5. Insert into `reality_checks` table
6. User reviews and accepts/rejects each proposed change

### 9.4 `ai-chat`

Workspace chat (the right panel in the project workspace).

**Behavior:**
1. Load last 20 messages from `chat_messages` for context
2. Load currently-active artifact (the one user is viewing)
3. Stream response with citations to artifact sections
4. If user requests change ("update the roadmap to add phase 4"), trigger `ai-artifact-gen` for that artifact

### 9.5 `voice-transcribe`

Server-side proxy for Groq Whisper.

**Request:** multipart form with audio file (m4a, mp3, wav, up to 25MB)

**Behavior:**
1. Verify user has voice quota remaining
2. Send to Groq's `whisper-large-v3-turbo` endpoint
3. Return transcript + speaker confidence
4. Log usage in `discovery_sessions.voice_minutes_used`

### 9.6 `export-bundle`

Generates the export package.

**Request:**
```ts
POST /functions/v1/export-bundle
{ projectId, target: export_target }
```

**Behavior per target:**
- `claude_code` — generates a zip with:
  - `CLAUDE.md` (master context file)
  - `PROJECT_SCOPE.md`
  - `ROADMAP.md`
  - `PERSONAS.md`
  - `TECH_STACK.md`
  - `RISKS.md`
  - `BUDGET.md`
  - `prompts/initial-prompts.md` (first prompts to give Claude Code)
  - `.cursorrules` (if applicable)
- `cursor` — similar to above with `.cursorrules` emphasized
- `lovable` — markdown optimized for Lovable's prompt format (one mega-prompt)
- `zip_markdown` — plain MD files, no AI-specific extras
- `pdf` — uses Puppeteer to render the artifacts as a polished PDF
- `pitch_deck` — generates a 10-slide deck (Reveal.js HTML or PDF)
- `rfp` — formal RFP doc for human dev shops

Store result in Supabase Storage at `exports/{user_id}/{project_id}/{export_id}.zip`. Set 7-day signed URL expiry. Increment `exports.download_count` on each download.

### 9.7 `revenuecat-webhook`

Handles RevenueCat events. RevenueCat sends webhooks for: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, etc.

**Behavior:**
1. Verify signature using `REVENUECAT_WEBHOOK_SECRET`
2. Look up user by `app_user_id` (which we set = Supabase user.id)
3. Upsert into `subscriptions` table
4. Emit relevant product event
5. Send email if needed (e.g. payment failed)

### 9.8 `stripe-webhook`

Handles Stripe events for web purchases: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

### 9.9 Scheduled functions

Use Supabase `cron`:

- Every 5 min: `refresh_admin_mvs()`
- Every hour: cleanup expired exports (`exports.expires_at < now()`)
- Daily 00:00 UTC: reset monthly usage quotas (for users whose `period_start` is past)
- Daily 00:15 UTC: send "discovery abandoned" recovery emails (24h after abandon)
- Weekly Monday 09:00 UTC: send "weekly check-in" emails for active projects

---

## 10. Mobile app — full screen inventory

Every screen, every button, every action. Build them in the order in Section 14.

### 10.1 Public / unauthenticated

#### `/(auth)/welcome.tsx` — splash/welcome
- Logo + tagline "Plan before you build."
- "Get started" button → `/signup`
- "I already have an account" → `/signin`

#### `/(auth)/signup.tsx`
- Email + password fields
- "Continue with Apple" (iOS only, required)
- "Continue with Google"
- "Continue with email" → magic link variant
- Marketing opt-in checkbox (unchecked by default)
- Privacy + Terms links
- On submit: call `supabase.auth.signUp()`, then route to `/(onboarding)/welcome`
- Validation: email format, password 8+ chars, no spaces only

#### `/(auth)/signin.tsx`
- Email + password OR magic link toggle
- "Forgot password?" link → `/forgot-password`
- Social logins same as signup
- On success: route to `/(tabs)/` (the dashboard)

#### `/(auth)/forgot-password.tsx`
- Email field
- "Send reset link" → `supabase.auth.resetPasswordForEmail()`
- Confirmation message

### 10.2 Onboarding

#### `/(onboarding)/welcome.tsx`
- "Welcome to Jetdale, {name}."
- 3-slide horizontal pager:
  1. "Tell us your idea" (illustration: spark)
  2. "We'll ask the right questions" (illustration: chat bubbles)
  3. "Walk away with a plan world-class teams would charge $20K for" (illustration: documents)
- Last slide CTA: "Start your first project" → `/discovery/start`
- "Skip" link top-right → `/(tabs)/`

### 10.3 Tabs (Native Tabs API)

Bottom tab bar with 4 tabs:

1. **Home** (`/(tabs)/index.tsx`)
2. **Projects** (`/(tabs)/projects.tsx`)
3. **Learn** (`/(tabs)/learn.tsx`)
4. **Settings** (`/(tabs)/settings.tsx`)

#### `/(tabs)/index.tsx` — Home / dashboard
- Header: "Good {morning/afternoon/evening}, {first_name}."
- Sub: "{count} active project(s) · {count} need your attention"
- "+ New project" button (top-right)
- **Insights row:**
  - Reality Check card (if any pending) — "PawPair's timeline is at risk. Review trade-offs →"
  - Quick actions card — "This week:" list with 4 next-action items
- **Stats row** (compact KPI tiles):
  - Active Projects
  - Avg. Completion %
  - Risks Flagged
  - Artifacts Generated
- **Your projects** section:
  - Each project: name, industry/archetype, phase, progress bar, next step
  - Tap → `/project/[id]`
  - Long-press → quick actions sheet (archive, share, rename, delete)
- Pull-to-refresh

**Empty state:** if zero projects, show big "Start your first project" CTA with the same 3-slide onboarding cards.

#### `/(tabs)/projects.tsx` — Projects list
- Search bar (top)
- Filter pills: All / Active / Archived / By archetype
- Sortable: Recent / Name / Phase / Progress
- List of all projects (paginated, 20 per page)
- "+ New project" floating action button

#### `/(tabs)/learn.tsx` — Templates / examples
- Browseable gallery of completed example projects (curated by you)
- Each card: project name, archetype, "View blueprint" → opens read-only workspace view
- Filter by category
- Bottom: "What if I have a different kind of project?" → contact / suggest archetype

#### `/(tabs)/settings.tsx`
- Profile section
  - Avatar (tap to change → image picker)
  - Name, email
  - "Manage account" → `/settings/account`
- Subscription
  - Current plan
  - "Manage subscription" → opens RevenueCat customer portal (mobile) or Stripe portal (web)
  - "Upgrade" button if free
- Preferences
  - Theme (system / light / dark)
  - Voice preference (auto / web speech only / always Whisper)
  - Email notifications toggle
  - Push notifications toggle
- Data
  - "Export all my data" → email dump
  - "Delete account" → 2-step destructive flow
- About
  - Version, build number
  - Terms, Privacy, Open source licenses
  - "Contact support" → opens email composer

### 10.4 Discovery flow

#### `/discovery/start.tsx`
- Big input field: "In one sentence, what are you building?"
- Voice mic button (large, prominent)
- Below: "Or pick a template" → expandable section with all 5 archetypes as cards
- Continue button → AI detects archetype → routes to `/discovery/[sessionId]/q/2`

#### `/discovery/[sessionId]/q/[step].tsx`
- Top: progress bar (e.g. "Question 3 of 28")
- Stage label ("Stage 02 / The Problem")
- Question (display-md type)
- Helper text (body-md, muted)
- AI hint card (optional, contextual)
- Input area (varies by question type):
  - **open_text**: textarea + mic button. Auto-saves draft every 5s. Voice button toggles recording with live transcript.
  - **single_select**: grid of 2-column option cards. Tap to select. One at a time.
  - **multi_select**: same but multi-select with check indicators.
  - **numeric**: number pad / slider.
  - **range**: slider with labels.
- Footer:
  - "← Back" (disabled on step 1)
  - "Continue →" (disabled until valid answer)
- Keyboard shortcut: Enter to continue, Shift+Enter for newline (web)

#### `/discovery/complete/[sessionId].tsx`
- Loading screen with progress
- Steps shown:
  1. "Analyzing your answers..."
  2. "Generating vision..."
  3. "Mapping personas..."
  4. "Building roadmap..."
  5. "Stress-testing the plan..."
- On completion → auto-route to `/project/[projectId]` workspace

### 10.5 Project workspace

#### `/project/[id]/index.tsx`
- Header: project name, breadcrumb, action buttons (Share, Reality Check, Export)
- Three-panel layout (or stacked on mobile):
  - **Left**: Artifact list (Vision, Scope, Personas, etc. + Tools section)
  - **Middle**: Current artifact view (rendered markdown with editing affordances)
  - **Right**: AI chat
- Mobile: bottom sheet for chat, swipeable sidebar for artifacts

#### `/project/[id]/artifact/[slug].tsx`
- Renders one artifact in detail
- Edit mode: tap any section to edit inline
- "Regenerate this section" button per heading
- Version history dropdown (shows prior versions, can restore)

#### `/project/[id]/export.tsx`
- Cards for each export target:
  - Claude Code
  - Cursor
  - Lovable
  - Bolt
  - Replit
  - Zip (markdown)
  - PDF document
  - Pitch deck
  - RFP for human devs
- Selecting one → preview of what's in the package → "Generate export" button → loading → download/share sheet

### 10.6 Paywall

#### `/paywall.tsx`
- Shown when user hits a free-tier limit
- Hero: "You've made 3 plans this month. Want unlimited?"
- 3 plan cards (Pro monthly, Pro annual, Team)
- "Maybe later" link at bottom
- On select → RevenueCat purchase sheet → on success, dismiss

---

## 11. Plan limits and gating

```ts
// src/config/limits.ts
export const PLAN_LIMITS = {
  free: {
    projects_per_month: 1,
    artifacts_per_project: 5,        // Vision, Scope, Personas, Roadmap, Risks
    reality_checks_per_month: 1,
    exports_per_month: 1,
    export_targets: ['zip_markdown'] as const,
    voice_minutes_per_month: 10,
    workspace_chat_messages_per_day: 10,
    archetype_access: ['indie_software', 'ai_built_app', 'wedding_event'] as const,
  },
  pro: {
    projects_per_month: 10,
    artifacts_per_project: 'unlimited',
    reality_checks_per_month: 'unlimited',
    exports_per_month: 'unlimited',
    export_targets: 'all',
    voice_minutes_per_month: 240,
    workspace_chat_messages_per_day: 200,
    archetype_access: 'all',
  },
  team: {
    // Pro + team seats, shared projects, audit log
    projects_per_month: 'unlimited',
    voice_minutes_per_month: 600,
    seats_included: 3,
    seats_max: 25,
  },
  enterprise: {
    // Custom; provisioned manually
  },
} as const;

export const PRICING_CENTS = {
  pro_monthly: 4900,    // $49/mo
  pro_annual: 39000,    // $390/yr ($32.50/mo, save 33%)
  team_monthly_per_seat: 4900,
  team_annual_per_seat: 39000,
};
```

**Enforcement:**
- Every action that costs resources checks limits BEFORE running, not after
- Backend (Edge Function) is the source of truth — never trust the client
- When limit hit: return `429` with `{ reason: 'limit_exceeded', limit: 'projects_per_month', current: 1, max: 1 }`
- Client shows paywall

---

## 12. Rate limiting

Per-user limits enforced in Edge Functions (use Supabase's built-in `rate_limit` or implement with Postgres):

| Action | Free | Pro | Team |
|---|---|---|---|
| AI calls / minute | 5 | 30 | 60 |
| AI calls / day | 50 | 1000 | unlimited |
| Voice transcribe / minute | 1 | 5 | 10 |
| Export generation / hour | 1 | 10 | unlimited |

**On limit hit:** return 429 with `Retry-After` header. Mobile shows a non-blocking toast.

**Global circuit breaker:** if DeepSeek API errors > 20% in a 5-minute window, fail-fast all AI calls with a "We're having trouble — try in a minute" message. Track in Sentry.

---

## 13. Admin dashboard (web, Next.js)

Lives at `/admin/*` on Vercel. Gated by role check. Server components only for data fetching; client components for interactivity.

### 13.1 Routes

- `/admin` — main KPI dashboard (matches the mockup)
- `/admin/users` — full user table, search, filters, drill-down
- `/admin/users/[id]` — single user detail (subscription, projects, AI costs, support history)
- `/admin/projects` — all projects across users (admin can read-only inspect any project)
- `/admin/archetypes` — manage archetypes (toggle, edit scripts)
- `/admin/ai-logs` — full `ai_events` log, filterable
- `/admin/subscriptions` — revenue table
- `/admin/cohorts` — full cohort analysis
- `/admin/funnel` — drill into each funnel step
- `/admin/exports` — recent exports
- `/admin/feature-flags` — toggle flags
- `/admin/audit` — admin action audit log
- `/admin/system` — health page, infrastructure metrics

### 13.2 Investor mode

`investor_readonly` role: same UI, all mutations disabled, "Demo data" watermark optional. Use this for fundraising demos so you can give investors limited access without risk.

### 13.3 KPIs (the cards at the top)

Each card pulls from `mv_*` materialized views. Define them precisely so they're calculated the same way every time:

- **MRR**: sum of (monthly subs amount + annual subs amount/12) where status in ('active','trialing'). Convert cents → dollars on display.
- **ARR**: MRR × 12
- **Paid customers**: distinct user_id with subscription.status in ('active','trialing') and plan_tier != 'free'
- **Net Revenue Retention (NRR)**: ((MRR end of period from cohort) / (MRR start of period from same cohort)) × 100. Cohort = customers active at period start.
- **Gross Revenue Retention (GRR)**: same as NRR but excludes upgrades. Indicates churn rate inverse.
- **Active projects**: count(projects where status = 'active' and last_activity_at > now() - 30 days)
- **Discovery completion**: (count completed) / (count started). Last 30 days.
- **ARPU**: total MRR / paid customers
- **Churn rate (monthly)**: subs canceled in last 30 days / subs at start of period
- **CAC**: (total marketing spend in period) / new paid customers. Manual entry of spend.
- **LTV**: ARPU × (1 / churn_rate_monthly)
- **LTV:CAC**: LTV / CAC
- **AI cost ratio**: total AI cost cents / total revenue cents. Should be < 25%.

### 13.4 Charts

- **Revenue + new customers (combo)**: Line for MRR overlaid on bar chart of new paid signups, last 12 months
- **Activation funnel**: 6-step funnel (Signup → Discovery → Artifacts → Export → Paid). Click step to drill in.
- **Cohort retention heatmap**: 12 rows × 12 cols, color intensity = retention %
- **Archetype distribution**: horizontal bars sorted by project count
- **Daily active users (DAU/WAU/MAU)**: line chart, last 90 days

### 13.5 User table

Columns: avatar+name+email, plan, status, projects, MRR, activity score (last-30-day events), last seen, joined

Filters:
- Plan tier
- Status (active / trialing / churn risk / canceled)
- Cohort month
- Has voice usage / Has exports / Has reality check
- Free-text search across name, email, project names

Actions per user (admin only):
- View details
- Impersonate (creates a 1-hour admin-flagged session as that user — audit logged)
- Send email
- Adjust plan (manual override, audit logged)
- Refund last payment
- Suspend account
- Delete account (2-step confirm)

### 13.6 Real-time activity feed

Subscribe to `product_events` table via Supabase Realtime. Show most recent 50 events, scrolling. Filter by event type.

### 13.7 System health page

- DeepSeek API: success rate, P50/P95/P99 latency last hour
- Supabase DB: connection count, query latency
- Storage: bucket sizes, recent uploads
- Edge Functions: invocations, errors, P95 duration
- Vercel: deployment status
- Stripe/RevenueCat: webhook success rates

---

## 14. Build order (the only correct order)

Do not skip ahead. Each phase produces a shippable milestone.

### Phase 0: Foundation (Week 1)
1. Initialize monorepo (pnpm workspaces, turbo)
2. Set up Supabase project, run migrations 001-010 (all tables)
3. Set up Expo SDK 55 app with `/src/app` structure
4. Set up Next.js 15 admin app
5. Configure Sentry, PostHog, environment variables
6. Implement Supabase auth (email + password)
7. Build auth screens, AuthProvider, protected routes
8. Implement RLS policies and test with multiple users

**Deliverable:** A user can sign up, sign in, see an empty dashboard, sign out.

### Phase 1: Core discovery flow (Weeks 2-3)
1. Build archetype manifest for `indie_software` only (start with one)
2. Build `/discovery/start` and `/discovery/[sessionId]/q/[step]` screens
3. Implement `ai-discovery` Edge Function (Flash model, streaming)
4. Build the AI chat UI with streaming token rendering
5. Build voice input (Web Speech API on web, expo-speech-recognition on mobile)
6. Implement discovery completion → project creation
7. Add second archetype: `ai_built_app`

**Deliverable:** A user can start a project, walk through 30 discovery questions for two archetypes, with voice. Their answers are saved.

### Phase 2: Artifact generation (Week 4)
1. Build artifact schemas (Zod) for all 5 core types
2. Build prompts for each artifact type (Vision, Scope, Personas, Roadmap, Risks)
3. Implement `ai-artifact-gen` Edge Function
4. Build workspace screen with three-panel layout
5. Build artifact rendering (markdown view + JSON-structured edit mode)
6. Implement artifact regeneration per section

**Deliverable:** Completing discovery generates 5 artifacts. User can view and edit them.

### Phase 3: Reality check + chat (Week 5)
1. Build `ai-reality-check` Edge Function (Pro model)
2. Build reality check UI (modal with accept/reject per concern)
3. Build `ai-chat` Edge Function
4. Build workspace chat UI with streaming

**Deliverable:** User can run a reality check, accept/reject changes, chat with the AI about their plan.

### Phase 4: Export (Week 6)
1. Build `export-bundle` Edge Function with Claude Code target first
2. Implement zip generation in Deno
3. Upload to Supabase Storage, return signed URL
4. Build export UI
5. Add Cursor, Lovable, plain zip targets
6. Add PDF target using server-side rendering

**Deliverable:** User can export their project as a Claude Code-ready zip and start building.

### Phase 5: Monetization (Week 7)
1. Set up RevenueCat account, configure products
2. Set up Stripe products for web
3. Implement RevenueCat SDK in mobile app
4. Build paywall screen
5. Implement webhooks (RevenueCat + Stripe)
6. Implement plan limit enforcement in all Edge Functions
7. Build subscription management UI

**Deliverable:** Free users hit limits → paywall → can purchase → become Pro.

### Phase 6: Polish + remaining archetypes (Week 8)
1. Add archetypes: `mobile_game`, `wedding_event`, `home_renovation`
2. Implement archetype-specific question scripts
3. Polish: empty states, loading states, error states, animations
4. Implement email notifications (Resend)
5. Implement push notifications
6. Performance pass (image optimization, code splitting, lazy loading)

**Deliverable:** All 5 launch archetypes working end-to-end. Production-quality polish.

### Phase 7: Admin dashboard (Week 9)
1. Build Next.js admin app with role-gated routes
2. Build KPI cards from materialized views
3. Build user management table
4. Build cohort and funnel charts
5. Build ai-logs and audit views
6. Build investor read-only mode

**Deliverable:** You can run an investor demo from the admin dashboard.

### Phase 8: Beta + launch (Week 10+)
1. Recruit 30 beta users across all 5 archetypes
2. Run weekly iteration cycles on script quality
3. Build referral system
4. App Store + Play Store submission
5. Marketing site polish on `jetdale.com`
6. Public launch (Product Hunt, indie hacker communities)

---

## 15. Quality bars (the "1000% accurate" requirements)

### 15.1 No AI tells

Every piece of generated copy in artifacts is auto-scanned for banned phrases. If detected, regenerate with the phrase added to the "do not use" list in the prompt. Banned word list lives in `packages/shared/src/quality/banned-phrases.ts`:

```
delve, leverage, robust, cutting-edge, seamless, navigate (as verb for non-physical things),
in today's fast-paced world, harness the power, unlock the potential,
furthermore, moreover, additionally (sentence starters), it's important to note that,
let me know if, I hope this helps, feel free to, please don't hesitate
```

### 15.2 Performance

- Mobile app cold start < 2s
- Time-to-first-token from AI < 800ms (discovery), < 1.5s (artifact)
- Artifact generation total < 30s (Flash), < 90s (Pro)
- Admin page first contentful paint < 1.5s
- 60fps on all animations (use `react-native-reanimated` for anything custom)

### 15.3 Accessibility

- All interactive elements have `accessibilityLabel`
- Color contrast meets WCAG AA (4.5:1 for body, 3:1 for large text)
- Support dynamic type (iOS) and font scaling (Android)
- Screen reader tested with VoiceOver and TalkBack
- All flows keyboard-navigable on web

### 15.4 Error handling

- Every Edge Function wrapped in try/catch with structured error response
- Every async UI operation has loading + error states
- Network errors trigger retry with exponential backoff (max 3 attempts)
- Sentry captures all errors with user context (id, plan_tier, action)
- User-facing error messages: human, never expose stack traces or technical jargon

### 15.5 Testing

- Unit tests: Vitest for utils, hooks, prompt builders
- Integration: Supabase test instance for DB + RLS verification
- E2E mobile: Maestro flows for: signup, discovery, artifact gen, export, paywall
- E2E web: Playwright for admin dashboard
- Manual QA checklist before each release (see `docs/qa-checklist.md`)

### 15.6 Security

- All Edge Functions verify JWT via `supabase.auth.getUser()`
- Never trust `user_id` from request body — always use the authenticated user's id
- Webhook secrets validated on every webhook
- No PII in client-side logs
- No API keys ever in mobile bundle
- Rate limiting on all endpoints (Section 12)
- SQL injection: only use parameterized queries via supabase-js or Edge Function args. No string concatenation in SQL.
- Storage signed URLs expire in 7 days max

### 15.7 Privacy

- "Delete my account" actually deletes (cascade through RLS)
- Data export available on request (full JSON dump)
- No third-party tracking before consent (in EU)
- Cookie banner on web for marketing site
- Privacy policy and ToS finalized before launch (use Termly or hire a lawyer)

---

## 16. Monitoring and ops

### 16.1 Logs to send to Axiom/Better Stack

- All Edge Function invocations (start, end, error, duration, user_id)
- All AI calls (model, tokens, cost, duration)
- All webhook receipts (provider, event_type, success)
- All admin mutations

### 16.2 Alerts

| Alert | Threshold | Channel |
|---|---|---|
| DeepSeek API error rate | > 5% over 5 min | Slack #ops |
| Edge Function P95 latency | > 10s sustained | Slack #ops |
| Failed payment webhook | any failure | Slack #ops + email |
| Daily AI spend | > $X (tune as you grow) | Email |
| New user signup | every signup (first 100 days) | Slack #signups |
| Churn (subscription canceled) | every cancel | Slack #revenue |
| Sentry new error | new error fingerprint | Slack #errors |

### 16.3 Runbooks (in `docs/runbooks/`)

Write these:
- `deepseek-down.md` — what to do if DeepSeek is unreachable
- `db-connection-exhausted.md`
- `revenuecat-webhook-failure.md`
- `bad-deploy-rollback.md`
- `incident-comms-template.md`

---

## 17. Open decisions (resolve before building)

These are decisions I (the founder) need to make. Claude Code should flag any I haven't answered yet:

- [ ] Final pricing: $49/mo confirmed, or test $29 / $39 / $49?
- [ ] Annual discount: 33% (above), or different?
- [ ] Free tier limits: 1 project/month — too tight? Too generous?
- [ ] iOS-only at launch, or iOS + Android + web together?
- [ ] Team plan minimum seats: 3 above, or 5?
- [ ] Should `mobile_game` archetype split into "indie premium" vs "F2P mobile" subtypes for v1?
- [ ] Voice on free tier: 10 min/month — appropriate?
- [ ] Reality check on free tier: 1/month — or unlimited?
- [ ] Marketing site: build with Next.js (same repo) or separate (Framer/Webflow)?

---

## 18. Files Claude Code should NOT modify without explicit approval

- Any file in `docs/adr/` (architecture decisions are permanent records)
- `supabase/migrations/*` after they've been applied to production (write new migrations to alter)
- `app.json` bundle identifier
- `packages/shared/src/archetypes/*` (prompt engineering changes need human review)
- `.env*` files (only `.env.example` is in git)

---

## 19. Definitions of "done"

A feature is done when:
1. Code is written, reviewed, and merged to `main`
2. Tests pass (unit + integration)
3. No new Sentry errors in staging for 24h
4. PostHog event(s) emitted correctly
5. Manual QA checklist signed off
6. Docs updated (README, runbook if applicable)
7. Feature flag set up (if gradual rollout)

---

## End of spec

If Claude Code reads this and any section is unclear or contradicts another, **stop and ask** before writing code. Do not guess.

— Marcus
