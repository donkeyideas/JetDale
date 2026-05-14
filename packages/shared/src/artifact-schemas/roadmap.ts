import { z } from 'zod';

const PhaseSchema = z.object({
  phaseName: z.string(),
  duration: z.string().describe('e.g. "2 weeks", "1 month"'),
  goals: z.array(z.string()).min(1),
  deliverables: z.array(z.string()).min(1),
  dependencies: z.array(z.string()),
  milestone: z.string().describe('Key milestone marking phase completion'),
});

export const RoadmapSchema = z.array(PhaseSchema).min(3).max(5);

export type Roadmap = z.infer<typeof RoadmapSchema>;
