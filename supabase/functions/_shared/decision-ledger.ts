// ============================================================
// Jetdale — Decision Ledger
//
// The single source of truth for cross-cutting facts in a plan
// (positioning, pricing, tech stack, providers, budget, timeline).
// Every artifact prompt receives the ledger verbatim; downstream
// sections may elaborate on a ledger entry but must never introduce
// a new price, tool, provider, or number that isn't in it.
//
// This module also bakes in a small catalog of *risky claims*
// (provider terms that ban common use cases, metrics whose stated
// data source can't actually produce them) and a set of deterministic
// post-checks that catch the loud failures (budget sums, undeclared
// tools, pricing drift) without paying for another LLM call.
// ============================================================

export interface PricingTier {
  name: string;
  price_cents: number;
  interval: 'monthly' | 'annual' | 'one-time' | 'per-unit';
}

export interface BudgetItem {
  name: string;
  cost_cents: number;
  recurring: boolean;
}

export interface Provider {
  name: string;
  purpose: string;
}

export interface RoadmapPhase {
  name: string;
  duration_weeks: number;
}

export interface DecisionLedger {
  positioning: string;
  target_segment: string;
  monetization: {
    model: 'subscription' | 'usage' | 'hybrid' | 'one-time' | 'free' | 'freemium';
    billing_unit: string;
  };
  pricing: { tiers: PricingTier[] };
  tech_stack: {
    frontend: string;
    backend: string;
    database: string;
    hosting: string;
    mobile?: string;
  };
  providers: Provider[];
  budget_total_cents: number;
  budget_items: BudgetItem[];
  timeline: { ship_date: string; phases: RoadmapPhase[] };
  team: Array<{ role: string; person: string }>;
  flagged_risks: string[];
}

// ============================================================
// Risky-claim catalog
//
// These are claims that have empirically broken plans in the past.
// Baked in here rather than asking the model to self-verify, because
// an LLM without a browse tool can't check provider terms — it will
// either invent reassurances or tag every claim [UNVERIFIED] until
// the tag becomes wallpaper. Lookups in this table are deterministic
// and surface in the ledger's `flagged_risks` field.
// ============================================================

export const COLD_EMAIL_BANNED_PROVIDERS = [
  'Postmark',
  'SendGrid',
  'Mailgun',
  'Resend',
  'Amazon SES',
  'AWS SES',
  'SES',
  'Brevo',
  'Sendinblue',
  'Mailjet',
  'SparkPost',
];

// Metrics that *can't* be produced from the obvious data source.
// Key = lowercase metric phrase; value = why and what's needed.
export const METRICS_REQUIRING_SPECIAL_SOURCE: Record<string, string> = {
  'inbox placement': 'Bounce/complaint webhooks cannot measure inbox placement. Requires Google Postmaster Tools or a paid deliverability platform (GlockApps, Mailtrap).',
  'deliverability score': 'Not derivable from sender-side webhooks. Requires Google Postmaster Tools or a paid deliverability platform.',
  'spam folder rate': 'Not exposed by transactional email providers. Requires seed-list testing.',
  'open rate': 'Apple Mail Privacy Protection (since 2021) preloads images for ~50% of recipients, making open-rate data unreliable as a behavioral signal.',
  'true reach': 'Platform "reach" numbers from social APIs are sampled estimates, not exact counts. Treat as directional only.',
  'true lifetime value': 'LTV cannot be computed for active customers (the lifetime isn\'t over). Cohort retention curves are the honest proxy.',
};

// Tools whose ToS explicitly forbid certain product categories.
export const PROVIDER_USE_RESTRICTIONS: Array<{
  provider: RegExp;
  forbidden: string;
  reason: string;
}> = [
  {
    provider: /\b(postmark|sendgrid|mailgun|resend|amazon ses|aws ses|brevo|sendinblue|mailjet|sparkpost)\b/i,
    forbidden: 'cold email|cold outreach|prospecting email|unsolicited email|email marketing to purchased lists',
    reason: 'Transactional email providers explicitly ban cold outreach. Accounts get suspended. Use a dedicated cold-email tool (Instantly, Smartlead, Lemlist) for cold outreach and a transactional provider only for triggered, consented mail.',
  },
  {
    provider: /\bopenai\b/i,
    forbidden: 'medical diagnosis|legal advice|automated weapons|surveillance',
    reason: 'OpenAI usage policies forbid these categories regardless of model. Even a "consult a professional" disclaimer is not a workaround.',
  },
  {
    provider: /\b(stripe|braintree|paypal)\b/i,
    forbidden: 'cannabis|firearms|adult content|crypto trading|gambling|forex',
    reason: 'Standard merchant accounts on these processors prohibit these categories. Requires a high-risk processor.',
  },
];

