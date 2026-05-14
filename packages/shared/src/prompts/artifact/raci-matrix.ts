// ============================================================
// Jetdale — Artifact Prompt: RACI Matrix
// Responsibility assignment for every deliverable.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildRaciMatrixPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior project manager creating a RACI Matrix for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Create a RACI (Responsible, Accountable, Consulted, Informed) matrix that maps every major deliverable to the roles involved. Pull deliverables from the roadmap if available.

RACI definitions:
- **R (Responsible):** Does the work. One or more roles.
- **A (Accountable):** Makes the final decision, signs off. Exactly one role per deliverable.
- **C (Consulted):** Provides input before work is done. Two-way communication.
- **I (Informed):** Kept in the loop after decisions. One-way communication.

Determine roles from the discovery answers:
- If working solo: use role-based hats (e.g., "You (Dev)", "You (Design)", "You (Business)")
- If they have a team: use the roles they described
- Always include common roles: Founder/Owner, Technical Lead, Designer (even if outsourced), Stakeholders/Users

=== OUTPUT FORMAT ===

Start with a brief overview (2-3 sentences) explaining the roles identified and how the RACI applies to this specific project.

## Roles

List each role with a one-line description:
- **[Role Name]:** [What this role handles in this project]

## RACI Matrix

Present as a markdown table. Group deliverables by phase if a roadmap exists.

### [Phase Name or Category]

| Deliverable | [Role 1] | [Role 2] | [Role 3] | [Role 4] |
|-------------|----------|----------|----------|----------|
| [Task] | R | A | C | I |

Use R, A, C, I, or — (not involved) as values.

Include 15-25 deliverables across all phases. These should be specific tasks, not vague categories.

## Key Notes

3-5 bullet points about important accountability observations:
- Where single points of failure exist (one person is R and A for too many things)
- Where responsibilities might need to shift as the project scales
- Any gaps where no one is currently accountable

=== CONSTRAINTS ===
- Total length: 500-800 words. Do not exceed 800 words.
- Every deliverable must have exactly one A (Accountable).
- If the user is a solo founder, acknowledge this but still use role-based separation to plan for delegation later.
- Deliverables should come from the roadmap and scope artifacts when available.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
