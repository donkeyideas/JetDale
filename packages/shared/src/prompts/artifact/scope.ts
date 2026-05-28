// ============================================================
// Jetdale — Artifact Prompt: Scope
// Builds a system prompt for DeepSeek to generate the Scope
// planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildScopePrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior product manager writing a Scope document for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate a Scope artifact based on the discovery answers above. Ground every feature and story in what the user actually described. Do not add features they never mentioned unless they are a direct technical prerequisite of something they did mention (and if so, label it clearly as an inferred requirement).

=== OUTPUT FORMAT ===

Produce markdown with exactly these three sections, each starting with a ## header:

## MVP Features

Organize features using MoSCoW prioritization. Use ### sub-headers for each category:

### Must Have
Features the product cannot launch without. These are the core actions the user described. List 3-7 items. Each item: a short feature name in bold, followed by a one-sentence description.

### Should Have
Features that are important but the product could technically launch without for the very first release. List 2-5 items, same format.

### Could Have
Nice-to-have features the user mentioned or that would clearly improve the product, but can wait. List 2-4 items, same format.

### Won't Have (V1)
Features explicitly out of scope for the first version. This protects the user from scope creep. If the user mentioned future plans or things they want "eventually," put them here. List 2-4 items, same format.

## User Stories

Write 3-5 user stories in this exact format:

- As a [specific user type], I want [specific goal], so that [concrete reason].

Each story should map to a Must Have or Should Have feature. Use the user types the user actually described, not generic placeholders. After each story, add one sentence of context explaining which discovery answer it ties to.

## Acceptance Criteria

For each Must Have feature, write 2-3 acceptance criteria that define "done." Use checkbox format:

**[Feature Name]**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

Criteria must be testable. "Works well" is not testable. "User can create an account with email and password in under 30 seconds" is testable.

Criteria must also be DEFENSIBLE against real-world bounds. If a criterion involves a numeric range, rate, or threshold (input limits, daily caps, response times, payout amounts), the chosen number must reflect typical real-world usage — not an arbitrary round number. State the basis briefly inline. Examples:

- BAD: "User can enter kWh saved between 0.01 and 1000 per submission." (1000 kWh is a month of household power — a single entry instantly mints absurd value.)
- GOOD: "User can enter kWh saved between 0.01 and 8.0 per submission, capped at 3 entries per day. (Basis: a single appliance optimization typically saves under 5 kWh; 8.0 is a 60% safety margin; 3/day fits realistic logging behavior.)"
- BAD: "Response time under 5 seconds." (Vague and obsolete; modern consumer apps target 200ms-1s.)
- GOOD: "P95 button-press to visible response under 200ms; full data load under 1s on 4G."

Any criterion involving real money, points/tokens, or any quantity that compounds across users must explicitly cap maximum per-action and per-day rates, or it will be exploitable on day one.

=== CONSTRAINTS ===
- Total length: 600-1000 words. Do not exceed 1000 words.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- No filler. Every feature must trace back to the user's answers or be labeled as an inferred prerequisite.
- Be ruthless about what goes in Must Have vs. later categories. First-time builders almost always over-scope their MVP.
- Write in a calm, direct, professional tone.

=== HIDDEN-COMPLEXITY FLAGS ===
Some features sound simple in one sentence but require infrastructure that breaks short timelines. If any of the following appear in a Must Have or Should Have, add a one-line "Complexity flag:" note under the feature:

- Real-money handling, wallets, payouts, custodial accounts → triggers MSB / state money-transmitter licensing (months of legal lift)
- Cryptocurrency, tokens with off-platform transferability, on-chain ownership → smart-contract development + security audit (~3-6 months minimum)
- Marketplace with real-asset trading → KYC + market-making infrastructure + regulatory review
- Age verification, identity verification, biometrics → vendor integration + compliance
- Health data, children-under-13 data, EU user data → HIPAA / COPPA / GDPR compliance
- "AI matching" or "ML recommendations" requiring real training data → data pipeline + model training + ongoing tuning
- Native iOS / Android apps → app-store review cycles (1-3 weeks per submission)
- "Bot" or "automated activity" in a real-asset marketplace → wash-trading / market manipulation risk; this should almost certainly be Won't Have V1

Mark these as Could Have or Won't Have V1 by default unless the user explicitly said they have the time, budget, or team to absorb the lift.

=== SCOPE <-> TIMELINE COHERENCE ===
Every Must Have feature must be buildable within the timeline the user described. If a feature requires infrastructure (real blockchain, custodial banking, app store review) that takes longer than the stated timeline, move it to Won't Have V1 with a note explaining why, and propose a V1-feasible alternative in its place (e.g., "in-memory points instead of crypto tokens for V1; migrate to chain in V2").
${buildBannedPhrasesInstruction()}`;
}
