// ============================================================
// Jetdale — Admin Dashboard Shared Types
// TypeScript interfaces for all admin API responses.
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardKPIs {
  mrr_cents: number;
  arr_cents: number;
  active_subs: number;
  trialing_subs: number;
  paying_customers: number;
  total_users: number;
  active_projects: number;
  discovery_completion_pct: number;
  churn_rate: number;
  arpu_cents: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  plan_tier: string | null;
  subscription_status: string | null;
  mrr_cents: number;
  project_count: number;
  last_activity_at: string | null;
}

export interface AdminProjectRow {
  id: string;
  name: string;
  phase: string;
  status: string;
  progress_pct: number;
  created_at: string;
  last_activity_at: string | null;
  user_email: string;
  user_name: string | null;
  archetype_name: string | null;
  artifact_count: number;
}

export interface FunnelTotals {
  signups: number;
  discovery_started: number;
  discovery_completed: number;
  artifacts_generated: number;
  exported: number;
  paid: number;
}

export interface CohortRow {
  cohort_month: string;
  cohort_size: number;
  activity_month: string;
  active_users: number;
}

export interface AiLogRow {
  id: string;
  user_email: string | null;
  project_name: string | null;
  event_type: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_cents: number;
  latency_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  created_at: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface FeatureFlagRow {
  key: string;
  enabled: boolean;
  rollout_percentage: number;
  allowed_user_ids: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ExportStats {
  total: number;
  by_target: Record<string, number>;
  by_doc_type: Record<string, number>;
}

export interface ArchetypeRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  project_count: number;
  completion_rate: number | null;
  is_active: boolean;
}

export interface SystemHealth {
  ai: {
    avg_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    success_rate: number;
    error_rate: number;
    daily_cost_cents: number;
    daily_generations: number;
    avg_cost_per_doc: number;
  };
  platform: {
    total_users: number;
    active_projects: number;
    total_artifacts: number;
    total_exports: number;
    total_discoveries: number;
  };
  recent_errors: Array<{
    event_type: string;
    error_message: string | null;
    created_at: string;
  }>;
}

export interface RevenueData {
  mrr_cents: number;
  new_mrr_cents: number;
  churned_mrr_cents: number;
  by_plan: Array<{ plan: string; mrr_cents: number; count: number }>;
  history: Array<{ month: string; mrr_cents: number }>;
}

export interface ActivityItem {
  id: string;
  action: string;
  actor: string | null;
  target: string | null;
  created_at: string;
}

export interface SidebarCounts {
  mrr: string;
  users: string;
  projects: string;
  flags: number;
}

// ── New page types ────────────────────────────────────────────

export interface BlogPost {
  id: string;
  type: 'blog' | 'guide';
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  author_id: string | null;
  status: 'draft' | 'published';
  tags: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram';
  content: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_for: string | null;
  published_at: string | null;
  engagement: Record<string, number>;
  error_message: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'transactional' | 'lifecycle' | 'auth';
  subject: string;
  html_body: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteContentRow {
  id: string;
  page: string;
  section: string;
  content: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface ApiConfig {
  id: string;
  provider: string;
  display_name: string;
  api_key_encrypted: string | null;
  base_url: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
  last_tested_at: string | null;
  test_status: 'success' | 'failed' | 'pending' | null;
  created_at: string;
  updated_at: string;
}

export interface AiAnalyticsData {
  kpis: { total_generations: number; success_rate: number; avg_latency_ms: number; total_cost_cents: number };
  daily: Array<{ day: string; count: number; cost_cents: number }>;
  by_type: Array<{ event_type: string; count: number; cost_cents: number }>;
  by_model: Array<{ model: string; count: number; cost_cents: number; avg_latency_ms: number; success_rate: number }>;
}

export interface AiIntelligenceData {
  kpis: { total_interactions: number; total_cost_30d: number; total_tokens_30d: number; avg_response_ms: number };
  by_feature: Array<{ feature: string; calls: number; tokens: number; cost_cents: number; avg_latency_ms: number; success_rate: number }>;
  by_provider: Array<{ provider: string; calls: number; cost_cents: number; avg_latency_ms: number; success_rate: number; total_tokens: number }>;
  cost_trend: Array<{ date: string; cost_cents: number; calls: number }>;
  recent: Array<AiLogRow>;
}

export interface PlatformAnalyticsData {
  kpis: {
    mrr_cents: number; arr_cents: number; arpu_cents: number; ltv_cents: number;
    total_customers: number; paid_customers: number; churn_rate: number; mom_growth: number;
  };
  monthly_revenue: Array<{ month: string; mrr_cents: number }>;
  monthly_signups: Array<{ month: string; count: number }>;
  plan_distribution: Array<{ plan: string; count: number }>;
  engagement: { projects: number; artifacts: number; exports: number; discoveries: number; ai_calls: number };
}

// ── Subscription / Pricing types ─────────────────────────────

export interface PlanLimits {
  projects_per_month: number | string;
  artifacts_per_project: number | string;
  export_formats: string;
  reality_checks: string;
  voice_minutes: number;
  chat_messages_per_day: number;
  ai_model: string;
}

export interface PlanConfig {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  annual_price_cents: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
  limits: PlanLimits;
  features: Array<{ feature: string; value: string }>;
  cta_text: string;
  cta_url: string;
  subscriber_count?: number;
  plan_mrr_cents?: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriberRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  plan_tier: string;
  status: string;
  amount_cents: number;
  interval: string | null;
  current_period_end: string | null;
  created_at: string;
}

export interface SubscriptionsPageData {
  kpis: {
    mrr_cents: number;
    arr_cents: number;
    active_subs: number;
    trialing_subs: number;
    churn_rate: number;
    arpu_cents: number;
  };
  plans: PlanConfig[];
  subscribers: SubscriberRow[];
  usage_stats: {
    avg_projects: number;
    avg_artifacts: number;
    avg_exports: number;
    avg_ai_cost_cents: number;
  };
}
