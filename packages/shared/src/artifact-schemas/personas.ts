import { z } from 'zod';

const PersonaSchema = z.object({
  name: z.string(),
  role: z.string(),
  demographics: z.object({
    ageRange: z.string().describe('e.g. "25-34"'),
    location: z.string(),
    techComfort: z.string().describe('e.g. "High", "Moderate", "Low"'),
  }),
  goals: z.array(z.string()).min(1),
  painPoints: z.array(z.string()).min(1),
  jobsToBeDone: z.array(z.string()).min(1),
  behaviorPatterns: z.array(z.string()).min(1),
  quote: z.string().describe('A representative quote from this persona'),
});

export const PersonasSchema = z.array(PersonaSchema).min(2).max(4);

export type Personas = z.infer<typeof PersonasSchema>;
