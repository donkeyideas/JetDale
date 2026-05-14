import { z } from 'zod';

export const VisionSchema = z.object({
  problem: z.string().min(50).describe('Problem statement'),
  visionStatement: z.string().min(50).describe('The vision for this project'),
  whyNow: z.string().min(30).describe('Why this is the right time'),
  targetUsers: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
  successCriteria: z.array(z.string()).min(2),
});

export type Vision = z.infer<typeof VisionSchema>;
