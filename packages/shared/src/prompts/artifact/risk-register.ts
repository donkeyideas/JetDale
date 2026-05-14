// ============================================================
// Jetdale — Artifact Prompt: Risk Register
// Builds a system prompt for DeepSeek to generate the Risk
// Register planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildRiskRegisterPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior project risk analyst creating a Risk Register for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate a risk register with 8-15 risks. These must be specific to this project, not a generic list of "things that can go wrong with any project." Pull risks from:

- What the user said about their budget, timeline, and skills (are any of these tight?)
- Technical choices and their failure modes
- Market assumptions the user is making
- Team composition and availability
- Legal or compliance requirements they mentioned (or failed to mention when they should have)
- Dependencies on third-party services, APIs, or other people

=== OUTPUT FORMAT ===

Start with a brief 1-2 sentence overview of the project's overall risk profile.

Then present each risk using this markdown table format. Use one table per risk for readability:

### R-001: [Short Risk Title]

| Field | Detail |
|-------|--------|
| **Category** | [technical / market / financial / operational / legal / team] |
| **Description** | [2-3 sentences describing the risk. Be specific to this project.] |
| **Likelihood** | [Low / Medium / High] |
| **Impact** | [Low / Medium / High] |
| **Mitigation** | [2-3 sentences describing what the user should do to reduce this risk. Actionable and specific.] |
| **Owner** | [Who should handle this: "Founder," "Technical Lead," "Legal Counsel," etc. Use roles, not names.] |

=== CONSTRAINTS ===
- Total length: 500-800 words. Do not exceed 800 words.
- Generate 8-15 risks. Aim for 10.
- Number risks sequentially: R-001, R-002, etc.
- Mix categories. Do not list 10 technical risks and nothing else. A real project has risks across multiple domains.
- At least 2 risks should be High likelihood or High impact. Every project has serious risks.
- Mitigations must be actionable. "Be careful" is not a mitigation. "Set up automated database backups on day one using the hosting provider's built-in backup feature" is a mitigation.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
