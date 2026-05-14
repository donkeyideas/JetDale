import { z } from 'zod';

const CompetitorSchema = z.object({
  name: z.string(),
  description: z.string(),
  strengths: z.array(z.string()).min(2),
  weaknesses: z.array(z.string()).min(2),
  pricingModel: z.string(),
  marketShare: z.string(),
});

const SwotSchema = z.object({
  strengths: z.array(z.string()).min(2),
  weaknesses: z.array(z.string()).min(2),
  opportunities: z.array(z.string()).min(2),
  threats: z.array(z.string()).min(2),
});

export const CompetitiveAnalysisSchema = z.object({
  competitors: z.array(CompetitorSchema).min(3).max(8),
  swot: SwotSchema,
  positioning: z.string(),
  differentiators: z.array(z.string()).min(2),
});

export type CompetitiveAnalysis = z.infer<typeof CompetitiveAnalysisSchema>;
