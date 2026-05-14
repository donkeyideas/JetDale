import { z } from 'zod';

const LikelihoodEnum = z.enum(['low', 'medium', 'high']);
const ImpactEnum = z.enum(['low', 'medium', 'high']);

const ScenarioSchema = z.object({
  scenarioName: z.string(),
  description: z.string().describe('Written in past tense, as if the failure already happened'),
  likelihood: LikelihoodEnum,
  impact: ImpactEnum,
  earlyWarningSigns: z.array(z.string()).min(1),
  preventionStrategy: z.string(),
});

export const PreMortemSchema = z.array(ScenarioSchema).min(6).max(10);

export type PreMortem = z.infer<typeof PreMortemSchema>;
