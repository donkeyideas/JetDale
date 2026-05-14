import { z } from 'zod';

const RaciAssignmentEnum = z.enum(['R', 'A', 'C', 'I', 'none']);

const RaciRowSchema = z.object({
  deliverable: z.string(),
  phase: z.string(),
  roles: z.record(z.string(), RaciAssignmentEnum),
});

export const RaciMatrixSchema = z.object({
  roles: z.array(z.string()).min(2),
  rows: z.array(RaciRowSchema).min(8),
  notes: z.array(z.string()),
});

export type RaciMatrix = z.infer<typeof RaciMatrixSchema>;
