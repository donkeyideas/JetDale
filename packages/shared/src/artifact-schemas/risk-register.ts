import { z } from 'zod';

const RiskCategoryEnum = z.enum([
  'technical',
  'market',
  'financial',
  'operational',
  'legal',
  'team',
]);

const LikelihoodEnum = z.enum(['low', 'medium', 'high']);
const ImpactEnum = z.enum(['low', 'medium', 'high']);

const RiskSchema = z.object({
  riskId: z.string().regex(/^R-\d{3}$/, 'Must be in R-001 format'),
  category: RiskCategoryEnum,
  description: z.string(),
  likelihood: LikelihoodEnum,
  impact: ImpactEnum,
  mitigationStrategy: z.string(),
  owner: z.string(),
});

export const RiskRegisterSchema = z.array(RiskSchema).min(8).max(15);

export type RiskRegister = z.infer<typeof RiskRegisterSchema>;
