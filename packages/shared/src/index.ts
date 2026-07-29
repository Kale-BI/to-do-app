import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
});

export type SessionUser = z.infer<typeof SessionUserSchema>;

export const MeResponseSchema = z.object({
  user: SessionUserSchema,
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