// ============================================================
// Ledger prompt — runs ONCE up front, before any narrative section.
// Output is enforced via JSON mode so downstream code can rely on
// the shape without a brittle parse pass.
// ============================================================

export function buildLedgerPrompt(
  archetypeSlug: string,
  projectName: string,
  discoverySummary: string,
): string {
  const riskySnippet = [
    `Known restrictions to apply automatically (do not relax):`,
    `- Transactional email providers ban cold outreach (${COLD_EMAIL_BANNED_PROVIDERS.join(', ')}). If the product is cold outreach, the ledger MUST pick a cold-email tool (Instantly, Smartlead, Lemlist, Apollo) — not a transactional provider — and flag it.`,
    `- Inbox-placement / deliverability metrics cannot be measured from sender-side webhooks alone. If the product claims them, flag the data-source gap.`,
    `- Apple Mail Privacy Protection has made open-rate >50% of mail unreliable since 2021. Don't treat open rate as a primary KPI.`,
    `- OpenAI policies forbid medical diagnosis, legal advice, weapons, surveillance.`,
    `- Stripe/Braintree/PayPal merchant accounts forbid cannabis, firearms, adult content, crypto trading, gambling, forex (need a high-risk processor).`,
  ].join('\n');

  return `You are building the Decision Ledger for the project "${projectName}" (archetype: ${archetypeSlug.replace('_', ' ')}).

The ledger is the single source of truth for cross-cutting decisions. Every downstream artifact (vision, scope, tech stack, budget, roadmap, pitch) will be generated against this ledger and may never introduce a price, tool, provider, or number that isn't here.

=== DISCOVERY ANSWERS ===
${discoverySummary}

=== RULES ===
- Pick exactly one option for every mutually exclusive choice. If the discovery answers leave a tradeoff genuinely open, recommend one and commit; do not leave both alive.
- Every number is final. The budget total must equal the sum of budget_items. Timeline phases must sum to a realistic schedule that fits the user's stated ship date.
- Use the discovery answers as the source. Do not invent specifics that aren't grounded there.
- ${riskySnippet}
- flagged_risks: list every risky-claim hit from the table above that applies to this project, in plain English. If none apply, return an empty array.

Return ONLY this JSON shape (no prose, no code fence):
{
  "positioning": "one-line differentiator",
  "target_segment": "one primary segment, defined precisely",
  "monetization": { "model": "subscription | usage | hybrid | one-time | free | freemium", "billing_unit": "what the user pays for" },
  "pricing": { "tiers": [{ "name": "Free|Pro|Team|...", "price_cents": 0, "interval": "monthly|annual|one-time|per-unit" }] },
  "tech_stack": { "frontend": "framework + language", "backend": "framework + language", "database": "engine + flavor", "hosting": "provider + plan", "mobile": "(optional)" },
  "providers": [{ "name": "Stripe", "purpose": "payments" }],
  "budget_total_cents": 0,
  "budget_items": [{ "name": "Development", "cost_cents": 0, "recurring": false }],
  "timeline": { "ship_date": "YYYY-MM-DD", "phases": [{ "name": "Discovery", "duration_weeks": 0 }] },
  "team": [{ "role": "Founder", "person": "Self" }],
  "flagged_risks": []
}`;
}

// ============================================================
// Ledger validation — runs on the AI's JSON response. Returns
// `null` if the shape is wrong; the caller retries or surfaces.
// Numbers are checked for self-consistency here so the ledger
// can't be "internally inconsistent" before artifacts even start.
// ============================================================

export interface LedgerValidationResult {
  ledger: DecisionLedger | null;
  errors: string[];
}

