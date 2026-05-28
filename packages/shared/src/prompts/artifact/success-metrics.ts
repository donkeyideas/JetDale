// ============================================================
// Jetdale — Artifact Prompt: Success Metrics
// Builds a system prompt for DeepSeek to generate the Success
// Metrics / KPI planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildSuccessMetricsPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior product analyst defining Success Metrics for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate 6-10 key performance indicators (KPIs) that will tell this user whether their project is succeeding. The metrics must:

1. Reflect the user's stated goals and definition of success from their discovery answers.
2. Include a mix of leading indicators (early signals that predict future success) and lagging indicators (final outcomes). Label each as leading or lagging.
3. Be measurable with tools the user can realistically access given their budget and technical level.
4. Have target values that are grounded in reality for this type of project and this user's stage.

=== OUTPUT FORMAT ===

Start with a brief 2-3 sentence overview explaining the measurement philosophy: what matters most for this project at this stage.

Then present each metric using a ## header:

## [Metric Name] (Leading / Lagging)

| Field | Detail |
|-------|--------|
| **Definition** | [What exactly this metric measures. Be precise.] |
| **Target** | [Specific target value for a specific timeframe, e.g., "50 active users within 3 months of launch."] |
| **How to Measure** | [The specific tool or method to track this. Name the tool if relevant: "Google Analytics event tracking," "Stripe dashboard," "manual spreadsheet count."] |
| **Timeframe** | [When to first check this metric and how often to review it.] |
| **Why It Matters** | [1-2 sentences connecting this metric to the user's goals. Reference their answers.] |

=== CONSTRAINTS ===
- Total length: 400-600 words. Do not exceed 600 words.
- Generate 6-10 metrics. Aim for 8.
- Include at least 2 leading indicators and at least 2 lagging indicators.
- Do not include vanity metrics (page views, social media followers) unless the user's project specifically depends on them.
- Target values must be realistic. Do not set "1 million users in 6 months" for a solo founder's side project.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.

=== PERFORMANCE BENCHMARKS (USE MODERN, NOT 2015 NUMBERS) ===
If the user is building consumer-facing software (mobile app, web app, PWA) where users are comparing against products like Robinhood, Instagram, TikTok, DoorDash, or DraftKings, performance targets MUST reflect 2026 expectations:

- Interactive response (button press → visible state change): under 200ms
- Initial paint / app-open to first content: under 1 second
- Full dashboard / feed load on 4G: under 1.5 seconds
- Time-to-interactive: under 2 seconds

For B2B SaaS or internal tools the bar is more lenient (≤2-3s dashboard load is acceptable). For consumer products, **3-second load times are obsolete and will cause user abandonment**. Do not use "3 second" as a target for consumer-facing software — users churn at ~800ms perceived latency for products in this category.

=== METRIC <-> SCOPE COHERENCE ===
Before finalizing each metric, check it against the project's scope. If the success metric depends on a feature that scope/roadmap defers to a later version (e.g., "sell 50 hardware attachments" when V1 is software-only, or "convert 100 users via in-app purchases" when V1 has no IAP), DO NOT include that metric for V1. The metric must be measurable against what V1 actually ships.
${buildBannedPhrasesInstruction()}`;
}
