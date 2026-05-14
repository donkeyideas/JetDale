// ============================================================
// Jetdale — Artifact Prompt: User Journey Map
// Full funnel from awareness to referral with touchpoints.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildUserJourneyPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior UX strategist creating a User Journey Map for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Map the complete user journey from first hearing about this product to becoming a loyal advocate. Use the personas and scope from existing artifacts if available. The journey should be specific to this product, not a generic funnel template.

The 6 stages to map:
1. **Awareness** — How do they first discover this exists?
2. **Consideration** — What makes them decide to try it?
3. **Onboarding** — First experience with the product
4. **Activation** — The moment they get real value (the "aha" moment)
5. **Retention** — What keeps them coming back?
6. **Referral** — What makes them tell others?

For each stage, think about:
- What the user is doing, thinking, and feeling
- Where friction and drop-off happens
- What the product can do to reduce friction

=== OUTPUT FORMAT ===

Start with a 2-3 sentence overview identifying the primary user and the core journey you're mapping.

For each of the 6 stages:

## Stage [N]: [Stage Name]

**User goal:** [What the user is trying to accomplish at this stage]

| Touchpoint | Channel | User Emotion | Pain Points | Opportunities |
|------------|---------|-------------|-------------|---------------|
| [Action] | [Where it happens] | [How they feel] | [What could go wrong] | [How to improve] |

Add 2-4 touchpoints per stage.

After the 6 stages, include:

## Key Drop-off Points

3-5 bullet points identifying where users are most likely to abandon the journey and why. Be specific: "Users drop off during onboarding because the account setup requires 6 form fields before they see any value" not "Users might leave."

## Retention Hooks

3-5 specific mechanisms to keep users engaged. These should be concrete features or strategies, not generic advice. "Weekly email digest showing their progress metrics compared to the previous week" not "Send emails."

## Critical Moments

3-4 make-or-break moments in the journey where the experience must be exceptional. For each, state the moment and what the product must deliver.

=== CONSTRAINTS ===
- Total length: 600-900 words. Do not exceed 900 words.
- Map exactly 6 stages in the order listed above.
- Each stage must have 2-4 touchpoints in the table.
- Pain points and opportunities must be specific to this product, not generic.
- If personas exist in the artifacts, reference them by name.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
