import { z } from 'zod';

const SlideSchema = z.object({
  slideNumber: z.number().int().min(1).max(10),
  title: z.string(),
  content: z.array(z.string()).min(1).describe('Bullet points for the slide'),
  speakerNotes: z.string(),
});

export const PitchDeckSchema = z.array(SlideSchema).length(10);

export type PitchDeck = z.infer<typeof PitchDeckSchema>;
