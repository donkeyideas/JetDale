import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, isErrorResponse } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const db = createSupabaseAdminClient();

  const [
    plansRes,
    snapshotRes,
    activeSubs,
    churnedRes,
    subscriberRes,
    quotasRes,
  ] = await Promise.all([
    db.from('plan_configs').select('*').order('sort_order'),
    db.from('mv_mrr_snapshot').select('*').order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
    db.from('subscriptions').select('plan_tier, amount_cents, status').in('status', ['active', 'trialing']),
    db.from('subscriptions').select('id').eq('status', 'canceled').gte('updated_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    db.from('subscriptions').select('id, user_id, plan_tier, status, amount_cents, interval, current_period_end, created_at, profiles(email, full_name)'),
    db.from('usage_quotas').select('projects_created, artifacts_generated, exports_run, ai_cost_cents'),
  ]);

  // KPIs
  const snapshot = snapshotRes.data;
  const mrrCents = snapshot?.mrr_cents ?? 0;
  const activeSub = snapshot?.active_subs ?? 0;
  const trialingSub = snapshot?.trialing_subs ?? 0;
  const payingCustomers = snapshot?.paying_customers ?? 0;
  const totalActive = activeSub + trialingSub;
  const churnCount = churnedRes.data?.length ?? 0;
  const churnRate = totalActive > 0 ? Math.round((churnCount / (totalActive + churnCount)) * 100 * 10) / 10 : 0;
  const arpu = payingCustomers > 0 ? Math.round(mrrCents / payingCustomers) : 0;

  // Enrich plans with subscriber counts
  const subsByPlan: Record<string, { count: number; mrr: number }> = {};
  for (const s of activeSubs.data ?? []) {
    const tier = s.plan_tier ?? 'free';
    if (!subsByPlan[tier]) subsByPlan[tier] = { count: 0, mrr: 0 };
    subsByPlan[tier].count += 1;
    subsByPlan[tier].mrr += s.amount_cents ?? 0;
  }

  const plans = (plansRes.data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    subscriber_count: subsByPlan[p.tier as string]?.count ?? 0,
    plan_mrr_cents: subsByPlan[p.tier as string]?.mrr ?? 0,
  }));

  // Subscriber list
  const subscribers = (subscriberRes.data ?? []).map((s: Record<string, unknown>) => {
    const profile = s.profiles as Record<string, unknown> | null;
    return {
      id: s.id,
      user_id: s.user_id,
      email: profile?.email ?? 'unknown',
      full_name: profile?.full_name ?? null,
      plan_tier: s.plan_tier,
      status: s.status,
      amount_cents: s.amount_cents ?? 0,
      interval: s.interval ?? null,
      current_period_end: s.current_period_end ?? null,
      created_at: s.created_at,
    };
  });

  // Usage stats
  const quotas = quotasRes.data ?? [];
  const qLen = quotas.length || 1;
  const usage_stats = {
    avg_projects: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.projects_created ?? 0), 0) / qLen * 10) / 10,
    avg_artifacts: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.artifacts_generated ?? 0), 0) / qLen * 10) / 10,
    avg_exports: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.exports_run ?? 0), 0) / qLen * 10) / 10,
    avg_ai_cost_cents: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.ai_cost_cents ?? 0), 0) / qLen),
  };

  return NextResponse.json({
    kpis: {
      mrr_cents: mrrCents,
      arr_cents: mrrCents * 12,
      active_subs: activeSub,
      trialing_subs: trialingSub,
      churn_rate: churnRate,
      arpu_cents: arpu,
    },
    plans,
    subscribers,
    usage_stats,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Whitelist allowed fields
  const allowed = [
    'name', 'description', 'monthly_price_cents', 'annual_price_cents',
    'is_active', 'is_featured', 'stripe_monthly_price_id', 'stripe_annual_price_id',
    'limits', 'features', 'cta_text', 'cta_url', 'sort_order',
  ];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  const { error } = await db
    .from('plan_configs')
    .update(filtered)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await db.from('audit_log').insert({
    actor_id: auth.id,
    action: 'plan_config_updated',
    target_type: 'plan_config',
    target_id: id,
    after_state: filtered,
    severity: 'info',
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (isErrorResponse(auth)) return auth;

  const body = await req.json();
  if (body.action !== 'recommend') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  // Gather metrics for AI
  const [plansRes, snapshotRes, subsRes, quotasRes] = await Promise.all([
    db.from('plan_configs').select('tier, name, monthly_price_cents, annual_price_cents, is_active').order('sort_order'),
    db.from('mv_mrr_snapshot').select('*').order('snapshot_date', { ascending: false }).limit(1).maybeSingle(),
    db.from('subscriptions').select('plan_tier, amount_cents, status').in('status', ['active', 'trialing']),
    db.from('usage_quotas').select('projects_created, artifacts_generated, exports_run, ai_cost_cents'),
  ]);

  const snapshot = snapshotRes.data;
  const subs = subsRes.data ?? [];
  const quotas = quotasRes.data ?? [];
  const qLen = quotas.length || 1;

  const metrics = {
    current_plans: plansRes.data ?? [],
    mrr_cents: snapshot?.mrr_cents ?? 0,
    paying_customers: snapshot?.paying_customers ?? 0,
    active_subs: snapshot?.active_subs ?? 0,
    trialing_subs: snapshot?.trialing_subs ?? 0,
    plan_distribution: subs.reduce((acc: Record<string, number>, s: Record<string, unknown>) => {
      const tier = (s.plan_tier as string) ?? 'free';
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    }, {}),
    avg_usage: {
      projects: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.projects_created ?? 0), 0) / qLen * 10) / 10,
      artifacts: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.artifacts_generated ?? 0), 0) / qLen * 10) / 10,
      exports: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.exports_run ?? 0), 0) / qLen * 10) / 10,
      avg_ai_cost_cents: Math.round(quotas.reduce((s: number, q: Record<string, number>) => s + (q.ai_cost_cents ?? 0), 0) / qLen),
    },
  };

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) {
    return NextResponse.json({
      recommendations: [{
        tier: 'pro',
        suggested_monthly_cents: 4900,
        suggested_annual_cents: 39000,
        rationale: 'AI recommendations require DEEPSEEK_API_KEY to be configured.',
        confidence: 0,
      }],
    });
  }

  try {
    const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a SaaS pricing strategist. Analyze the platform metrics and recommend optimal pricing. Return valid JSON only, no markdown. Format: { "recommendations": [{ "tier": string, "suggested_monthly_cents": number, "suggested_annual_cents": number, "rationale": string, "confidence": number (0-100) }] }',
          },
          {
            role: 'user',
            content: `Analyze these metrics and recommend pricing for each active plan tier:\n\n${JSON.stringify(metrics, null, 2)}\n\nConsider: user volume, usage patterns, AI costs, market positioning. Annual should be ~20-33% discount vs monthly.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!aiRes.ok) throw new Error('DeepSeek API error');

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      recommendations: [{
        tier: 'pro',
        suggested_monthly_cents: 4900,
        suggested_annual_cents: 39000,
        rationale: 'Unable to generate AI recommendations at this time. Current pricing is maintained.',
        confidence: 0,
      }],
    });
  }
}
