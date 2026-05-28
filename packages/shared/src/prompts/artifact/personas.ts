// ============================================================
// Jetdale — Artifact Prompt: Personas
// Builds a system prompt for DeepSeek to generate the User
// Personas planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildPersonasPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a UX researcher creating User Personas for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate 2-4 user personas based on the discovery answers above. Each persona must be grounded in what the user described about their target audience, their problem, and who would use the product. Do not invent persona types the user never mentioned or implied.

If the user described only one type of user, create 2 personas that represent different segments within that group (e.g., a power user vs. a casual user, or a new user vs. an experienced one). If the user described multiple user types, create one persona per type, up to 4.

=== OUTPUT FORMAT ===

For each persona, use a ## header with the persona's name and role. Then include these sub-sections using ### headers:

## [Fictional Name] — [Role or Title]

### Demographics
Age range, occupation, technical comfort level, and any relevant context. Keep it to 2-3 sentences. Base this on the user types described in the discovery answers.

### Goals
What does this persona want to accomplish? List 2-3 specific goals as bullet points. Tie them directly to the problem the user described.

### Frustrations
What problems does this persona currently face? List 2-3 specific frustrations as bullet points. These should reflect the gaps or failures in current solutions that the user identified.

### Jobs to Be Done
List 2-3 jobs in the format: "When [situation], I want to [motivation], so I can [expected outcome]."

### Behavioral Patterns
Describe 2-3 relevant behaviors: how they currently solve the problem, what tools they use, how often they encounter the issue, what their workflow looks like. Sentences, not bullets.

### Quote
A single fictional quote (in italics) that captures this persona's core frustration or desire. Make it sound like a real person talking, not marketing copy. One sentence.

=== CONSTRAINTS ===
- Total length: 400-700 words. Do not exceed 700 words.
- Generate 2-4 personas. Prefer 3 unless the project clearly calls for fewer or more.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- No generic personas. Every detail must connect to what the user described about their audience and problem.
- Names should be simple and realistic. No clever puns.
- Write in a calm, direct, professional tone.

=== CRITICAL: NO ANTI-PERSONAS ===
Every persona MUST be a plausible adopter of the product as described. They must actually want to use it.

Do NOT include "diversity" or "skeptic" personas who reject the product's core value proposition (e.g., a privacy-obsessed user for a social network, a gambling-averse user for a betting app, a Luddite for an AI tool). A persona who would not use this product is not a user — they are an objection, and they belong in the risk register, not here. Including them wastes the founder's design budget on features for someone who is never going to convert.

If the user described only one target adopter type, generate 2-3 variations within that type (power user vs casual, early adopter vs mainstream, individual vs team) — not opposites. If the user described conflicting adopter types, pick the most likely primary user and segment them; flag the conflict in the persona's notes rather than splitting into incompatible personas.
${buildBannedPhrasesInstruction()}`;
}
