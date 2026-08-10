import { z } from "zod";

export const analyticsEventSchema = z.object({
  name: z.string().min(1).max(80),
  path: z.string().max(500).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  sessionId: z.string().max(120).optional().nullable(),
  entityType: z.string().max(80).optional().nullable(),
  entityId: z.string().max(120).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
