// ============================================================
// POST /api/generate — Generate a single artifact via DeepSeek
// Body: { artifactType, archetypeName, discoveryAnswers, existingArtifacts? }
// Returns: { contentMarkdown }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeek } from '@/lib/deepseek';
import {
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
  try {
    const body = await req.json();
    const { artifactType, archetypeName, discoveryAnswers, existingArtifacts } = body;

    const builder = PROMPT_BUILDERS[artifactType];
    if (!builder) {
      return NextResponse.json({ error: `Unknown artifact type: ${artifactType}` }, { status: 400 });
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

    return NextResponse.json({ contentMarkdown });
  } catch (err) {
    console.error('Generate route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
