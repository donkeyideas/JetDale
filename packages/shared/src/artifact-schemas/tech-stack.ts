import { z } from 'zod';

const TechChoiceSchema = z.object({
  name: z.string(),
  rationale: z.string(),
  alternatives: z.array(z.string()),
});

export const TechStackSchema = z.object({
  frontend: z.array(TechChoiceSchema).describe('Frontend technologies'),
  backend: z.array(TechChoiceSchema).describe('Backend technologies'),
  database: z.array(TechChoiceSchema).describe('Database technologies'),
  infrastructure: z.array(TechChoiceSchema).describe('Infrastructure and hosting'),
  thirdPartyServices: z.array(TechChoiceSchema).describe('Third-party services and APIs'),
  developmentTools: z.array(TechChoiceSchema).describe('Development and build tools'),
});

export type TechStack = z.infer<typeof TechStackSchema>;
