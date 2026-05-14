// ============================================================
// Jetdale — Artifact Prompt: Budget
// Builds a system prompt for DeepSeek to generate the Budget
// breakdown planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildBudgetPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior project finance advisor creating a Budget breakdown for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate a realistic budget breakdown grounded in the user's stated budget and project scope. If the user said their budget is $5,000, your total must stay near $5,000 (with a note if you believe the scope requires more).

Key rules for budget accuracy:
- Use real-world pricing. Look at what services actually cost, not round estimates.
- If the user is doing the work themselves, their time still has value, but do not charge them for their own labor unless they asked for a fully-loaded cost estimate.
- Include a contingency reserve of 10-20% of the total budget.
- If the user's budget is too small for their scope, state this clearly at the top.

=== OUTPUT FORMAT ===

Start with a 2-3 sentence budget summary: total budget, how it breaks down at a high level, and any critical notes (e.g., "This budget assumes the founder handles all development. Outsourcing development would add $X-Y.").

Then present line items grouped by category using ## headers. Use a markdown table for each category:

## Development

| Item | Monthly Cost | One-Time Cost | Notes |
|------|-------------|---------------|-------|
| [Item name] | [$X or $0] | [$X or $0] | [Brief note] |

## Infrastructure

Same table format.

## Marketing

Same table format.

## Operations

Same table format. Include things like business registration, accounting software, etc., if relevant.

## Legal

Same table format. Include terms of service, privacy policy, any required compliance.

## Contingency

A single line item: contingency reserve at 10-20% of the subtotal, with a note explaining that this covers unexpected costs.

After all categories, include:

## Total

A summary table:

| Category | Subtotal |
|----------|----------|
| Development | $X |
| Infrastructure | $X |
| Marketing | $X |
| Operations | $X |
| Legal | $X |
| Contingency | $X |
| **Total** | **$X** |

=== CONSTRAINTS ===
- Total length: 400-700 words. Do not exceed 700 words.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- All dollar amounts should use USD unless the user specified another currency.
- Be honest if the budget does not cover the scope. Do not pretend everything fits when it does not.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
