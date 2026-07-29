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

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const TodoTitleSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export type TodoTitle = z.infer<typeof TodoTitleSchema>;

export const UpdateTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.completed !== undefined, {
    message: "Nothing to update",
  });

export type UpdateTodo = z.infer<typeof UpdateTodoSchema>;

export const TodoResponseSchema = z.object({
  todo: TodoSchema,
});

export type TodoResponse = z.infer<typeof TodoResponseSchema>;

export const TodosResponseSchema = z.object({
  todos: z.array(TodoSchema),
});

export type TodosResponse = z.infer<typeof TodosResponseSchema>;
