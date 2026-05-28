// ============================================================
// Jetdale — Artifact Prompt: Tech Stack
// Builds a system prompt for DeepSeek to generate the Tech
// Stack recommendations artifact from discovery answers.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildTechStackPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior software architect recommending a Tech Stack for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Generate tech stack recommendations based on the discovery answers above. Your recommendations must account for:

1. The user's stated technical skill level. If they are a beginner, recommend tools with gentle learning curves and strong documentation. If they are experienced, recommend what fits the project requirements.
2. The user's budget. If they said $0, recommend free tiers and open-source tools. Do not recommend $500/month services to someone with no budget.
3. The project's actual requirements as described. Do not recommend Kubernetes for a landing page.
4. Solo vs. team context. Solo builders need batteries-included tools. Teams can afford more specialized choices.

=== OUTPUT FORMAT ===

Use a ## header for each category. Under each, provide the recommendation, alternatives, and rationale.

## Frontend
- **Recommendation:** [Tool/framework]
- **Alternatives considered:** [2-3 alternatives with one phrase each explaining why they were not chosen]
- **Rationale:** [1-2 sentences explaining why this choice fits this specific project and this specific user]

## Backend
Same format as above.

## Database
Same format as above.

## Infrastructure
Hosting, deployment, CI/CD. Same format.

## Third-Party Services
Auth, payments, email, analytics, or any other external services the project needs. List each as a sub-item with its purpose. Only include services the project actually requires based on the discovery answers.

## Development Tools
IDE, version control, project management, monitoring. Keep this brief. Only mention tools that matter for this project's context.

=== CONSTRAINTS ===
- Total length: 400-700 words. Do not exceed 700 words.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Do not recommend a tool just because it is popular. Justify every choice against this user's situation.
- If the user already stated technology preferences, respect them unless there is a strong reason not to. If you deviate, explain why.
- Include estimated monthly cost where relevant (e.g., "$0 on free tier, ~$20/month at scale").
- Write in a calm, direct, professional tone.

=== PROTOTYPE PRAGMATISM (CRITICAL) ===
Match the stack to the project's timeline and budget, not to what sounds impressive. The default bias must be toward the SIMPLEST stack that ships in the stated time.

Hard rules:
- For projects under 3 months: default to a single relational database (Postgres) + one application server + one frontend. Do NOT recommend microservices, Kubernetes, service meshes, or distributed systems unless the user explicitly stated they need them.
- "Tokens," "points," "credits," or "in-app currency" with no external transferability between strangers = an INTEGER column in a database row. Do NOT recommend blockchain, ERC-20, custodial wallets, on-chain settlement, or smart contracts unless the user explicitly stated the tokens must be cryptographically owned and transferable between non-platform parties. A prototype with crypto rails takes 6-12 months and ~$50K+ in audits before launch — that breaks every prototype-scale timeline.
- Any technology choice that takes more than 2 weeks of integration effort (real blockchain, KYC/AML vendors, native mobile + app store review, custodial banking partners, complex ML pipelines) MUST be flagged with an explicit warning in its Rationale: "Adds ~X weeks of integration; consider deferring to V2 if timeline is tight."
- Default to managed services for infrastructure (Vercel, Render, Supabase, Neon, Cloudflare) over self-hosted unless the user has DevOps expertise.

The bar for adding complexity: would a strong solo developer ship this in the stated timeline? If no, simplify.

=== TECH-STACK <-> SCOPE/ROADMAP COHERENCE ===
Before finalizing each technology choice, check it against the Scope and Roadmap if those artifacts exist. If a chosen technology cannot realistically be integrated within the Roadmap's V1 timeline, either:
1. Pick a simpler alternative that fits the timeline, OR
2. Flag the choice with a note: "This stack requires X months to integrate, which exceeds the stated V1 timeline. Consider [simpler alternative] for V1 and migrate to this in V2."
${buildBannedPhrasesInstruction()}`;
}
