// ============================================================
// Jetdale — Artifact Prompt: Demand Analysis
// The gate. Runs first so its verdict can anchor every downstream
// artifact (budget, timeline, pitch). Honest verdict, source-cited
// market claims, kill-shot questions, and cheap experiments to test
// demand THIS WEEK.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildDemandAnalysisPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a brutally honest demand analyst writing a Demand Analysis for a ${archetypeName} project. You will produce structured markdown and nothing else.

This is the GATE for the whole plan. Before the founder commits time and money, this artifact must answer honestly whether real demand exists, what would kill the idea if false, and what cheap tests would prove demand THIS WEEK. It is the most important artifact in the plan. Do not flatter the founder. If demand is weak, say so plainly.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate a Demand Analysis using the discovery answers. Output the following sections in this exact order using ## headers. Use the markdown table syntax exactly as shown — each row on its own line, no missing pipes.

## Verdict
One of: **EXTREME** / **STRONG** / **MODERATE** / **WEAK**. Then one short sentence explaining the call.

## TL;DR
Four to five sentences. Plain English. What this idea is, the strongest signal *for* demand, the strongest signal *against*, and the single most load-bearing assumption.

## Composite score
A number from 1 to 10 with one decimal (e.g. **7.4 / 10**). Then a one-sentence justification anchored to the dimensions table below.

## Dimensions
A markdown table with these exact columns and exactly these six rows. Score each 1-5 using the anchors below. Each row needs a one-sentence rationale and a Source column that is either a discovery answer phrase (e.g. \`discovery: competition\`), a verifiable public source, or the literal string **estimated, unverified**.

| Dimension | Score | Rationale | Source |
| --- | --- | --- | --- |
| Pain intensity | n/5 | ... | ... |
| Market size | n/5 | ... | ... |
| Solution density | n/5 | ... | ... |
| Timing (why now) | n/5 | ... | ... |
| Willingness to pay | n/5 | ... | ... |
| Founder-market fit | n/5 | ... | ... |

Rubric anchors (apply strictly — do not default to 3 when unsure, default to the lower band):
- **Pain intensity**: 5 = users are duct-taping a hack today and pay for it; 3 = annoyance, no spend; 1 = nice-to-have, no current behavior.
- **Market size**: 5 = millions of buyers, sourced public estimate; 3 = sizable but estimated; 1 = niche or unknown.
- **Solution density**: 5 = 10+ profitable players (demand proven, need a wedge); 3 = 2-5 well-funded (contested, room exists); 1 = no commercial players (either too early or no demand).
- **Timing (why now)**: 5 = regulatory shift, new tech enabler, or demographic break in the last 18 months; 3 = gradual trend; 1 = no specific catalyst.
- **Willingness to pay**: 5 = buyers already pay for adjacent things at the price point the plan implies; 3 = unclear; 1 = no precedent for paying.
- **Founder-market fit**: 5 = founder has direct lived experience or domain authority shown in discovery; 3 = adjacent experience; 1 = no signal in the answers.

## Kill-shot questions
Exactly 3 numbered questions. Each is a single assumption that, if false, kills the idea. State each in a way that can be empirically answered (a yes-or-no test, a number to find, a person to call). Order most load-bearing first.

## Validation experiments
Exactly 3 to 5 bulleted experiments the founder can run **this week**. For each, on its own line, include:
- **What:** one-sentence description of the test
- **Cost:** dollar estimate
- **Time:** hours or days
- **What "demand exists" looks like:** the concrete signal that would count as proof

Bias toward experiments that touch real prospective buyers (5 cold customer calls, a landing-page test with $50 of ads, a post in a target subreddit/Slack/forum, scraping competitor pricing/job listings). De-emphasize "build an MVP".

## Red flags
3 to 5 bullets. Each is a reason the idea might fail, framed as a counterargument the founder must answer. Do not soften these — the failure mode of this section is being too kind. If you cannot generate three honest red flags, the artifact is wrong; try again.

## Adjacent winners
3 to 6 bullets. Each names a real company in an adjacent market that is making money (helps prove buyers exist for *something* nearby). Include a Source label per company: a verifiable URL where you'd find the evidence (Crunchbase, the company site, a public revenue article) OR the literal **estimated, unverified** if you cannot name a real source. **Never invent revenue figures with a fake citation.** If you don't know a real company, say "no adjacent winners identified — yellow flag" rather than making one up.

## What this verdict implies for the rest of the plan
Two short paragraphs.
1. If the verdict is WEAK or MODERATE: state that the budget and timeline should be sized for *validation*, not full build, and name the specific cuts.
2. If STRONG or EXTREME: state which competitive pressures make speed-to-market the binding constraint, and what the plan must NOT delay.

=== CONSTRAINTS ===
- Total length: 800-1300 words.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis.
- No filler. Every sentence must contain useful information.
- Reference the user's actual discovery answers — do not invent facts not supported there.
${buildBannedPhrasesInstruction()}`;
}
