import { z } from 'zod';

const KPISchema = z.object({
  metricName: z.string(),
  definition: z.string(),
  targetValue: z.string(),
  measurementMethod: z.string(),
  timeframe: z.string(),
  whyItMatters: z.string(),
});

export const SuccessMetricsSchema = z.array(KPISchema).min(6).max(10);

export type SuccessMetrics = z.infer<typeof SuccessMetricsSchema>;
