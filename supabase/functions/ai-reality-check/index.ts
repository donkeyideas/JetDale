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

interface RealityCheckContradiction {
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  artifacts_involved: string[];
  suggested_action: string;
}

interface RealityCheckOutput {
  summary: string;
  concerns: RealityCheckConcern[];
  proposed_changes: RealityCheckChange[];
  contradictions: RealityCheckContradiction[];
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
      maxTokens: 6000,
      temperature: 0.3,
    });

    // ----------------------------------------------------------
    // 9. Parse the AI response into structured JSON
    // ----------------------------------------------------------
    let parsed: RealityCheckOutput;
    let parseOk = true;
    try {
      parsed = extractJson(aiResult.content);
    } catch (parseErr) {
      parseOk = false;
      console.error(
        'Failed to parse reality check JSON:',
        parseErr,
        '\nRaw content:',
        aiResult.content,
      );
      parsed = {
        summary: aiResult.content.slice(0, 500),
        concerns: [],
        proposed_changes: [],
        contradictions: [],
      };
    }

    parsed = sanitizeOutput(parsed);

    // Empty concerns after a successful parse means the model was sycophantic.
    // An unparseable response is a different failure — usually JSON truncation
    // at the token cap. Retry once with a stricter system instruction; many
    // empty/garbled responses self-correct on the second attempt.
    if (!parseOk || parsed.concerns.length === 0) {
      console.warn(
        `Reality check first attempt empty (parseOk=${parseOk}, concerns=${parsed.concerns.length}) — retrying with stricter prompt`,
      );
      const retryPrompt = systemPrompt + `

=== RETRY INSTRUCTION ===
Your previous response was empty or invalid. You MUST output a single valid JSON object — no markdown, no commentary, no prose before or after — with at least 5 concerns. No project is perfect. Be brutally honest. If you cannot find 5 concerns, you are not looking hard enough.`;
      const retryResult = await callAI({
        model: 'deepseek-v4-flash',
        eventType: 'reality_check',
        userId: user.id,
        projectId,
        messages: [
          { role: 'system', content: retryPrompt },
          { role: 'user', content: 'Output the JSON now. At least 5 concerns. Be brutally honest.' },
        ],
        maxTokens: 6000,
        temperature: 0.2,
      });
      try {
        const retryParsed = sanitizeOutput(extractJson(retryResult.content));
        if (retryParsed.concerns.length > 0) {
          parsed = retryParsed;
          parseOk = true;
          // Account for both calls' cost.
          aiResult.costCents = (aiResult.costCents ?? 0) + (retryResult.costCents ?? 0);
        }
      } catch (retryErr) {
        console.error('Retry parse also failed:', retryErr, '\nRaw retry content:', retryResult.content);
      }
    }

    if (parsed.concerns.length === 0) {
      return errorResponse(
        parseOk
          ? "The reality check ran but the model returned no concerns even after retry. " +
            "This usually clears on another try — please run Reality check once more."
          : "The reality check response could not be parsed even after retry. " +
            "The model may be having trouble — please try again.",
        502,
      );
    }

    // Derive the Jetdale review score from concerns + contradictions.
    const score = computeReviewScore(parsed.concerns, parsed.contradictions);

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
        // generation_cost_cents is integer; aiResult.costCents keeps fractional
        // precision (parseFloat(...toFixed(4))) per the cost-calc policy, so
        // round at the storage boundary.
        generation_cost_cents: Math.round(aiResult.costCents),
        overall_score: score.overall,
        letter_grade: score.grade,
        axis_scores: score.axes,
        contradictions: parsed.contradictions,
      })
      .select('id, created_at')
      .single();

    if (insertErr) {
      console.error('Failed to insert reality check:', insertErr);
      const parts = [
        insertErr.message,
        insertErr.code && `code=${insertErr.code}`,
        insertErr.details && `details=${insertErr.details}`,
        insertErr.hint && `hint=${insertErr.hint}`,
      ].filter(Boolean);
      return errorResponse(
        `Failed to save reality check: ${parts.join('; ') || 'unknown DB error'}`,
        500,
      );
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
      contradictions: parsed.contradictions,
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
    const detail = err instanceof Error ? err.message : String(err);
    console.error('ai-reality-check error:', err);
    // Surface the underlying error message so client-side debugging
    // doesn't have to guess from a generic 500.
    return errorResponse('Reality check failed: ' + detail, 500);
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
This is a high-stakes review. The founder trusts this analysis to spot what
will sink them. Be the brutally honest senior advisor they don't have. EVERY
project — even strong ones — has at least 5 real concerns. A glowing "looks
great" review is a failure of your job, not a compliment to the founder.

Analyze EVERYTHING above and find:

1. **Contradictions** — Does the budget match the scope? Does the timeline match the feature set? Do the personas match the stated target market? Are technical choices consistent with the team's stated abilities?

2. **Unrealistic Expectations** — Is the timeline too aggressive? Is the budget too low for what they want to build? Are the success metrics achievable? Are market size assumptions grounded in reality?

3. **Missing Considerations** — What important topics were not addressed? Legal/regulatory? Maintenance costs? User acquisition strategy? Competitor response? Data privacy?

4. **Budget Gaps** — Are there costs not accounted for? Infrastructure costs that will grow with users? Marketing budget? Legal fees? Ongoing maintenance?

5. **Scope Creep Risks** — Which features sound simple but are actually complex? What "v2 features" are actually required for a viable v1?

6. **Cross-Artifact Contradictions** — Find places where the artifacts logically contradict each other. These are different from "concerns" — they are internal inconsistencies in the plan itself, not external risks. Look for patterns like:
   - The Vision promises feature X, but Scope deferred X to V2.
   - Success Metrics reference a feature/capability not in Scope or Roadmap (e.g., "sell 50 hardware units" when V1 is software-only).
   - Budget allocates money for something Scope dropped.
   - Roadmap milestone assumes a capability the Tech Stack does not include.
   - Personas describe a user group the product is not designed for, or one who would reject the value proposition.
   - The monetization model in Budget creates a legal exposure flagged in Risk Register.
   - Architecture Overview describes services not in the Budget or Tech Stack.

   Each contradiction must name the 2+ artifacts that contradict. Be specific — quote the actual phrases that conflict.

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
  ],
  "contradictions": [
    {
      "severity": "high",
      "title": "Vision promises hardware dongle but Scope is software-only",
      "message": "Vision statement says the V1 ships with a $10 analog hardware attachment. Scope explicitly defers all hardware to V2. Success Metrics lists 'sell 50 hardware attachments' as a V1 target.",
      "artifacts_involved": ["vision", "scope", "success_metrics"],
      "suggested_action": "Pick one: either ship hardware in V1 (update Scope and Budget) or remove hardware from Vision and Success Metrics."
    }
  ]
}

