import { z } from 'zod';

const ComponentSchema = z.object({
  name: z.string(),
  type: z.string(),
  technology: z.string(),
  responsibility: z.string(),
  communicatesWith: z.array(z.string()),
});

const DataFlowSchema = z.object({
  from: z.string(),
  to: z.string(),
  protocol: z.string(),
  description: z.string(),
});

const ApiEndpointSchema = z.object({
  method: z.string(),
  path: z.string(),
  description: z.string(),
  authRequired: z.boolean(),
});

export const ArchitectureOverviewSchema = z.object({
  overview: z.string(),
  components: z.array(ComponentSchema).min(3),
  dataFlows: z.array(DataFlowSchema).min(3),
  apiEndpoints: z.array(ApiEndpointSchema).min(4),
  infrastructureNotes: z.string(),
  scalabilityConsiderations: z.string(),
});

export type ArchitectureOverview = z.infer<typeof ArchitectureOverviewSchema>;
