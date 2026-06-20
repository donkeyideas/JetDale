// ============================================================
// POST /api/generate — Generate a single artifact via DeepSeek
// Body: { artifactType, archetypeName, discoveryAnswers, existingArtifacts? }
// Returns: { contentMarkdown }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeek } from '@/lib/deepseek';
import { verifyUser, isErrorResponse } from '@/lib/stripe';
import {
  getUserPlanTier,
  checkArtifactQuota,
  incrementArtifactQuota,
  isStaff,
} from '@/lib/quota';
import {
  buildDemandAnalysisPrompt,
  buildVisionPrompt,
  buildScopePrompt,
  buildPersonasPrompt,
  buildRoadmapPrompt,
  buildTechStackPrompt,
  buildRiskRegisterPrompt,
  buildSuccessMetricsPrompt,
  buildBudgetPrompt,
  buildWireframesPrompt,
  buildDecisionLogPrompt,
  buildPreMortemPrompt,
  buildPitchDeckPrompt,
  buildCompetitiveAnalysisPrompt,
  buildGoToMarketPrompt,
  buildUserJourneyPrompt,
  buildRaciMatrixPrompt,
  buildArchitectureOverviewPrompt,
  scanForBannedPhrases,
} from '@jetdale/shared';

interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

const PROMPT_BUILDERS: Record<string, (opts: ArtifactPromptOpts) => string> = {
  demand_analysis: buildDemandAnalysisPrompt,
  vision: buildVisionPrompt,
  scope: buildScopePrompt,
  personas: buildPersonasPrompt,
  roadmap: buildRoadmapPrompt,
  tech_stack: buildTechStackPrompt,
  wireframes: buildWireframesPrompt,
  risk_register: buildRiskRegisterPrompt,
  success_metrics: buildSuccessMetricsPrompt,
  budget: buildBudgetPrompt,
  decision_log: buildDecisionLogPrompt,
  pre_mortem: buildPreMortemPrompt,
  pitch_deck: buildPitchDeckPrompt,
  competitive_analysis: buildCompetitiveAnalysisPrompt,
  go_to_market: buildGoToMarketPrompt,
  user_journey: buildUserJourneyPrompt,
  raci_matrix: buildRaciMatrixPrompt,
  architecture_overview: buildArchitectureOverviewPrompt,
};

// Use deep model for complex reasoning artifacts
const DEEP_MODEL_TYPES = new Set([
  'roadmap', 'risk_register', 'pre_mortem', 'pitch_deck',
  'competitive_analysis', 'go_to_market', 'architecture_overview',
]);

export async function POST(req: NextRequest) {
  // Require an authenticated user — this is a paid AI endpoint.
  const user = await verifyUser(req);
  if (isErrorResponse(user)) return user;

  try {
    const body = await req.json();
    const { artifactType, archetypeName, discoveryAnswers, existingArtifacts } = body;

    const builder = PROMPT_BUILDERS[artifactType];
    if (!builder) {
      return NextResponse.json({ error: `Unknown artifact type: ${artifactType}` }, { status: 400 });
    }

    // Enforce the plan's artifact quota (staff are exempt).
    const staff = await isStaff(user.id);
    if (!staff) {
      const tier = await getUserPlanTier(user.id);
      const quota = await checkArtifactQuota(user.id, tier);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: `You've reached your ${tier} plan limit of ${quota.max} planning documents this month. Upgrade to generate all 18.`,
            code: 'quota_exceeded',
          },
          { status: 402 },
        );
      }
    }

    const systemPrompt = builder({ archetypeName, discoveryAnswers, existingArtifacts });
    const model = DEEP_MODEL_TYPES.has(artifactType) ? 'deep' : 'fast';

    // Inject current date so the AI uses correct timelines
    const now = new Date();
    const dateContext = `\n\n=== CURRENT DATE ===\nToday's date is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Use this as the baseline for ALL dates, timelines, milestones, and deadlines in your output. Never reference dates in the past.\n`;

    const response = await callDeepSeek({
      model,
      systemPrompt: systemPrompt + dateContext,
      userMessage: 'Generate this artifact now.',
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`DeepSeek error for ${artifactType}:`, err);
      return NextResponse.json({ error: 'DeepSeek API error', details: err }, { status: 502 });
    }

    const data = await response.json();
    const contentMarkdown = data.choices?.[0]?.message?.content || '';

    // Quality check
    const banned = scanForBannedPhrases(contentMarkdown);
    if (banned.length > 0) {
      console.warn(`Banned phrases in ${artifactType}:`, banned);
    }

    // Count this generation against the user's monthly quota.
    if (!staff) {
      await incrementArtifactQuota(user.id);
    }

    return NextResponse.json({ contentMarkdown });
  } catch (err) {
    console.error('Generate route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