export function validateLedger(raw: unknown): LedgerValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { ledger: null, errors: ['Ledger is not an object'] };
  }
  const r = raw as Record<string, unknown>;

  const requireStr = (k: string) => {
    const v = r[k];
    if (typeof v !== 'string' || v.trim() === '') errors.push(`Missing or empty ${k}`);
  };
  const requireNum = (k: string) => {
    const v = r[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) errors.push(`Missing or non-numeric ${k}`);
  };

  requireStr('positioning');
  requireStr('target_segment');
  requireNum('budget_total_cents');

  if (!r.pricing || !Array.isArray((r.pricing as { tiers?: unknown }).tiers)) {
    errors.push('Missing pricing.tiers array');
  }
  if (!Array.isArray(r.providers)) errors.push('Missing providers array');
  if (!Array.isArray(r.budget_items)) errors.push('Missing budget_items array');
  if (!r.timeline || !Array.isArray((r.timeline as { phases?: unknown }).phases)) {
    errors.push('Missing timeline.phases array');
  }

  // Self-consistency: budget items must sum to budget total (within $1 rounding).
  if (Array.isArray(r.budget_items) && typeof r.budget_total_cents === 'number') {
    const sum = (r.budget_items as BudgetItem[]).reduce(
      (acc, it) => acc + (typeof it?.cost_cents === 'number' ? it.cost_cents : 0),
      0,
    );
    if (Math.abs(sum - r.budget_total_cents) > 100) {
      errors.push(
        `Budget sum mismatch: items total ${sum} cents but budget_total_cents is ${r.budget_total_cents}`,
      );
    }
  }

  if (errors.length > 0) return { ledger: null, errors };
  return { ledger: r as unknown as DecisionLedger, errors: [] };
}

// ============================================================
// Ledger → context block injected into every artifact prompt.
// Kept compact so it doesn't blow the context budget on flash.
// ============================================================

export function ledgerContextBlock(ledger: DecisionLedger): string {
  const pricing = ledger.pricing.tiers
    .map((t) => `${t.name}: $${(t.price_cents / 100).toFixed(2)}/${t.interval}`)
    .join('; ');
  const providers = ledger.providers.map((p) => `${p.name} (${p.purpose})`).join('; ');
  const phases = ledger.timeline.phases.map((p) => `${p.name}: ${p.duration_weeks}w`).join('; ');
  const budgetItems = ledger.budget_items
    .map((b) => `${b.name}: $${(b.cost_cents / 100).toFixed(2)}${b.recurring ? '/mo' : ''}`)
    .join('; ');

  return [
    '=== DECISION LEDGER (authoritative — do not contradict or extend) ===',
    `Positioning: ${ledger.positioning}`,
    `Target segment: ${ledger.target_segment}`,
    `Monetization: ${ledger.monetization.model} (per ${ledger.monetization.billing_unit})`,
    `Pricing: ${pricing}`,
    `Tech stack: frontend=${ledger.tech_stack.frontend}; backend=${ledger.tech_stack.backend}; database=${ledger.tech_stack.database}; hosting=${ledger.tech_stack.hosting}${ledger.tech_stack.mobile ? `; mobile=${ledger.tech_stack.mobile}` : ''}`,
    `Providers: ${providers}`,
    `Budget total: $${(ledger.budget_total_cents / 100).toFixed(2)} (${budgetItems})`,
    `Timeline: ship ${ledger.timeline.ship_date}; phases ${phases}`,
    `Team: ${ledger.team.map((t) => `${t.role}=${t.person}`).join('; ')}`,
    ledger.flagged_risks.length > 0
      ? `Flagged risks (acknowledge in relevant sections): ${ledger.flagged_risks.join(' | ')}`
      : 'Flagged risks: none',
    'Rule: every price, tool, provider, number you mention must already appear above. Do not introduce new ones.',
  ].join('\n');
}

// ============================================================
// Deterministic post-checks
//
// Cheap, deterministic gates that run on every artifact's markdown
// before we accept it. They catch the loud failures (price drift,
// undeclared tools, budget mismatch) without paying for another
// LLM call. Returning a non-empty `violations` array means the
// pipeline should regenerate this artifact once with the
// violations spelled out.
// ============================================================

export interface CheckResult {
  violations: string[];
}

