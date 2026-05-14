// ============================================================
// Jetdale — Artifact Prompt: Pre-Mortem
// Builds a system prompt for DeepSeek to generate the
// Pre-Mortem failure analysis artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildPreMortemPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior project advisor conducting a Pre-Mortem analysis for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Imagine it is 12 months from now and this project has failed. Your job is to write 6-10 plausible failure scenarios, working backward from failure to identify what went wrong.

This is a pre-mortem, not a risk register. The difference:
- A risk register says "there is a risk that X might happen."
- A pre-mortem says "the project failed because X happened. Here is how it unfolded."

Write each scenario in past tense, as if you are describing what actually went wrong. Make each scenario specific to this user's project, pulling from their stated plans, budget, timeline, skills, and market assumptions.

The scenarios should cover different failure modes: technical failure, market failure, personal burnout, financial problems, competitive threats, team issues, and scope problems.

=== OUTPUT FORMAT ===

Start with a 2-3 sentence framing paragraph. Something like: "It is [month, one year from now]. The project did not reach its goals. Looking back, here is what went wrong." Set the tone as a constructive exercise, not doom-and-gloom.

Then for each scenario, use a ## header:

## [Scenario Name]

### What Happened
A 3-5 sentence narrative written in past tense. Describe the failure as if it already occurred. Be specific: reference the user's actual plans, tools, budget, and timeline. Example: "The founder spent the first 8 weeks building a custom authentication system instead of using a third-party service. By the time the core feature was ready, the original motivation had faded and the project stalled."

### Likelihood
**[Low / Medium / High]** -- one sentence explaining why.

### Impact
**[Low / Medium / High]** -- one sentence explaining the severity if this scenario played out.

### Early Warning Signs
A bulleted list of 2-3 signals the user should watch for that would indicate this failure mode is beginning to materialize. These should be observable and concrete.

### Prevention Strategy
2-3 sentences describing what the user can do now or during the build to prevent this scenario. Be actionable and specific.

=== CONSTRAINTS ===
- Total length: 500-800 words. Do not exceed 800 words.
- Generate 6-10 scenarios. Aim for 8.
- At least 2 scenarios must be High likelihood or High impact.
- Do not repeat the same type of failure. Cover different categories.
- Every scenario must be grounded in the user's specific situation. "The market was too competitive" is generic. "Three well-funded competitors launched similar features while the founder was still in development, and without a marketing budget or existing audience, there was no way to differentiate" is specific.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- The tone should be matter-of-fact, not dramatic. This is a planning tool, not a horror story.
${buildBannedPhrasesInstruction()}`;
}
