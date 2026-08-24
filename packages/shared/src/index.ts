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

// A due date is a plain calendar day: no time, no timezone. Every block kind
// tolerates one; only todos ever draw it.
export const DueOnSchema = z.iso.date();

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
  dueOn: DueOnSchema.nullable().optional(),
});

export type CreateBlock = z.input<typeof CreateBlockSchema>;

const UPDATABLE_BLOCK_FIELDS = ["text", "completed", "kind", "position", "dueOn"] as const;

export const UpdateBlockSchema = z
  .object({
    text: z.string().max(2000).optional(),
    completed: z.boolean().optional(),
    kind: BlockKindSchema.optional(),
    position: z.number().finite().optional(),
    // An explicit null clears the date; an absent key leaves it alone.
    dueOn: DueOnSchema.nullable().optional(),
  })
  // Key presence, not a comparison against undefined: `{ dueOn: null }` is a
  // real edit — it means "take the date off" — and must not read as empty.
  .refine((value) => UPDATABLE_BLOCK_FIELDS.some((field) => field in value), {
    message: "Nothing to update",
  });

export type UpdateBlock = z.input<typeof UpdateBlockSchema>;

export const BlockResponseSchema = z.object({
  block: BlockSchema,
});

export type BlockResponse = z.infer<typeof BlockResponseSchema>;

export const BlocksResponseSchema = z.object({
  blocks: z.array(BlockSchema),
});

export type BlocksResponse = z.infer<typeof BlocksResponseSchema>;
