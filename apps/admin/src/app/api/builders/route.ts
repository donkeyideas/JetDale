// ============================================================
// POST /api/builders
// Given a project, returns a curated list of builders, agencies,
// AI coding tools, and talent platforms that fit it. Donkey Ideas
// is included transparently with a "Built by Jetdale's team" badge
// — ranked by genuine fit, never artificially first.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser, isErrorResponse } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { callDeepSeek } from '@/lib/deepseek';

export interface BuilderRecommendation {
  name: string;
  category: 'ai-coding-tool' | 'agency' | 'talent-platform' | 'marketplace';
  description: string;
  fit_reason: string;
  price_range: string;
  action_url: string;
  jetdale_team?: boolean;
}

// ---- Donkey Ideas: hardcoded so the AI doesn't guess our pricing ----
// Tweak the description / price / URL here as the business evolves.
// fit_reason stays project-agnostic on purpose — it's a strong line that
// always applies and doesn't depend on whatever the AI thinks of us.
const DONKEY_IDEAS_BUILDER: BuilderRecommendation = {
  name: 'Donkey Ideas',
  category: 'agency',
  description:
    'The agency team behind Jetdale. We build the projects we help you plan, using the same discovery → artifact → reality-check workflow that powers this tool.',
  fit_reason:
    'Direct line to the team that built Jetdale. We use the same workflow internally, so the build matches your plan exactly. Flexible engagement: fixed-bid for clearly-scoped MVPs, retainer for ongoing iteration.',
  price_range: '$95–$125 per hour · fixed-bid available',
  action_url: 'https://www.donkeyideas.com',
  jetdale_team: true,
};

const SYSTEM_PROMPT = `You are a builder/agency recommendation engine for Jetdale, an AI project-planning platform.

Given a project (its vision, scope, tech stack, budget, and timeline), recommend 5-8 OTHER builders, agencies, AI coding tools, talent platforms, or marketplaces that could realistically build this project. Donkey Ideas (the team behind Jetdale) is added separately by the system — do NOT include them in your output. Focus only on third-party options.

Be honest and grounded: only recommend real options that exist, no inventing names.

Categories to include depending on fit:
- "ai-coding-tool": Cursor, Claude Code, Lovable, Bolt, Replit Agent, Vercel v0 — for founders who want to ship themselves.
- "agency": real dev shops that match the stack and domain (e.g. Thoughtbot for Rails, well-known healthcare specialists for HIPAA, etc.).
- "talent-platform": Toptal (vetted senior), Upwork Enterprise, a16z Talent x Connect (funded startups), GitHub Hiring.
- "marketplace": Fiverr Pro, Codeable (WordPress), niche platforms when they fit.

For each option, the "fit_reason" must reference THIS project's actual specifics — its stack, budget, complexity, timeline. Generic reasoning fails.

=== PRICE FORMAT — CRITICAL FOR COMPARABILITY ===
Use this format per category so the user can compare options at a glance:
- "agency": ALWAYS give an HOURLY range (e.g., "$120–$180 per hour"). If the agency only quotes fixed-bid, give the implied hourly equivalent for a typical engagement (total budget ÷ ~480 hours for a 12-week effort).
- "talent-platform": ALWAYS hourly (e.g., "$80–$150 per hour").
- "ai-coding-tool": Monthly or per-seat, plus free-tier note (e.g., "$20/user per month, or $0 free tier").
- "marketplace": Per-project range (e.g., "$2K–$15K per project").

Mixing units (one option in $/hr and another in total project cost) makes comparison impossible. Stay consistent within category.

Output a valid JSON object with this exact structure:
{
  "builders": [
    {
      "name": "...",
      "category": "agency",
      "description": "1-2 sentences",
      "fit_reason": "Why this fits THIS project (cite stack/budget/complexity).",
      "price_range": "...",
      "action_url": "https://..."
    }
  ]
}

Output VALID JSON only. No markdown fences. No commentary. No emojis.`;

export async function POST(req: NextRequest) {
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  const body = await req.json().catch(() => ({}));
  const { projectId } = body as { projectId?: string };
  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  const { data: project } = await db
    .from('projects')
    .select('id, user_id, name, tagline')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Not your project' }, { status: 403 });
  }

  const { data: artifacts } = await db
    .from('artifacts')
    .select('type, content_markdown')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .eq('status', 'ready');

  if (!artifacts || artifacts.length === 0) {
    return NextResponse.json(
      { error: 'Generate the project artifacts before searching for builders.' },
      { status: 400 },
    );
  }

  // Compact context: the artifact types most useful for matching builders.
  const keyTypes = new Set(['vision', 'scope', 'tech_stack', 'budget', 'roadmap', 'architecture_overview']);
  const context = artifacts
    .filter((a) => keyTypes.has(a.type as string))
    .map((a) => `=== ${(a.type as string).toUpperCase()} ===\n${(a.content_markdown as string).slice(0, 2500)}`)
    .join('\n\n');

  const userMessage = `Project name: "${project.name}"\nTagline / archetype: "${project.tagline ?? ''}"\n\n${context}\n\nReturn the JSON list now.`;

  const aiRes = await callDeepSeek({
    model: 'fast',
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
  });

  if (!aiRes.ok) {
    const detail = await aiRes.text().catch(() => '');
    console.error('[/api/builders] DeepSeek error:', aiRes.status, detail);
    return NextResponse.json({ error: 'AI provider error.' }, { status: 502 });
  }

  const data = await aiRes.json();
  const content = data?.choices?.[0]?.message?.content ?? '';

  let parsed: { builders?: BuilderRecommendation[] };
  try {
    let text = String(content).trim();
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) text = fenceMatch[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
    parsed = JSON.parse(text);
  } catch (err) {
    console.error('[/api/builders] parse error', err, '\nraw:', content.slice(0, 1000));
    return NextResponse.json(
      { error: 'Could not parse builder recommendations. Try again.' },
      { status: 502 },
    );
  }

  const aiBuilders = Array.isArray(parsed.builders) ? parsed.builders : [];

  // Drop any accidental Donkey Ideas entry the model may have included
  // despite the system prompt, then prepend our hardcoded version so
  // pricing and description are always under our control.
  const filtered = aiBuilders.filter(
    (b) => !(typeof b?.name === 'string' && b.name.trim().toLowerCase().includes('donkey ideas')),
  );

  const builders: BuilderRecommendation[] = [DONKEY_IDEAS_BUILDER, ...filtered];

  return NextResponse.json({ builders });
}
