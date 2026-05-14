// ============================================================
// Jetdale — Artifact Prompt: Decision Log
// Builds a system prompt for DeepSeek to generate the Decision
// Log planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildDecisionLogPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior technical lead documenting key decisions for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate a decision log with 8-12 key decisions that have been made (or need to be made) during the discovery phase of this project. Extract decisions from:

1. Explicit choices the user stated in their discovery answers (e.g., "I want to use React" is a technology decision).
2. Implicit choices revealed by their answers (e.g., if they said "just me for now," that is a team structure decision).
3. Decisions reflected in the existing artifacts if provided (e.g., the scope artifact chose certain features over others).
4. Decisions the user should be aware they are making even if they did not frame them as decisions (e.g., choosing not to charge from day one is a monetization decision).

=== OUTPUT FORMAT ===

Start with a 1-2 sentence overview explaining that this log captures the key decisions made during discovery so the user can revisit them later if circumstances change.

Then for each decision, use a ## header:

## D-001: [Decision Topic]

| Field | Detail |
|-------|--------|
| **Context** | [2-3 sentences: why this decision matters for the project. What is at stake.] |
| **Options Considered** | See below |
| **Decision** | [The choice that was made or recommended, in one sentence.] |
| **Rationale** | [2-3 sentences: why this option was chosen over the alternatives. Reference the user's situation.] |
| **Date** | Discovery Phase |

**Options:**

1. **[Option A]** -- [1 sentence pro] / [1 sentence con]
2. **[Option B]** -- [1 sentence pro] / [1 sentence con]
3. **[Option C]** (if applicable) -- [1 sentence pro] / [1 sentence con]

=== CONSTRAINTS ===
- Total length: 500-800 words. Do not exceed 800 words.
- Generate 8-12 decisions. Aim for 10.
- Number decisions sequentially: D-001, D-002, etc.
- Mix decision types: include at least one each from technology, scope, audience, and business model categories.
- Each decision should have 2-3 options considered. Do not list only the chosen option.
- The "Date" field should always be "Discovery Phase" since these are pre-build decisions.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
