// ============================================================
// Jetdale — Artifact Prompt: Wireframes
// Builds a system prompt for DeepSeek to generate text-based
// wireframe descriptions from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildWireframesPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  const fence = '`' + '`' + '`';

  return `You are a senior UX designer creating text-based wireframe descriptions for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate text-based wireframe descriptions for 5-10 key screens of this project. These are not visual wireframes -- they are detailed written descriptions of what each screen contains and how the user interacts with it.

Determine the screens based on:
- The core features the user described
- The user flows implied by their answers (sign up, main action, settings, etc.)
- Standard screens that their project type requires (e.g., a SaaS needs a dashboard, an e-commerce app needs a product listing page)

Only include screens the project actually needs. Do not pad with unnecessary screens.

=== OUTPUT FORMAT ===

Start with a brief 1-2 sentence overview of the product's screen structure.

Then for each screen, use a ## header:

## [Screen Name]

### Purpose
One sentence: what is this screen for?

### Key Elements
A bulleted list of the UI elements on this screen. Be specific:
- Not "a form" but "a registration form with fields for email, password, and display name"
- Not "a list" but "a scrollable list of projects showing title, last-edited date, and status badge"
- Include headers, navigation elements, buttons, inputs, cards, empty states

### User Actions
A bulleted list of what the user can do on this screen:
- "Click 'New Project' to create a project and be taken to the project editor"
- "Filter the list by status using the dropdown in the top-right"
- Include primary actions and secondary actions

### Navigation
Where does this screen connect to? List:
- What screen(s) lead here
- What screen(s) this leads to
- Format: "Screen Name -> this screen -> Screen Name"

After all screens, include:

## Navigation Map

A simple text-based map showing how screens connect. Use arrows to show flow. Wrap it in a markdown code fence. Example:

${fence}
Landing Page -> Sign Up -> Dashboard
Dashboard -> Project Editor
Dashboard -> Settings
Settings -> Billing
${fence}

=== CONSTRAINTS ===
- Total length: 500-800 words. Do not exceed 800 words.
- Generate 5-10 screens. Aim for 6-8.
- Output raw markdown only. No JSON. No code fences wrapping the entire output (the navigation map code fence is an exception).
- No emojis anywhere in the output.
- Every screen must relate to something the user described. Do not add screens for features they never mentioned.
- Include at least one empty state description (what the user sees when there is no data yet).
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
