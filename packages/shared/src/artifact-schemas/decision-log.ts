import { z } from 'zod';

const OptionSchema = z.object({
  option: z.string(),
  pros: z.array(z.string()).min(1),
  cons: z.array(z.string()).min(1),
});

const DecisionSchema = z.object({
  decisionId: z.string().regex(/^D-\d{3}$/, 'Must be in D-001 format'),
  topic: z.string(),
  context: z.string(),
  optionsConsidered: z.array(OptionSchema).min(2),
  decisionMade: z.string(),
  rationale: z.string(),
  date: z.string().describe('Date of the decision (ISO 8601 or human-readable)'),
});

export const DecisionLogSchema = z.array(DecisionSchema).min(8).max(12);

export type DecisionLog = z.infer<typeof DecisionLogSchema>;
