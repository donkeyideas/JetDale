import { z } from 'zod';

export const ScopeSchema = z.object({
  mustHave: z.array(z.string()).min(1).describe('Must-have features'),
  shouldHave: z.array(z.string()).describe('Should-have features'),
  couldHave: z.array(z.string()).describe('Could-have features'),
  wontHave: z.array(z.string()).describe('Will not have in this release'),
  userStories: z
    .array(
      z.object({
        asA: z.string().describe('User role'),
        iWant: z.string().describe('Desired action'),
        soThat: z.string().describe('Expected benefit'),
      }),
    )
    .min(1),
  acceptanceCriteria: z.array(z.string()).min(1),
});

export type Scope = z.infer<typeof ScopeSchema>;
