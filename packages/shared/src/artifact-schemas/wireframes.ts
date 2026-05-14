import { z } from 'zod';

const ScreenSchema = z.object({
  screenName: z.string(),
  purpose: z.string(),
  keyElements: z.array(z.string()).min(1),
  userActions: z.array(z.string()).min(1),
  navigation: z.array(z.string()).describe('Where the user can navigate to from this screen'),
});

export const WireframesSchema = z.object({
  screens: z.array(ScreenSchema).min(1),
  navigationMap: z.string().describe('Text description of the overall app navigation flow'),
});

export type Wireframes = z.infer<typeof WireframesSchema>;
