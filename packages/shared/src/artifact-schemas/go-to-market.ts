import { z } from 'zod';

const ChannelSchema = z.object({
  channel: z.string(),
  strategy: z.string(),
  estimatedCost: z.string(),
  expectedOutcome: z.string(),
});

const PricingTierSchema = z.object({
  tierName: z.string(),
  price: z.string(),
  features: z.array(z.string()).min(1),
});

export const GoToMarketSchema = z.object({
  launchStrategy: z.string(),
  targetSegments: z.array(z.string()).min(1),
  channels: z.array(ChannelSchema).min(3),
  pricing: z.array(PricingTierSchema).min(1),
  first100Users: z.string(),
  partnerships: z.array(z.string()),
  timeline: z.string(),
});

export type GoToMarket = z.infer<typeof GoToMarketSchema>;
