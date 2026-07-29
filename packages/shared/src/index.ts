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

export const ListSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type List = z.infer<typeof ListSchema>;

export const ListNameSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export type ListName = z.infer<typeof ListNameSchema>;

export const ListResponseSchema = z.object({
  list: ListSchema,
});

export type ListResponse = z.infer<typeof ListResponseSchema>;

export const ListsResponseSchema = z.object({
  lists: z.array(ListSchema),
});

export type ListsResponse = z.infer<typeof ListsResponseSchema>;
