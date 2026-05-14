// ============================================================
// Jetdale — Artifact Prompt: Competitive Analysis
// SWOT analysis, feature comparison, market positioning.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildCompetitiveAnalysisPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior market strategist creating a Competitive Analysis for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Create a thorough competitive analysis. The user mentioned competitors or similar products in their discovery answers — analyze those specifically. If they didn't mention any, identify the 3-5 most relevant competitors based on the problem they're solving and the market they're entering.

For each competitor, research and document:
- What they do well (be honest — strong competitors exist for a reason)
- Where they fall short (real gaps, not made-up weaknesses)
- Their pricing model and market position
- How the user's project differs

Then create a SWOT analysis specific to the user's project in this competitive landscape.

=== OUTPUT FORMAT ===

Start with a 2-3 sentence market landscape overview.

## Competitor Analysis

For each competitor (3-6 competitors):

### [Competitor Name]

| Field | Detail |
|-------|--------|
| **What they do** | [1-2 sentence description] |
| **Strengths** | [2-3 bullet points] |
| **Weaknesses** | [2-3 bullet points] |
| **Pricing** | [Their pricing model] |
| **Market position** | [Leader / Challenger / Niche / Emerging] |

## Feature Comparison

Create a comparison table with the user's product and top 3 competitors as columns. Rows should be 6-10 key features. Use "Yes", "No", "Partial", or "Planned" as values.

| Feature | [User's Product] | [Competitor 1] | [Competitor 2] | [Competitor 3] |
|---------|-----------------|----------------|----------------|----------------|

## SWOT Analysis

### Strengths
- [2-4 bullet points about the user's project advantages]

### Weaknesses
- [2-4 bullet points — be honest about gaps]

### Opportunities
- [2-4 bullet points about market gaps to exploit]

### Threats
- [2-4 bullet points about external risks from competition]

## Positioning Statement

One paragraph describing how the user's product should position itself relative to the competition. Be specific — "we're the affordable alternative to X for Y audience" not "we're different."

## Key Differentiators

3-5 bullet points listing the concrete reasons someone would choose this product over alternatives.

=== CONSTRAINTS ===
- Total length: 600-1000 words. Do not exceed 1000 words.
- Analyze 3-6 competitors. Prefer real, named products when possible.
- Be honest about competitor strengths. Dismissing strong competitors undermines credibility.
- The SWOT must be specific to this project, not a generic template.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
