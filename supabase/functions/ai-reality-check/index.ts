// ============================================================
// Jetdale — AI Reality Check Edge Function
// Loads ALL current artifacts + discovery answers for a project,
// sends them to DeepSeek v4-pro, and asks it to find contradictions,
// unrealistic expectations, missing considerations, and budget gaps.
// Returns a structured reality check with concerns and proposed changes.
// ============================================================

import { getAuthUser, getAdminClient, AuthError } from '../_shared/auth.ts';
import { callAI } from '../_shared/deepseek.ts';
import { checkQuota, incrementQuota } from '../_shared/quota-check.ts';
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  limitExceededResponse,
} from '../_shared/response.ts';
import { logProductEvent } from '../_shared/log-event.ts';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface RealityCheckConcern {
  severity: 'high' | 'medium' | 'low';
  area:
    | 'budget'
    | 'timeline'
    | 'scope'
    | 'market'
    | 'technical'
    | 'team'
    | 'legal';
  title: string;
  message: string;
  suggested_action: string;
}

interface RealityCheckChange {
  artifact_type: string;
  change_description: string;
}

interface RealityCheckOutput {
  summary: string;
  concerns: RealityCheckConcern[];
  proposed_changes: RealityCheckChange[];
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return errorResponse('projectId is required', 400);
    }

    const admin = getAdminClient();

    // ----------------------------------------------------------
    // 1. Verify ownership — user must own this project
    // ----------------------------------------------------------
    const { data: project } = await admin
      .from('projects')
      .select('id, name, archetype_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // ----------------------------------------------------------
    // 2. Check quota — realityChecksPerMonth
    // ----------------------------------------------------------
    const quotaCheck = await checkQuota(
      user.id,
      user.planTier,
      'realityChecksPerMonth',
    );
    if (!quotaCheck.allowed) {
      return limitExceededResponse(
        quotaCheck.limit!,
        quotaCheck.current!,
        quotaCheck.max!,
      );
    }

    // ----------------------------------------------------------
    // 3. Load archetype info
    // ----------------------------------------------------------
    const { data: archetype } = await admin
      .from('archetypes')
      .select('slug, name')
      .eq('id', project.archetype_id)
      .single();

    const archetypeSlug = archetype?.slug ?? 'unknown';
    const archetypeName = archetype?.name ?? 'Unknown';

    // ----------------------------------------------------------
    // 4. Load ALL current artifacts for this project
    // ----------------------------------------------------------
    const { data: artifacts } = await admin
      .from('artifacts')
      .select('type, content_markdown, content_json')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .eq('status', 'ready');

    if (!artifacts || artifacts.length === 0) {
      return errorResponse(
        'No artifacts found. Generate artifacts before running a reality check.',
        400,
      );
    }

    // ----------------------------------------------------------
    // 5. Load discovery answers (via discovery_sessions)
    // ----------------------------------------------------------
    const { data: sessions } = await admin
      .from('discovery_sessions')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    let discoveryBlock = '';
    if (sessions && sessions.length > 0) {
      const { data: answers } = await admin
        .from('discovery_answers')
        .select(
          'question_key, question_text, question_type, answer_text, answer_value, question_index',
        )
        .eq('session_id', sessions[0].id)
        .order('question_index', { ascending: true });

      if (answers && answers.length > 0) {
        discoveryBlock = answers
          .map(
            (a: any) =>
              `Q${a.question_index + 1} [${a.question_key}]: ${a.question_text}\nA: ${a.answer_text}`,
          )
          .join('\n\n');
      }
    }

    // ----------------------------------------------------------
    // 6. Build the artifacts block
    // ----------------------------------------------------------
    const artifactsBlock = artifacts
      .map(
        (a: any) =>
          `=== ${a.type.toUpperCase()} ===\n${a.content_markdown ?? '(no markdown content)'}`,
      )
      .join('\n\n');

    // ----------------------------------------------------------
    // 7. Build the system prompt
    // ----------------------------------------------------------
    const systemPrompt = buildRealityCheckPrompt(
      project.name,
      archetypeName,
      archetypeSlug,
      discoveryBlock,
      artifactsBlock,
    );

    // ----------------------------------------------------------
    // 8. Call DeepSeek v4-flash (non-streaming)
    // ----------------------------------------------------------
    const aiResult = await callAI({
      model: 'deepseek-v4-flash',
      eventType: 'reality_check',
      userId: user.id,
      projectId,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            'Perform a thorough reality check on this project. Be honest and specific. Do not soften bad news.',
        },
      ],
      maxTokens: 4000,
      temperature: 0.3,
    });

    // ----------------------------------------------------------
    // 9. Parse the AI response into structured JSON
    // ----------------------------------------------------------
    let parsed: RealityCheckOutput;
    try {
      parsed = extractJson(aiResult.content);
    } catch (parseErr) {
      console.error(
        'Failed to parse reality check JSON:',
        parseErr,
        '\nRaw content:',
        aiResult.content,
      );
      // Fallback: wrap the raw text as a summary with no structured concerns
      parsed = {
        summary: aiResult.content.slice(0, 500),
        concerns: [],
        proposed_changes: [],
      };
    }

    // Validate and sanitize the parsed output
    parsed = sanitizeOutput(parsed);

    // Derive the Jetdale review score from the concerns.
    const score = computeReviewScore(parsed.concerns);

    // ----------------------------------------------------------
    // 10. Persist to reality_checks table
    // ----------------------------------------------------------
    const { data: realityCheck, error: insertErr } = await admin
      .from('reality_checks')
      .insert({
        project_id: projectId,
        user_id: user.id,
        summary: parsed.summary,
        concerns: parsed.concerns,
        proposed_changes: parsed.proposed_changes,
        generation_cost_cents: aiResult.costCents,
        overall_score: score.overall,
        letter_grade: score.grade,
        axis_scores: score.axes,
      })
      .select('id, created_at')
      .single();

    if (insertErr) {
      console.error('Failed to insert reality check:', insertErr);
      return errorResponse('Failed to save reality check', 500);
    }

    // ----------------------------------------------------------
    // 11. Increment quota
    // ----------------------------------------------------------
    await incrementQuota(user.id, 'reality_checks_completed');

    // ----------------------------------------------------------
    // 12. Update project last_activity_at
    // ----------------------------------------------------------
    await admin
      .from('projects')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', projectId);

    // ----------------------------------------------------------
    // 13. Log product event
    // ----------------------------------------------------------
    await logProductEvent({
      userId: user.id,
      event: 'reality_check_completed',
      properties: {
        project_id: projectId,
        reality_check_id: realityCheck.id,
        archetype: archetypeSlug,
        concerns_count: parsed.concerns.length,
        high_severity_count: parsed.concerns.filter(
          (c) => c.severity === 'high',
        ).length,
        proposed_changes_count: parsed.proposed_changes.length,
        artifacts_analyzed: artifacts.length,
        prompt_tokens: aiResult.promptTokens,
        completion_tokens: aiResult.completionTokens,
        cost_cents: aiResult.costCents,
        latency_ms: aiResult.latencyMs,
      },
    });

    // ----------------------------------------------------------
    // 14. Return response
    // ----------------------------------------------------------
    return jsonResponse({
      id: realityCheck.id,
      projectId,
      summary: parsed.summary,
      concerns: parsed.concerns,
      proposedChanges: parsed.proposed_changes,
      score: score.overall,
      grade: score.grade,
      axes: score.axes,
      createdAt: realityCheck.created_at,
      meta: {
        model: 'deepseek-v4-flash',
        promptTokens: aiResult.promptTokens,
        completionTokens: aiResult.completionTokens,
        costCents: aiResult.costCents,
        latencyMs: aiResult.latencyMs,
        artifactsAnalyzed: artifacts.length,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error('ai-reality-check error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// ============================================================
// Build the reality check system prompt
// ============================================================

function buildRealityCheckPrompt(
  projectName: string,
  archetypeName: string,
  archetypeSlug: string,
  discoveryBlock: string,
  artifactsBlock: string,
): string {
  return `You are a brutally honest senior project advisor performing a "reality check" on a planning project. Your job is to find problems BEFORE the user wastes time and money.

You have deep expertise in:
- Software product development (if applicable)
- Budget estimation and financial planning
- Market analysis and competitive positioning
- Technical architecture and feasibility
- Team capacity and timeline realism
- Legal and compliance considerations

=== PROJECT: ${projectName} ===
=== TYPE: ${archetypeName} (${archetypeSlug}) ===

=== DISCOVERY ANSWERS (what the user told us) ===
${discoveryBlock || '(No discovery answers available)'}

=== GENERATED ARTIFACTS (the planning documents) ===
${artifactsBlock}

=== YOUR TASK ===
Analyze EVERYTHING above and find:

1. **Contradictions** — Does the budget match the scope? Does the timeline match the feature set? Do the personas match the stated target market? Are technical choices consistent with the team's stated abilities?

2. **Unrealistic Expectations** — Is the timeline too aggressive? Is the budget too low for what they want to build? Are the success metrics achievable? Are market size assumptions grounded in reality?

3. **Missing Considerations** — What important topics were not addressed? Legal/regulatory? Maintenance costs? User acquisition strategy? Competitor response? Data privacy?

4. **Budget Gaps** — Are there costs not accounted for? Infrastructure costs that will grow with users? Marketing budget? Legal fees? Ongoing maintenance?

5. **Scope Creep Risks** — Which features sound simple but are actually complex? What "v2 features" are actually required for a viable v1?

=== OUTPUT FORMAT ===
Respond with ONLY a valid JSON object (no markdown fences, no text before or after). Use this exact structure:

{
  "summary": "Brief 2-3 sentence overview of the project's readiness and the most critical issues found.",
  "concerns": [
    {
      "severity": "high",
      "area": "budget",
      "title": "Short descriptive title",
      "message": "Detailed explanation of the concern. Be specific — reference actual numbers, features, or statements from the artifacts.",
      "suggested_action": "Concrete, actionable recommendation."
    }
  ],
  "proposed_changes": [
    {
      "artifact_type": "budget",
      "change_description": "Specific change that should be made to this artifact."
    }
  ]
}

=== RULES ===
- severity must be one of: "high", "medium", "low"
- area must be one of: "budget", "timeline", "scope", "market", "technical", "team", "legal"
- artifact_type in proposed_changes must match actual artifact types: vision, scope, personas, roadmap, tech_stack, wireframes, risk_register, success_metrics, budget, decision_log, pre_mortem, pitch_deck
- Include 4-10 concerns. Do not pad with trivial issues, but do not ignore real problems.
- Include 2-6 proposed changes. Only suggest changes that would meaningfully improve the plan.
- Be specific. Reference actual numbers, features, and statements from the documents.
- Do not soften bad news. If the budget is wildly insufficient, say so clearly.
- Do not use these phrases: delve, leverage, robust, cutting-edge, seamless, navigate, harness, unlock, game-changer, paradigm, synergy, holistic.
- Output valid JSON only. No markdown code fences. No explanatory text outside the JSON.`;
}

// ============================================================
// Extract JSON from AI response (handles code fences, etc.)
// ============================================================

function extractJson(raw: string): RealityCheckOutput {
  let text = raw.trim();

  // Strip markdown code fences if present
  const jsonFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonFenceMatch) {
    text = jsonFenceMatch[1].trim();
  }

  // Try to find a JSON object in the text
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(text);

  if (!parsed.summary || !Array.isArray(parsed.concerns)) {
    throw new Error(
      'Parsed JSON missing required fields: summary, concerns',
    );
  }

  return parsed as RealityCheckOutput;
}

// ============================================================
// Sanitize and validate the parsed output
// ============================================================

function sanitizeOutput(output: RealityCheckOutput): RealityCheckOutput {
  const validSeverities = new Set(['high', 'medium', 'low']);
  const validAreas = new Set([
    'budget',
    'timeline',
    'scope',
    'market',
    'technical',
    'team',
    'legal',
  ]);
  const validArtifactTypes = new Set([
    'vision',
    'scope',
    'personas',
    'roadmap',
    'tech_stack',
    'wireframes',
    'risk_register',
    'success_metrics',
    'budget',
    'decision_log',
    'pre_mortem',
    'pitch_deck',
  ]);

  const concerns = (output.concerns || [])
    .filter(
      (c) =>
        c &&
        typeof c.title === 'string' &&
        typeof c.message === 'string',
    )
    .map((c) => ({
      severity: validSeverities.has(c.severity) ? c.severity : 'medium',
      area: validAreas.has(c.area) ? c.area : 'scope',
      title: c.title.slice(0, 200),
      message: c.message.slice(0, 2000),
      suggested_action: (c.suggested_action || '').slice(0, 1000),
    })) as RealityCheckConcern[];

  const proposedChanges = (output.proposed_changes || [])
    .filter(
      (ch) =>
        ch &&
        typeof ch.artifact_type === 'string' &&
        typeof ch.change_description === 'string',
    )
    .map((ch) => ({
      artifact_type: validArtifactTypes.has(ch.artifact_type)
        ? ch.artifact_type
        : ch.artifact_type, // Keep it even if unexpected — the client can handle it
      change_description: ch.change_description.slice(0, 2000),
    }));

  return {
    summary: (output.summary || '').slice(0, 1000),
    concerns,
    proposed_changes: proposedChanges,
  };
}

// ============================================================
// Compute the Jetdale review score from a list of concerns.
// Each axis starts at 100; concerns deduct by severity. The
// overall score is the unweighted mean, mapped to a letter grade.
// ============================================================

interface AxisScores {
  clarity: number;
  feasibility: number;
  market: number;
  riskReadiness: number;
  buildReadiness: number;
}

interface ReviewScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  axes: AxisScores;
}

const AREA_TO_AXIS: Record<string, keyof AxisScores> = {
  budget: 'feasibility',
  timeline: 'feasibility',
  team: 'feasibility',
  scope: 'clarity',
  market: 'market',
  technical: 'buildReadiness',
  legal: 'riskReadiness',
};

const SEVERITY_DEDUCTION: Record<string, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

function letterFromScore(score: number): ReviewScore['grade'] {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function computeReviewScore(concerns: RealityCheckConcern[]): ReviewScore {
  const axes: AxisScores = {
    clarity: 100,
    feasibility: 100,
    market: 100,
    riskReadiness: 100,
    buildReadiness: 100,
  };

  for (const c of concerns) {
    const axis = AREA_TO_AXIS[c.area] ?? 'riskReadiness';
    const deduction = SEVERITY_DEDUCTION[c.severity] ?? 5;
    axes[axis] = Math.max(0, axes[axis] - deduction);
  }

  const overall = Math.round(
    (axes.clarity + axes.feasibility + axes.market + axes.riskReadiness + axes.buildReadiness) / 5,
  );

  return { overall, grade: letterFromScore(overall), axes };
}
