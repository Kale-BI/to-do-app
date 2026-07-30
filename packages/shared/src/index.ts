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

export const BlockKindSchema = z.enum(["todo", "p", "h1", "h2", "divider"]);

export type BlockKind = z.infer<typeof BlockKindSchema>;

export const BlockSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  kind: BlockKindSchema,
  position: z.number(),
});

export type Block = z.infer<typeof BlockSchema>;

export const CreateBlockSchema = z.object({
  id: z.uuid().optional(),
  text: z.string().max(2000).default(""),
  kind: BlockKindSchema.default("todo"),
  position: z.number().finite().optional(),
});

export type CreateBlock = z.input<typeof CreateBlockSchema>;

export const UpdateBlockSchema = z
  .object({
    text: z.string().max(2000).optional(),
    completed: z.boolean().optional(),
    kind: BlockKindSchema.optional(),
    position: z.number().finite().optional(),
  })
  .refine(
    (value) =>
      value.text !== undefined ||
      value.completed !== undefined ||
      value.kind !== undefined ||
      value.position !== undefined,
    { message: "Nothing to update" },
  );

export type UpdateBlock = z.input<typeof UpdateBlockSchema>;

export const BlockResponseSchema = z.object({
  block: BlockSchema,
});

export type BlockResponse = z.infer<typeof BlockResponseSchema>;

export const BlocksResponseSchema = z.object({
  blocks: z.array(BlockSchema),
});

export type BlocksResponse = z.infer<typeof BlocksResponseSchema>;
