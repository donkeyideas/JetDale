import { z } from 'zod';

const TouchpointSchema = z.object({
  action: z.string(),
  channel: z.string(),
  emotion: z.string(),
  painPoints: z.array(z.string()),
  opportunities: z.array(z.string()),
});

const StageSchema = z.object({
  stageName: z.string(),
  description: z.string(),
  touchpoints: z.array(TouchpointSchema).min(1),
});

export const UserJourneySchema = z.object({
  stages: z.array(StageSchema).min(5).max(7),
  keyDropOffPoints: z.array(z.string()).min(1),
  retentionHooks: z.array(z.string()).min(2),
});

export type UserJourney = z.infer<typeof UserJourneySchema>;
