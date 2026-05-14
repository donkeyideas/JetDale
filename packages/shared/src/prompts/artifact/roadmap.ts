// ============================================================
// Jetdale — Artifact Prompt: Roadmap
// Builds a system prompt for DeepSeek to generate the phased
// Roadmap planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildRoadmapPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior project planner writing a phased Roadmap for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate a phased roadmap with 3-5 phases. The roadmap must respect the user's stated timeline and available resources. If the user said they have 3 months, your phases must fit within 3 months. If they said they can work 10 hours per week, your deliverables must be realistic for that pace.

Look at the discovery answers carefully for:
- Their stated timeline or deadline
- How much time they can dedicate (full-time vs. part-time vs. side project)
- Their technical skill level (affects how fast they can build)
- Their budget (affects what can be outsourced vs. built)
- Whether they are working solo or with a team

=== OUTPUT FORMAT ===

Start with a brief 2-3 sentence overview paragraph that states the total timeline and any key assumptions about pace.

Then for each phase, use a ## header:

## Phase [N]: [Phase Name]

### Duration
State the duration in weeks or months. Be specific: "Weeks 1-3" not "About a month."

### Goals
2-3 bullet points describing what this phase aims to accomplish at a high level.

### Key Deliverables
3-6 bullet points listing the concrete things that will be built, configured, or completed in this phase. Be specific enough that someone could check them off.

### Dependencies
List what must be true before this phase can start. For Phase 1, list any prerequisites the user needs to have in place (accounts, tools, decisions). For later phases, reference earlier phase deliverables.

### Milestone
One sentence describing the specific, observable event that signals this phase is complete. "Users can sign up and complete one core workflow" not "Phase 2 is done."

=== CONSTRAINTS ===
- Total length: 500-900 words. Do not exceed 900 words.
- Generate 3-5 phases. Prefer 4 unless the project is very small (3) or very large (5).
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Phase 1 should always be the smallest viable step. Do not front-load everything.
- The final phase should include launch and initial feedback collection, not just building.
- If the user's timeline seems unrealistic for their scope, say so in the overview paragraph and present the roadmap you think is achievable.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
