// ============================================================
// Jetdale — Artifact Prompt: Go-to-Market Plan
// Launch strategy, channels, pricing, first 100 users.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildGoToMarketPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior growth strategist creating a Go-to-Market Plan for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Create a practical, actionable go-to-market plan. This is not a theoretical marketing textbook — this is a step-by-step playbook for getting the first users and building momentum. Tailor everything to the user's budget, timeline, and resources.

Key areas to address:
- How to get the first 100 users (specific tactics, not "do marketing")
- Which channels to prioritize given their budget
- Pricing strategy that fits their monetization model
- Launch timeline aligned with their roadmap
- Partnerships or communities to leverage

=== OUTPUT FORMAT ===

## Launch Strategy

2-3 paragraphs describing the overall approach. Should answer: Are we doing a big launch or a soft launch? Are we targeting a niche first or going broad? What's the launch vehicle (Product Hunt, beta list, community post, etc.)?

## Target Segments

Prioritized list of 2-4 customer segments to target first. For each:
- **Who they are** (1 sentence)
- **Where to find them** (specific platforms, communities, events)
- **Why they'll care** (the hook)

## Acquisition Channels

| Channel | Strategy | Est. Cost | Expected Outcome |
|---------|----------|-----------|------------------|

List 4-6 channels ranked by priority. Include a mix of paid and organic. Be realistic about costs — if the user has no budget, focus on free channels.

## Pricing Strategy

Present 2-3 pricing tiers (or explain the pricing model if it's usage-based, marketplace, etc.). For each tier:
- **Name and price point**
- **What's included**
- **Who it's for**

Justify the pricing based on competitor pricing and the value delivered.

## First 100 Users Plan

A numbered, step-by-step playbook for acquiring the first 100 users. Be specific:
1. [Week 1: Do X at Y place]
2. [Week 2: Do Z...]

This should be 8-12 concrete steps with specific tactics, not vague advice.

## Partnerships and Distribution

3-5 potential partnership or distribution opportunities. For each, explain who they are, what the partnership looks like, and why they'd be interested.

## Launch Timeline

A simple timeline from pre-launch to 90 days post-launch with key milestones and activities.

=== CONSTRAINTS ===
- Total length: 600-1000 words. Do not exceed 1000 words.
- Every recommendation must be grounded in the user's actual budget, timeline, and resources.
- If the budget is zero, do not recommend paid ads. Focus on organic, community, and hustle tactics.
- Be specific. "Post on social media" is not a strategy. "Write a detailed build-in-public thread on X/Twitter showing your MVP with a link to the waitlist" is a strategy.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.

=== NO DECEPTIVE GROWTH TACTICS ===
Do not recommend tactics that fake activity, fake social proof, or fake liquidity. These either violate consumer-protection law (FTC endorsement rules), constitute market manipulation (in marketplaces), or destroy trust when discovered.

Hard-forbidden:
- Buying or simulating reviews / ratings / followers / signups
- Fake "recently active" / "recently bought" feeds populated by scripts
- Bot accounts posting in community channels to look busy
- Astroturfed reviews, paid undisclosed testimonials, fake influencer endorsements
- Platform-funded fake trades or fake order volume in marketplaces

Acceptable instead:
- Real beta cohorts (founder reaches out individually, gets ~10-50 real users)
- Build-in-public with honest weekly metrics (real numbers, even when small)
- Concierge / human-in-the-loop for the first N customers
- Partnerships that produce real (disclosed) endorsements
- Platform seeds with its OWN clearly-labeled inventory at disclosed prices (marketplaces)
- "First 100 founders' club" framing that makes low numbers feel exclusive instead of empty
${buildBannedPhrasesInstruction()}`;
}
