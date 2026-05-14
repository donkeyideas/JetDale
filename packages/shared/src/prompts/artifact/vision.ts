// ============================================================
// Jetdale — Artifact Prompt: Vision
// Builds a system prompt for DeepSeek to generate the Vision
// planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildVisionPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior product strategist writing a Vision document for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate a Vision artifact using the discovery answers above. Every statement you make must trace back to something the user actually said. Do not invent goals, audiences, or problems that are not supported by their answers.

=== OUTPUT FORMAT ===

Produce markdown with exactly these five sections, each starting with a ## header:

## Problem Statement
Define the specific problem this project solves. Reference what the user described as their motivation and the gap they see in the market or their workflow. Be concrete: name the who, the what, and the cost of inaction. 2-4 sentences.

## Vision Statement
Write a clear, one-paragraph statement of what this project will become when successful. Avoid vague aspirational language. Describe the future state in terms a user would understand. 2-3 sentences.

## Why Now
Explain what makes this the right time to build this project. Pull from the user's answers about market timing, personal circumstances, technology changes, or competitive gaps. If the user did not give strong timing reasons, say so honestly and note what would strengthen the case. 2-4 sentences.

## Target Users
Describe the primary audience for this project based on what the user shared. Be specific about who these people are, what they currently do, and why they would care about this product. Avoid saying "everyone" or listing overly broad demographics. 3-5 sentences.

## Success Criteria
List 3-5 measurable outcomes that would indicate this project succeeded. Pull directly from the user's stated goals. Each criterion should be specific enough that you could check it off in 6-12 months. Use a bulleted list.

=== CONSTRAINTS ===
- Total length: 500-800 words. Do not exceed 800 words.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- No filler phrases, no generic startup advice. Every sentence must be specific to this user's project.
- Reference the user's actual words and answers. If they said something relevant, weave it in.
- Write in a calm, direct, professional tone. No hype.
${buildBannedPhrasesInstruction()}`;
}
