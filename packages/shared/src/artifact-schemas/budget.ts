import { z } from 'zod';

const LineItemSchema = z.object({
  category: z.string(),
  item: z.string(),
  monthlyCostCents: z.number().nullable().describe('Monthly cost in cents, or null if not recurring'),
  oneTimeCostCents: z.number().nullable().describe('One-time cost in cents, or null if not applicable'),
  notes: z.string(),
});

export const BudgetSchema = z.object({
  lineItems: z.array(LineItemSchema).min(1),
  totalMonthlyCents: z.number().describe('Total monthly recurring cost in cents'),
  totalOneTimeCents: z.number().describe('Total one-time cost in cents'),
  contingencyPct: z.number().min(0).max(100).describe('Contingency percentage'),
  contingencyNotes: z.string(),
});

export type Budget = z.infer<typeof BudgetSchema>;
