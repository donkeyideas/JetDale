// ============================================================
// Jetdale — AI Artifact Generation Edge Function
// Generates all planning artifacts from discovery answers.
// Called after discovery completion. Processes artifacts in order.
// ============================================================

import { getAuthUser, getAdminClient, AuthError } from '../_shared/auth.ts';
import { callAI } from '../_shared/deepseek.ts';
import { checkQuota, incrementQuota } from '../_shared/quota-check.ts';
import { jsonResponse, errorResponse, corsResponse, limitExceededResponse } from '../_shared/response.ts';
import { logProductEvent } from '../_shared/log-event.ts';
import {
  buildLedgerPrompt,
  validateLedger,
  ledgerContextBlock,
  runDeterministicChecks,
  buildAuditorPrompt,
  parseAuditReport,
  type DecisionLedger,
} from '../_shared/decision-ledger.ts';

// All user-facing artifacts use Flash (Pro reserved for admin only)
const MODEL_MAP: Record<string, 'deepseek-v4-flash'> = {
  vision: 'deepseek-v4-flash',
  scope: 'deepseek-v4-flash',
  personas: 'deepseek-v4-flash',
  roadmap: 'deepseek-v4-flash',
  tech_stack: 'deepseek-v4-flash',
  wireframes: 'deepseek-v4-flash',
  risk_register: 'deepseek-v4-flash',
  success_metrics: 'deepseek-v4-flash',
  budget: 'deepseek-v4-flash',
  decision_log: 'deepseek-v4-flash',
  pre_mortem: 'deepseek-v4-flash',
  pitch_deck: 'deepseek-v4-flash',
};

