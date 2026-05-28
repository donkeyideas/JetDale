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

=== LEGAL & REGULATORY AWARENESS (IMPORTANT) ===
If the project touches any of the patterns below, the Legal category must include a specific line item AND a one-sentence note in the budget summary flagging the risk. Do not stay silent on these:

- **Taking a "rake" or "house fee" from a pool of staked assets / tokens / money where the outcome is uncertain** (eco-pools, prediction markets, betting pools, fantasy contests, raffles) = in most US states this is unlicensed gambling. Recommend monetization shifts: flat platform entry fees, marketplace transaction fees, or subscription instead. Budget $15-50K for gambling-law counsel if the founder insists on a rake model.
- **Bot-generated transactions, fake order volume, simulated liquidity, or platform-funded "demo" trades inside a real-asset marketplace** = wash trading / market manipulation in most jurisdictions (securities, commodities, and many state consumer-protection statutes). Recommend instead: seed liquidity with platform-owned inventory listed at clearly disclosed prices, or design the marketplace so it scales with real user supply/demand and explicitly markets itself as "low liquidity at launch." Budget $10-30K for securities/commodities counsel if the founder insists on bot-driven volume.
- **Tokens, points, or credits with a hardcoded fiat-equivalent value that users can earn through activity and transfer or withdraw** = payment instrument under FinCEN; likely a security under the Howey test if returns are expected. Recommend instead: treat the token as an unpriced "points" balance for V1 with an informational fiat-equivalent display (e.g., "you've saved an estimated $X based on average rates") that the user cannot cash out. Defer real cashout until the company can afford counsel and licensing.
- **Custodial handling of user money** (escrow, wallets, payouts, withdrawals to fiat) = FinCEN Money Services Business registration + state-by-state money transmitter licensing. Roughly $5-30K per state for licensing alone; many states are 6+ months. Recommend non-custodial architecture for V1 if budget can't cover this.
- **Crypto / token issuance** = securities law exposure (Howey test). Budget $20-75K for SEC counsel before launch.
- **Age-restricted content** (gambling, alcohol, adult, certain crypto products) = identity verification vendor (Jumio, Persona, Stripe Identity): budget ~$1-3 per verification.
- **Health data** = HIPAA / state-equivalent. Budget for BAA-capable infrastructure (~30-50% premium on hosting) + privacy counsel.
- **Children under 13** = COPPA. Budget legal review + verifiable parental consent flow.
- **EU users** = GDPR. Budget privacy counsel + DPA-friendly infrastructure.

When in doubt, include a "regulatory contingency" line item separate from the standard 10-20% contingency. Founders skipping these costs are not saving money; they are deferring the bill to enforcement or shutdown.

=== BUDGET <-> SCOPE COHERENCE ===
Do not budget for features that scope/roadmap have deferred to a later version. If V1 is software-only, do not include a hardware manufacturing line item. If V1 is a PWA, do not budget for native iOS/Android store fees. Match this budget to what V1 actually ships, not the long-term product vision.
${buildBannedPhrasesInstruction()}`;
}
