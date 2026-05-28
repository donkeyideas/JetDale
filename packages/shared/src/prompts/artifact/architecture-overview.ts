// ============================================================
// Jetdale — Artifact Prompt: Architecture Overview
// System design, data flow, API contracts, infrastructure.
// ============================================================

import { buildBannedPhrasesInstruction } from '../../quality/banned-phrases';

export interface ArtifactPromptOpts {
  archetypeName: string;
  discoveryAnswers: Array<{ questionText: string; answerText: string }>;
  existingArtifacts?: Array<{ type: string; contentMarkdown: string }>;
}

export function buildArchitectureOverviewPrompt(opts: ArtifactPromptOpts): string {
  const { archetypeName, discoveryAnswers, existingArtifacts } = opts;

  const answersBlock = discoveryAnswers
    .map((a) => `Q: ${a.questionText}\nA: ${a.answerText}`)
    .join('\n\n');

  const artifactsBlock = existingArtifacts?.length
    ? `\n=== EXISTING ARTIFACTS (for context only) ===\n${existingArtifacts.map((a) => `--- ${a.type.toUpperCase()} ---\n${a.contentMarkdown}`).join('\n\n')}\n`
    : '';

  return `You are a senior software architect creating an Architecture Overview for a ${archetypeName} project. You will produce structured markdown and nothing else.

=== DISCOVERY ANSWERS ===
${answersBlock}
${artifactsBlock}
=== YOUR TASK ===

Design the system architecture based on the tech stack and scope already defined. This document should give a developer everything they need to understand how the system fits together before writing code.

Cover:
- What the main components are and how they communicate
- Data flow through the system (user action → response)
- Core API endpoints
- Database schema overview
- Infrastructure and deployment approach
- How the system scales as usage grows

Use the tech stack artifact if available. If no specific technologies were chosen, recommend architecture patterns that fit the project's needs and the user's technical background.

=== OUTPUT FORMAT ===

## System Overview

2-3 paragraphs describing the architecture at a high level. Include the architectural pattern (monolith, microservices, serverless, JAMstack, etc.) and justify why it fits this project.

## Components

For each major system component:

### [Component Name]

| Field | Detail |
|-------|--------|
| **Type** | [Frontend / Backend / Database / Service / Infrastructure] |
| **Technology** | [Specific tech choice] |
| **Responsibility** | [What this component does] |
| **Communicates with** | [Other components it talks to] |

List 4-8 components depending on project complexity.

## Data Flow

Describe 2-3 key user flows showing how data moves through the system:

### [Flow Name] (e.g., "User Registration")
1. User does [action] in [frontend component]
2. [Frontend] sends [request type] to [backend endpoint]
3. [Backend] validates and stores in [database]
4. [Response] returned to [frontend]
5. [Frontend] updates [what the user sees]

## Core API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/... | ... | Yes/No |

List 8-15 core endpoints that cover the main functionality.

## Database Schema

Describe the 4-8 main tables/collections with their key fields and relationships. Use a simple format:

### [Table Name]
- **id** (primary key)
- **[field]** ([type]) — [purpose]
- Relates to: [other tables]

## Infrastructure

2-3 paragraphs covering:
- Where the app is hosted and why
- How deployments work (CI/CD approach)
- Environment setup (dev, staging, production)

## Scalability Considerations

3-5 bullet points about how the architecture handles growth:
- What breaks first at 1K, 10K, 100K users
- What to optimize or re-architect at each scale
- Caching strategy

=== CONSTRAINTS ===
- Total length: 700-1100 words. Do not exceed 1100 words.
- Architecture must match the tech stack artifact if one exists.
- If the user is non-technical, keep explanations clear and avoid unnecessary jargon.
- API endpoints should align with the scope and wireframes.
- Output raw markdown only. No JSON. No code fences wrapping the entire output.
- No emojis anywhere in the output.
- Write in a calm, direct, professional tone.

=== PERSONA PAIN MUST DRIVE ARCHITECTURE ===
If a Personas artifact exists, read it before designing the architecture. Every persona's stated frustration is a constraint the architecture must address — explicitly. Bury this and the design is "internally coherent but solves nothing the user came here to solve."

For each persona's frustration (especially anything tagged "Resolution requirement"), the architecture must:

1. Name the component, data flow, or design choice that addresses it. Example: persona pain = "timestamps drift across cabinet/EHR" → architecture decision = "ingestion middleware normalizes all incoming events to UTC via a vector-clock / Lamport offset calculated per device. Rule evaluation operates on the normalized stream only."
2. Reflect the constraint in the Data Flow, Components table, or Scalability section — not just mentioned in passing.
3. If a persona's frustration cannot be addressed within the current stack/budget/timeline, FLAG IT with a note: "Persona X's frustration with Y is not solvable in V1 with the chosen stack; recommend adding [component] in V2 or de-scoping the use case."

Architectures that silently ignore stated persona pain are wrong, even if they are technically sound.

=== DESIGN FOR CURRENT SCALE, NOT ASPIRATIONAL SCALE ===
The architecture must fit the V1 user count and timeline. Most projects launch with 0-100 users; design for that, with a clear path to scale, NOT for day-one scale.

Hard rules:
- Default architectural pattern for prototypes and early-stage products: monolith on a single managed service (Vercel/Render + Supabase/Neon, or equivalent). Do NOT recommend microservices, event-driven architectures, service meshes, message queues, or sharded databases unless the user has stated >10K concurrent users at launch.
- "Token," "points," "credits" without explicit cryptographic transferability requirements = an integer column on a user table updated by standard SQL. Do NOT design custodial wallet infrastructure, on-chain settlement, or smart-contract systems unless the user explicitly stated tokens must be cryptographically owned and transferable off-platform.
- Every component you add to the system must justify its existence in V1. If a component only matters at 10K+ users (Redis caching, CDN edge logic, queue workers, multi-region failover), put it in the "Scalability Considerations" section as a future migration — NOT in the V1 component list.
- The Scalability Considerations section should describe what to ADD LATER, not what to build now.

=== ARCHITECTURE <-> TIMELINE/BUDGET COHERENCE ===
Before including each component, check it against the Roadmap and Budget if those artifacts exist:
- If integrating the component takes longer than the Roadmap allows for the corresponding milestone, simplify it or move it to V2.
- If the Budget does not fund the recurring cost or the one-time setup of the component, either drop the component or call out the budget gap explicitly.
- If the component depends on Tech Stack choices not in the project's Tech Stack artifact, flag the mismatch — do not silently introduce new infrastructure.
${buildBannedPhrasesInstruction()}`;
}