// Default generation order if not specified by archetype
const DEFAULT_ORDER = [
  'vision', 'personas', 'scope', 'tech_stack', 'wireframes',
  'roadmap', 'success_metrics', 'budget', 'risk_register',
  'decision_log', 'pre_mortem', 'pitch_deck',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { sessionId, projectId, artifactTypes, regenerateType } = body;

    if (!sessionId || !projectId) {
      return errorResponse('sessionId and projectId are required', 400);
    }

    const admin = getAdminClient();

    // Verify user owns this project (select archetype_id, not archetype_slug)
    const { data: project } = await admin
      .from('projects')
      .select('id, archetype_id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // Look up the archetype by id to get the slug
    const { data: projectArchetype } = await admin
      .from('archetypes')
      .select('slug, artifact_types')
      .eq('id', project.archetype_id)
      .single();

    const archetypeSlug = projectArchetype?.slug ?? 'unknown';

    // Load all discovery answers (column is question_index, not step_index)
    const { data: answers } = await admin
      .from('discovery_answers')
      .select('question_key, question_type, answer_text, answer_value, question_index')
      .eq('session_id', sessionId)
      .order('question_index', { ascending: true });

    if (!answers || answers.length === 0) {
      return errorResponse('No discovery answers found', 400);
    }

    // Build the discovery summary for prompts
    const discoverySummary = answers
      .map((a: any) => `[${a.question_key}]: ${a.answer_text}`)
      .join('\n');

    // Determine which artifacts to generate
    let typesToGenerate: string[];

    if (regenerateType) {
      // Single artifact regeneration
      typesToGenerate = [regenerateType];
    } else if (artifactTypes) {
      typesToGenerate = artifactTypes;
    } else {
      // Use the archetype's artifact_types we already fetched above
      typesToGenerate = projectArchetype?.artifact_types || DEFAULT_ORDER;
    }

    // Check artifact quota for each
    if (user.planTier === 'free') {
      const quotaCheck = await checkQuota(user.id, user.planTier, 'artifactsPerProject');
      if (!quotaCheck.allowed) {
        return limitExceededResponse(quotaCheck.limit!, quotaCheck.current!, quotaCheck.max!);
      }
    }

    // ============================================================
    // Decision Ledger — single source of truth for all artifacts.
    // Generated once per project, cached on projects.metadata.
    // Subsequent generations (e.g. single-artifact regen) reuse it.
    // ============================================================
    const { data: projectFull } = await admin
      .from('projects')
      .select('metadata')
      .eq('id', projectId)
      .single();

    const cachedLedger = (projectFull?.metadata as { decision_ledger?: DecisionLedger } | null)
      ?.decision_ledger;
    let ledger: DecisionLedger | null = cachedLedger ?? null;

    if (!ledger) {
      const ledgerResult = await callAI({
        model: 'deepseek-v4-flash',
        eventType: 'artifact_generation',
        userId: user.id,
        projectId,
        messages: [
          { role: 'system', content: buildLedgerPrompt(archetypeSlug, project.name, discoverySummary) },
          { role: 'user', content: 'Output the Decision Ledger JSON.' },
        ],
        maxTokens: 2000,
        temperature: 0.2,
        jsonMode: true,
      });

      let parsed: unknown = null;
      try { parsed = JSON.parse(ledgerResult.content); } catch { /* handled below */ }
      const { ledger: validated, errors } = validateLedger(parsed);
      if (!validated) {
        // One retry with errors fed back.
        const retry = await callAI({
          model: 'deepseek-v4-flash',
          eventType: 'artifact_generation',
          userId: user.id,
          projectId,
          messages: [
            { role: 'system', content: buildLedgerPrompt(archetypeSlug, project.name, discoverySummary) },
            { role: 'user', content: `Your previous Decision Ledger had these issues: ${errors.join('; ')}. Fix and re-emit the JSON.` },
          ],
          maxTokens: 2000,
          temperature: 0.2,
          jsonMode: true,
        });
        try { parsed = JSON.parse(retry.content); } catch { parsed = null; }
        const second = validateLedger(parsed);
        if (!second.ledger) {
          console.error('Decision Ledger validation failed twice:', second.errors);
          return errorResponse('Could not build a consistent project plan. Please refine discovery answers and try again.', 500);
        }
        ledger = second.ledger;
      } else {
        ledger = validated;
      }

      // Cache on the project so single-artifact regens hit the same ledger.
      const existingMeta = (projectFull?.metadata as Record<string, unknown> | null) ?? {};
      await admin
        .from('projects')
        .update({ metadata: { ...existingMeta, decision_ledger: ledger } })
        .eq('id', projectId);
    }

    // Narrow for downstream code — every branch above either assigns a ledger or returns.
    if (!ledger) {
      return errorResponse('Decision Ledger unavailable.', 500);
    }
    const ledgerBlock = ledgerContextBlock(ledger);

    // Process artifacts sequentially in order
    const results: Array<{ type: string; status: string; error?: string; violations?: string[] }> = [];

    for (const artifactType of typesToGenerate) {
      try {
        // Mark any existing current artifact as not current
        // Column is "type", not "artifact_type"
        await admin
          .from('artifacts')
          .update({ is_current: false })
          .eq('project_id', projectId)
          .eq('type', artifactType)
          .eq('is_current', true);

        // Get the current version number
        const { count: versionCount } = await admin
          .from('artifacts')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('type', artifactType);

        const version = (versionCount ?? 0) + 1;

        // Insert new artifact row in generating state
        // Column is "type", not "artifact_type"; must include "user_id"
        const { data: newArtifact, error: insertErr } = await admin
          .from('artifacts')
          .insert({
            project_id: projectId,
            user_id: user.id,
            type: artifactType,
            version,
            status: 'generating',
            is_current: true,
          })
          .select('id')
          .single();

        if (insertErr || !newArtifact) {
          results.push({ type: artifactType, status: 'failed', error: 'Failed to create artifact row' });
          continue;
        }

        // Load existing artifacts for cross-referencing
        // Column is "type", not "artifact_type"
        const { data: existingArtifacts } = await admin
          .from('artifacts')
          .select('type, content_markdown')
          .eq('project_id', projectId)
          .eq('is_current', true)
          .eq('status', 'ready')
          .neq('type', artifactType);

        // Build the generation prompt (ledger block injected as authoritative context)
        const systemPrompt = buildArtifactPrompt(
          artifactType,
          archetypeSlug,
          project.name,
          discoverySummary,
          existingArtifacts || [],
          ledgerBlock,
        );

        // Call DeepSeek — with one consistency-retry if deterministic checks flag the output.
        const model = MODEL_MAP[artifactType] || 'deepseek-v4-flash';
        const userMessage = `Generate the ${artifactType.replace('_', ' ')} artifact for this project.`;

        let aiResult = await callAI({
          model,
          eventType: 'artifact_generation',
          userId: user.id,
          projectId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          maxTokens: 4000,
          temperature: 0.4,
        });

        let contentMarkdown = aiResult.content;
        let violations = runDeterministicChecks(artifactType, contentMarkdown, ledger).violations;

        if (violations.length > 0) {
          // One retry with violations spelled out.
          aiResult = await callAI({
            model,
            eventType: 'artifact_generation',
            userId: user.id,
            projectId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
              { role: 'assistant', content: contentMarkdown },
              {
                role: 'user',
                content: `Your draft has these consistency violations against the Decision Ledger:\n- ${violations.join('\n- ')}\n\nRewrite the artifact so every price, tool, provider, and number comes from the ledger. Do not introduce new ones.`,
              },
            ],
            maxTokens: 4000,
            temperature: 0.3,
          });
          contentMarkdown = aiResult.content;
          violations = runDeterministicChecks(artifactType, contentMarkdown, ledger).violations;
        }

        // Try to extract JSON if the artifact is structured
        let contentJson = null;
        try {
          // Check if the response contains a JSON block
          const jsonMatch = contentMarkdown.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            contentJson = JSON.parse(jsonMatch[1]);
          } else if (contentMarkdown.trim().startsWith('{') || contentMarkdown.trim().startsWith('[')) {
            contentJson = JSON.parse(contentMarkdown);
          }
        } catch {
          // JSON parsing failed — that is fine, we have the markdown
        }

        // Banned phrases check
        const bannedPhrases = [
          'delve', 'leverage', 'robust', 'cutting-edge', 'seamless',
          'navigate', 'harness the power', 'unlock the potential',
          'game-changer', 'paradigm shift', 'synergy', 'holistic',
          'streamline', 'spearhead',
        ];

        let cleanMarkdown = contentMarkdown;
        for (const phrase of bannedPhrases) {
          const regex = new RegExp(phrase, 'gi');
          // Replace banned phrases with simpler alternatives
          const replacements: Record<string, string> = {
            'delve': 'explore',
            'leverage': 'use',
            'robust': 'strong',
            'cutting-edge': 'modern',
            'seamless': 'smooth',
            'navigate': 'move through',
            'harness the power': 'use',
            'unlock the potential': 'enable',
            'game-changer': 'significant change',
            'paradigm shift': 'major change',
            'synergy': 'combined effect',
            'holistic': 'comprehensive',
            'streamline': 'simplify',
            'spearhead': 'lead',
          };
          cleanMarkdown = cleanMarkdown.replace(regex, replacements[phrase.toLowerCase()] || phrase);
        }

        // Update artifact with content
        // Correct column names: generation_model, generation_prompt_tokens,
        // generation_completion_tokens, generation_cost_cents
        // No generated_at column — updated_at is auto-set by trigger
        await admin
          .from('artifacts')
          .update({
            content_markdown: cleanMarkdown,
            content_json: contentJson,
            status: 'ready',
            generation_model: model,
            generation_prompt_tokens: aiResult.promptTokens,
            generation_completion_tokens: aiResult.completionTokens,
            generation_cost_cents: aiResult.costCents,
          })
          .eq('id', newArtifact.id);

        // Increment artifact quota
        await incrementQuota(user.id, 'artifacts_generated');

        results.push({
          type: artifactType,
          status: 'ready',
          ...(violations.length > 0 ? { violations } : {}),
        });
      } catch (err) {
        console.error(`Failed to generate ${artifactType}:`, err);

        // Mark artifact as failed
        // Column is "type", not "artifact_type"
        await admin
          .from('artifacts')
          .update({ status: 'failed' })
          .eq('project_id', projectId)
          .eq('type', artifactType)
          .eq('status', 'generating');

        results.push({
          type: artifactType,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update project progress
    const readyCount = results.filter((r) => r.status === 'ready').length;
    const totalCount = typesToGenerate.length;
    const pct = Math.round((readyCount / totalCount) * 100);

    await admin
      .from('projects')
      .update({
        progress_pct: pct,
        last_activity_at: new Date().toISOString(),
        phase: readyCount === totalCount ? 'refine' : 'artifacts',
      })
      .eq('id', projectId);

    // ============================================================
    // LLM auditor — final consistency pass, scoped to the fields
    // that historically conflict (pricing, tech_stack, providers,
    // budget, timeline, positioning). Runs only when the full plan
    // was generated (skip on single-artifact regen, where there's
    // nothing to cross-check against).
    // ============================================================
    let auditReport: { conflicts: Array<{ field: string; sections: string[]; description: string }> } = { conflicts: [] };
    if (!regenerateType && readyCount >= 3 && ledger) {
      try {
        const { data: artifactsForAudit } = await admin
          .from('artifacts')
          .select('type, content_markdown')
          .eq('project_id', projectId)
          .eq('is_current', true)
          .eq('status', 'ready');

        const corpus = (artifactsForAudit ?? [])
          .filter((a: { content_markdown?: string }) => typeof a.content_markdown === 'string')
          .map((a: any) => ({ type: a.type as string, content_markdown: a.content_markdown as string }));

        if (corpus.length > 0) {
          const auditResult = await callAI({
            model: 'deepseek-v4-flash',
            eventType: 'artifact_generation',
            userId: user.id,
            projectId,
            messages: [
              { role: 'system', content: buildAuditorPrompt(ledger, corpus) },
              { role: 'user', content: 'Return the conflicts JSON.' },
            ],
            maxTokens: 2000,
            temperature: 0.1,
            jsonMode: true,
          });
          auditReport = parseAuditReport(auditResult.content);

          // Surface conflicts on the project so the UI can show them; do not block.
          const existingMeta = (projectFull?.metadata as Record<string, unknown> | null) ?? {};
          await admin
            .from('projects')
            .update({
              metadata: {
                ...existingMeta,
                decision_ledger: ledger,
                last_audit: {
                  ran_at: new Date().toISOString(),
                  conflict_count: auditReport.conflicts.length,
                  conflicts: auditReport.conflicts,
                },
              },
            })
            .eq('id', projectId);
        }
      } catch (err) {
        console.error('Auditor pass failed (non-blocking):', err);
      }
    }

    // Log product event
    await logProductEvent({
      userId: user.id,
      event: 'artifacts_generated',
      properties: {
        project_id: projectId,
        archetype: archetypeSlug,
        artifacts_requested: totalCount,
        artifacts_completed: readyCount,
        artifacts_failed: totalCount - readyCount,
        audit_conflict_count: auditReport.conflicts.length,
      },
    });

    return jsonResponse({
      results,
      completedCount: readyCount,
      totalCount,
      auditConflicts: auditReport.conflicts,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error('ai-artifact-gen error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// ============================================================
// Build artifact generation prompt
// ============================================================

function buildArtifactPrompt(
  artifactType: string,
  archetypeSlug: string,
  projectName: string,
  discoverySummary: string,
  existingArtifacts: Array<{ type: string; content_markdown: string }>,
  ledgerBlock: string,
): string {
  const existingBlock = existingArtifacts.length > 0
    ? `\n\n=== EXISTING ARTIFACTS (reference for consistency) ===\n${existingArtifacts
        .map((a: any) => `--- ${a.type.toUpperCase()} ---\n${a.content_markdown}`)
        .join('\n\n')}`
    : '';

  const prompts: Record<string, string> = {
    vision: `Generate a Vision document for the project "${projectName}".

Include these sections with ## headers:
## Problem Statement (what pain exists, who feels it, why current solutions fall short)
## Vision Statement (one clear paragraph about what this project will become)
## Why Now (why this is the right time for this project)
## Target Users (2-3 user segments with brief descriptions)
## Success Criteria (3-5 measurable criteria for knowing this project succeeded)

Write 500-800 words. Be specific to this project, not generic.`,

    scope: `Generate a Scope document for the project "${projectName}".

Include these sections with ## headers:
## MVP Features
### Must Have (features required for launch — 5-8 items)
### Should Have (important but not blocking launch — 3-5 items)
### Could Have (nice to have — 2-4 items)
### Won't Have for V1 (explicitly excluded — 2-4 items)
## User Stories (5-8 key user stories in "As a [user], I want [goal], so that [reason]" format)
## Acceptance Criteria (3-5 testable criteria for the MVP)

Write 600-1000 words. Ground every feature in the discovery answers.`,

    personas: `Generate User Personas for the project "${projectName}".

Create 2-4 distinct personas. For each persona, use this structure:
## [Persona Name] — [Role/Title]
**Demographics:** Age, location, tech comfort level
**Goals:** 2-3 specific goals
**Pain Points:** 2-3 specific frustrations
**Jobs to Be Done:** 2-3 JTBD
**Behavior Patterns:** How they currently handle this
**Quote:** A fictional but realistic quote from this person

Write 400-700 words. Base personas on the discovery answers about target users.`,

    roadmap: `Generate a Roadmap for the project "${projectName}".

Create 3-5 phases:
## Phase [N]: [Name] ([Duration])
**Goals:** What this phase achieves
**Key Deliverables:** Specific outputs
**Dependencies:** What must be done first
**Milestone:** How you know this phase is complete

Base the timeline on the user's stated timeline and resources. Be realistic. Write 500-900 words.`,

    tech_stack: `Generate a Tech Stack recommendation for the project "${projectName}".

Include these sections:
## Frontend
## Backend
## Database
## Infrastructure & Hosting
## Third-Party Services
## Development Tools

For each recommendation: the tool/technology, a 1-2 sentence rationale, and 1-2 alternatives considered. Ground choices in the user's technical abilities, budget, and project requirements. Write 400-700 words.`,

    risk_register: `Generate a Risk Register for the project "${projectName}".

Create a table with 8-15 risks:
| Risk ID | Category | Description | Likelihood | Impact | Mitigation | Owner |
Each risk should be specific to this project. Categories: technical, market, financial, operational, legal, team.
Likelihood and impact: low, medium, or high.

Write 500-800 words including the table.`,

    success_metrics: `Generate Success Metrics for the project "${projectName}".

Create 6-10 KPIs:
## [Metric Name]
**Definition:** What exactly this measures
**Target:** Specific number or threshold
**Measurement:** How to track this
**Timeframe:** When to evaluate
**Why It Matters:** Connection to project success

Mix leading indicators (things you can influence now) and lagging indicators (outcomes). Write 400-600 words.`,

    budget: `Generate a Budget Breakdown for the project "${projectName}".

Structure:
## Budget Summary
Total estimated monthly: $X
Total one-time costs: $X
Contingency (15-20%): $X

## Line Items
### Development
### Infrastructure
### Marketing
### Operations
### Legal / Compliance

Each line item: what it is, monthly cost (if recurring), one-time cost (if applicable), notes.
Ground in the user's stated budget. If their budget seems too low for their scope, say so. Write 400-700 words.`,

    wireframes: `Generate Wireframe Descriptions for the project "${projectName}".

Describe 5-10 key screens:
## [Screen Name]
**Purpose:** What this screen does
**Key Elements:** UI components visible (list them)
**User Actions:** What the user can do here
**Navigates To:** Where the user goes from here

End with a Navigation Map showing the flow between screens. Write 500-800 words.`,

    decision_log: `Generate a Decision Log for the project "${projectName}".

Create 8-12 key decisions made during discovery:
## D-[NNN]: [Topic]
**Context:** Why this decision matters
**Options Considered:**
1. [Option] — Pros: ... / Cons: ...
2. [Option] — Pros: ... / Cons: ...
**Decision:** What was chosen
**Rationale:** Why
**Date:** Discovery Phase

Base decisions on choices made in the discovery answers. Write 500-800 words.`,

    pre_mortem: `Generate a Pre-Mortem Analysis for the project "${projectName}".

Imagine the project failed. Write 6-10 failure scenarios:
## [Scenario Name]
**What Happened:** Write in past tense as if describing the failure
**Likelihood:** low / medium / high
**Impact:** low / medium / high
**Early Warning Signs:** Things that would indicate this is happening
**Prevention Strategy:** What to do now to prevent this

Be honest and specific. Every project has real risks. Write 500-800 words.`,

    pitch_deck: `Generate a Pitch Deck outline for the project "${projectName}".

Create exactly 10 slides:
## Slide [N]: [Title]
**Content:**
- Bullet point 1
- Bullet point 2
- Bullet point 3
**Speaker Notes:** What to say when presenting this slide (2-3 sentences)

Standard deck order: Title, Problem, Solution, Market Size, Business Model, Traction/Roadmap, Team, Competition, Financial Projections, Ask/CTA. Write 600-1000 words.`,
  };

  const artifactPrompt = prompts[artifactType] || prompts.vision;

  return `You are a senior project planner generating a planning artifact for a real project. This is not a template — every word should be specific to this user's project.

=== PROJECT: ${projectName} ===
=== ARCHETYPE: ${archetypeSlug.replace('_', ' ')} ===

${ledgerBlock}

=== DISCOVERY ANSWERS ===
${discoverySummary}
${existingBlock}

=== YOUR TASK ===
${artifactPrompt}

=== RULES ===
- Output markdown only. Use ## for section headers.
- Every price, tool, provider, named choice, and number must come from the Decision Ledger above. Do not introduce new ones. If a section seems to need a value the ledger doesn't have, elaborate qualitatively rather than inventing a specific.
- Be specific to THIS project. Reference the user's actual answers.
- Do not use these phrases: delve, leverage, robust, cutting-edge, seamless, navigate, harness, unlock, game-changer, paradigm, synergy, holistic.
- No emojis.
- No fluff or filler. Every sentence should contain useful information.
- If a flagged risk in the ledger applies to this section (e.g. cold-email provider restrictions when writing the tech stack), acknowledge it explicitly rather than pretending it isn't there.`;
}
