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

// A plain calendar day, never a timestamp: no time, no zone. The client
// resolves whatever the user typed against its own clock and sends the day.
export const DueOnSchema = z.iso.date();

export type DueOn = z.infer<typeof DueOnSchema>;

export const BlockSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  kind: BlockKindSchema,
  position: z.number(),
  dueOn: DueOnSchema.nullable().optional(),
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
    // Three distinguishable intents: a day sets it, null clears it, absent
    // leaves it alone.
    dueOn: DueOnSchema.nullable().optional(),
  })
  // Key presence, not definedness: `{ dueOn: null }` is a real edit, so an
  // "is every field undefined" check would wrongly reject a clear.
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update" });

export type UpdateBlock = z.input<typeof UpdateBlockSchema>;

export const BlockResponseSchema = z.object({
  block: BlockSchema,
});

export type BlockResponse = z.infer<typeof BlockResponseSchema>;

export const BlocksResponseSchema = z.object({
  blocks: z.array(BlockSchema),
});

export type BlocksResponse = z.infer<typeof BlocksResponseSchema>;