// Pull every "$X" or "$X.YZ" mention out of markdown.
function extractDollarAmounts(md: string): number[] {
  const out: number[] = [];
  const re = /\$\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

// Mentioned prices in an artifact should appear in the ledger's set.
// We allow any ledger price (in dollars) plus the budget total +/- 5%.
export function checkPricingDrift(md: string, ledger: DecisionLedger): CheckResult {
  const allowed = new Set<number>();
  for (const t of ledger.pricing.tiers) allowed.add(t.price_cents / 100);
  for (const b of ledger.budget_items) allowed.add(b.cost_cents / 100);
  allowed.add(ledger.budget_total_cents / 100);
  // Free + small numbers (page counts, percentages with $, contingencies) are noisy — skip < $5.
  const mentioned = extractDollarAmounts(md).filter((n) => n >= 5);
  const violations: string[] = [];
  const unknown = mentioned.filter((n) => {
    for (const a of allowed) {
      if (Math.abs(n - a) < 1) return false;
      // budget total fuzz: 5% band
      if (Math.abs(n - ledger.budget_total_cents / 100) / (ledger.budget_total_cents / 100) < 0.05) return false;
    }
    return true;
  });
  if (unknown.length > 0) {
    // Deduplicate and limit noise.
    const uniq = Array.from(new Set(unknown)).slice(0, 6);
    violations.push(
      `Mentions dollar amounts not in the ledger: ${uniq.map((n) => `$${n}`).join(', ')}. Use the ledger's pricing tiers and budget figures only.`,
    );
  }
  return { violations };
}

// In artifacts that name tools (tech_stack, architecture_overview),
// every tool/service name must already be in ledger.providers or
// ledger.tech_stack.
export function checkUndeclaredTools(md: string, ledger: DecisionLedger): CheckResult {
  const declared = new Set<string>();
  const add = (s?: string) => {
    if (!s) return;
    // Split on common separators to catch "Next.js + TypeScript"
    for (const part of s.split(/[+,/&]| and /i)) {
      const t = part.trim().toLowerCase();
      if (t) declared.add(t);
    }
  };
  add(ledger.tech_stack.frontend);
  add(ledger.tech_stack.backend);
  add(ledger.tech_stack.database);
  add(ledger.tech_stack.hosting);
  add(ledger.tech_stack.mobile);
  for (const p of ledger.providers) add(p.name);

  // Catalog of well-known SaaS / framework names that tend to leak in.
  const KNOWN_TOOLS = [
    'Stripe', 'Braintree', 'PayPal', 'Square',
    'Postmark', 'SendGrid', 'Mailgun', 'Resend', 'AWS SES', 'Brevo', 'Mailjet',
    'Twilio', 'Plivo', 'Vonage',
    'Auth0', 'Clerk', 'Firebase Auth', 'Supabase Auth', 'Cognito', 'WorkOS',
    'Supabase', 'Firebase', 'PlanetScale', 'Neon', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB',
    'Vercel', 'Netlify', 'Cloudflare Pages', 'Render', 'Fly.io', 'Railway', 'AWS', 'GCP', 'Azure', 'Heroku',
    'Next.js', 'Remix', 'Nuxt', 'SvelteKit', 'Astro', 'React Native', 'Expo', 'Flutter',
    'OpenAI', 'Anthropic', 'DeepSeek', 'Mistral', 'Groq', 'Replicate',
    'Mixpanel', 'Amplitude', 'PostHog', 'Segment', 'Heap',
    'Intercom', 'Crisp', 'Helpscout', 'Zendesk',
    'Algolia', 'Typesense', 'Meilisearch',
    'Sentry', 'Datadog', 'Honeybadger', 'Bugsnag',
    'Linear', 'Notion', 'Asana', 'Jira',
    'GitHub', 'GitLab', 'Bitbucket',
    'Cloudflare', 'AWS S3', 'Cloudinary', 'Uploadthing',
  ];
  const violations: string[] = [];
  const introduced: string[] = [];
  const lowerMd = md.toLowerCase();
  for (const tool of KNOWN_TOOLS) {
    if (lowerMd.includes(tool.toLowerCase()) && !declared.has(tool.toLowerCase())) {
      // Sub-check: skip if a declared item contains this token (e.g., declared "Supabase" vs mentioned "Supabase Auth").
      const containedByDeclared = Array.from(declared).some(
        (d) => d.includes(tool.toLowerCase()) || tool.toLowerCase().includes(d),
      );
      if (!containedByDeclared) introduced.push(tool);
    }
  }
  if (introduced.length > 0) {
    violations.push(
      `Introduces tools not in the ledger: ${introduced.slice(0, 6).join(', ')}. Use only the providers and tech_stack already declared, or update the ledger first.`,
    );
  }
  return { violations };
}

// In the budget artifact specifically, line-item sum must match the
// ledger's budget total within rounding.
export function checkBudgetSum(md: string, ledger: DecisionLedger): CheckResult {
  // Extract markdown table-style line items: "$X" preceded by a label and a colon/em-dash.
  // Heuristic — this is a soft check; a hard ledger-side check already runs at ledger creation.
  // We only flag if the artifact's prose total disagrees with the ledger total.
  const re = /total\s*(?:estimated|monthly|one[- ]time|budget|cost)?\s*[:\-]?\s*\$\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
  let m: RegExpExecArray | null;
  const stated: number[] = [];
  while ((m = re.exec(md)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n > 100) stated.push(n);
  }
  if (stated.length === 0) return { violations: [] };
  const ledgerDollars = ledger.budget_total_cents / 100;
  const drift = stated.filter((s) => Math.abs(s - ledgerDollars) / Math.max(ledgerDollars, 1) > 0.05);
  if (drift.length > 0) {
    return {
      violations: [
        `Budget artifact states totals (${drift.map((n) => `$${n}`).join(', ')}) that diverge from the ledger's $${ledgerDollars}. Use the ledger total.`,
      ],
    };
  }
  return { violations: [] };
}

// Run the right check set for a given artifact type.
export function runDeterministicChecks(
  artifactType: string,
  md: string,
  ledger: DecisionLedger,
): CheckResult {
  const all: string[] = [];
  // Pricing drift applies broadly.
  all.push(...checkPricingDrift(md, ledger).violations);
  // Tool drift applies to artifacts that name tech.
  if (['tech_stack', 'architecture_overview', 'roadmap', 'risk_register'].includes(artifactType)) {
    all.push(...checkUndeclaredTools(md, ledger).violations);
  }
  // Budget sum applies to the budget artifact.
  if (artifactType === 'budget') {
    all.push(...checkBudgetSum(md, ledger).violations);
  }
  return { violations: all };
}

// ============================================================
// LLM auditor — runs ONCE at the end, scoped to the high-conflict
// fields. Returns a structured list of conflicts (no prose). The
// caller surfaces conflicts to the user via project.metadata so
// the human can resolve them; we don't try to auto-fix.
// ============================================================

export interface AuditConflict {
  field: 'pricing' | 'tech_stack' | 'providers' | 'budget' | 'timeline' | 'positioning' | 'demand';
  sections: string[];
  description: string;
}

export interface AuditReport {
  conflicts: AuditConflict[];
}

export function buildAuditorPrompt(
  ledger: DecisionLedger,
  artifacts: Array<{ type: string; content_markdown: string }>,
): string {
  const ledgerJson = JSON.stringify(ledger, null, 2);
  const corpus = artifacts
    .map((a) => `--- ${a.type.toUpperCase()} ---\n${a.content_markdown}`)
    .join('\n\n');

  return `You are a consistency auditor. Your only job is to find contradictions between the Decision Ledger and the generated artifacts, and between artifacts themselves. You are NOT here to be helpful or improve prose.

=== DECISION LEDGER (authoritative) ===
${ledgerJson}

=== GENERATED ARTIFACTS ===
${corpus}

=== SCOPE ===
Audit ONLY these high-conflict fields:
- pricing (prices, tiers, intervals)
- tech_stack (frontend, backend, database, hosting, mobile)
- providers (named third-party services)
- budget (totals, line items)
- timeline (ship date, phase durations)
- positioning (the one-line differentiator)
- demand (the demand_analysis verdict's relationship to the rest of the plan)

Flag every case of:
(a) An artifact stating a value that disagrees with the ledger.
(b) Two artifacts stating different values for the same field.
(c) Budget line items in any artifact that don't sum to the budget total.
(d) Two mutually exclusive approaches presented as coexisting.
(e) demand: the demand_analysis verdict is WEAK or MODERATE but the budget or roadmap commits substantial spend or time before any validation experiment runs. Or the verdict is STRONG/EXTREME but the timeline is slow enough that competitors win.
(f) demand: any artifact (vision, pitch_deck, go_to_market) makes a market-size or buyer-willingness claim that contradicts the demand_analysis dimensions table.

Return ONLY this JSON shape (no prose, no code fence):
{
  "conflicts": [
    { "field": "pricing | tech_stack | providers | budget | timeline | positioning | demand",
      "sections": ["vision", "scope"],
      "description": "Concise statement of the contradiction." }
  ]
}

If there are no conflicts, return { "conflicts": [] }. Do not rationalize. Do not rewrite.`;
}

export function parseAuditReport(raw: string): AuditReport {
  try {
    // Strip code fences if present.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.conflicts)) return parsed as AuditReport;
  } catch {
    /* fall through */
  }
  return { conflicts: [] };
}