=== RULES ===
- severity must be one of: "high", "medium", "low"
- area must be one of: "budget", "timeline", "scope", "market", "technical", "team", "legal"
- artifact_type in proposed_changes must match actual artifact types: vision, scope, personas, competitive_analysis, user_journey, roadmap, tech_stack, architecture_overview, wireframes, raci_matrix, success_metrics, budget, go_to_market, risk_register, decision_log, pre_mortem, pitch_deck
- You MUST return at least 5 concerns. If your initial draft has fewer than 5, look harder at: legal/regulatory exposure (licensing, age verification, KYC/AML, jurisdiction), money handling (escrow, custodial accounts, payouts, taxes), single points of failure (one developer, one payment provider, one channel), market reality (will real users pay this price? what does the leader cost?), and timeline math (does the roadmap actually fit the budget?). Returning fewer than 5 concerns means you did not do your job. Maximum 12 — quality matters, but err on finding more.
- Include 2-6 proposed changes. Only suggest changes that would meaningfully improve the plan.
- Include 0-8 contradictions. Only include genuine internal inconsistencies — do not pad with stylistic disagreements. Zero contradictions is acceptable IF the plan is genuinely coherent; check carefully before claiming so.
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
    // Added: the 5 artifact types the web frontend also generates.
    'competitive_analysis',
    'user_journey',
    'architecture_overview',
    'raci_matrix',
    'go_to_market',
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

  const contradictions = (output.contradictions || [])
    .filter(
      (c) =>
        c &&
        typeof c.title === 'string' &&
        typeof c.message === 'string',
    )
    .map((c) => ({
      severity: validSeverities.has(c.severity) ? c.severity : 'medium',
      title: c.title.slice(0, 200),
      message: c.message.slice(0, 2000),
      artifacts_involved: Array.isArray(c.artifacts_involved)
        ? c.artifacts_involved
            .filter((a: unknown) => typeof a === 'string')
            .slice(0, 6) as string[]
        : [],
      suggested_action: (c.suggested_action || '').slice(0, 1000),
    })) as RealityCheckContradiction[];

  return {
    summary: (output.summary || '').slice(0, 1000),
    concerns,
    proposed_changes: proposedChanges,
    contradictions,
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

function computeReviewScore(
  concerns: RealityCheckConcern[],
  contradictions: RealityCheckContradiction[],
): ReviewScore {
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

  // Internal contradictions are inherently a clarity failure — a plan that
  // contradicts itself cannot be a clear plan, regardless of other strengths.
  for (const c of contradictions) {
    const deduction = SEVERITY_DEDUCTION[c.severity] ?? 5;
    axes.clarity = Math.max(0, axes.clarity - deduction);
  }

  const overall = Math.round(
    (axes.clarity + axes.feasibility + axes.market + axes.riskReadiness + axes.buildReadiness) / 5,
  );

  return { overall, grade: letterFromScore(overall), axes };
}
