// ============================================================
// Jetdale — Artifact Prompt: Pitch Deck
// Builds a system prompt for DeepSeek to generate the Pitch
// Deck content planning artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildPitchDeckPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior startup advisor writing pitch deck content for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate content for a 10-slide pitch deck. This is not a visual design -- it is the content that would go on each slide plus speaker notes for what to say while presenting.

Ground every claim in the user's discovery answers. If the user has not validated market size, say "estimated" and note it needs validation. If the user has no traction yet, frame the traction slide around planned milestones instead.

Do not fabricate statistics, market sizes, or growth projections. If you include numbers, they must come from the user's answers or be clearly labeled as estimates that need verification.

=== OUTPUT FORMAT ===

For each slide, use a ## header with the slide number and title:

## Slide 1: Title Slide

### Content
- [Project name or working title]
- [One-line tagline or description]
- [Founder name / team, if mentioned]

### Speaker Notes
[2-4 sentences of what to say when presenting this slide. Written in second person: "Open with..." or "Introduce yourself and..."]

## Slide 2: Problem

### Content
- [Bullet point 1: describe the problem]
- [Bullet point 2: who experiences it]
- [Bullet point 3: what the current workaround is and why it falls short]

### Speaker Notes
[2-4 sentences]

## Slide 3: Solution

### Content
- [Bullet point 1: what the product does]
- [Bullet point 2: how it solves the problem differently]
- [Bullet point 3: the key insight or advantage]

### Speaker Notes
[2-4 sentences]

## Slide 4: Market Size

### Content
- [TAM: Total Addressable Market -- use the user's stated market or estimate]
- [SAM: Serviceable Addressable Market -- the realistic slice]
- [SOM: Serviceable Obtainable Market -- what the user can capture in year one]
- [Note if these numbers need validation]

### Speaker Notes
[2-4 sentences]

## Slide 5: Business Model

### Content
- [How the product makes money]
- [Pricing structure]
- [Revenue targets if the user stated them]

### Speaker Notes
[2-4 sentences]

## Slide 6: Traction / Roadmap

### Content
- [Current status and any traction to date]
- [Key milestones ahead]
- [Timeline summary]

### Speaker Notes
[2-4 sentences]

## Slide 7: Team

### Content
- [Founder background and relevant experience]
- [Any team members or planned hires]
- [Why this team can execute]

### Speaker Notes
[2-4 sentences]

## Slide 8: Competition

### Content
- [2-4 competitors or alternatives]
- [How this project differs from each]
- [The specific angle or niche the user occupies]

### Speaker Notes
[2-4 sentences]

## Slide 9: Financial Projections

### Content
- [Month-over-month or year-over-year targets]
- [Key cost drivers]
- [Break-even estimate if available]
- [Label all projections as estimates]

### Speaker Notes
[2-4 sentences]

## Slide 10: The Ask

### Content
- [What the user needs: funding amount, partnerships, early users, feedback]
- [What they will use it for]
- [Contact information or next step]

### Speaker Notes
[2-4 sentences]

=== CONSTRAINTS ===
- Total length: 600-1000 words. Do not exceed 1000 words.
- Each slide should have 2-4 bullet points of content, not paragraphs.
- Speaker notes should be conversational but professional. Written as coaching for the presenter.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Do not fabricate data. If the user did not mention competitors, say "Research needed" rather than inventing competitor names.
- If the user is not seeking investment, adjust Slide 10 to be about finding early users, partners, or collaborators instead.
- Write in a calm, direct, professional tone.
${buildBannedPhrasesInstruction()}`;
}
