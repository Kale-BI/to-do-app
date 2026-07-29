import {
  TodoResponseSchema,
  TodosResponseSchema,
  type Todo,
  type UpdateTodo,
} from "@todo/shared";

async function expectOk(res: Response): Promise<Response> {
  if (!res.ok) {
    throw new Error(`Request failed with ${res.status}`);
  }
  return res;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export async function fetchTodos(listId: string): Promise<Todo[]> {
  const res = await expectOk(await fetch(`/api/lists/${listId}/todos`));
  return TodosResponseSchema.parse(await res.json()).todos;
}

export async function createTodo(listId: string, title: string): Promise<Todo> {
  const res = await expectOk(
    await fetch(`/api/lists/${listId}/todos`, json("POST", { title })),
  );
  return TodoResponseSchema.parse(await res.json()).todo;
}

export async function updateTodo(id: string, patch: UpdateTodo): Promise<Todo> {
  const res = await expectOk(await fetch(`/api/todos/${id}`, json("PATCH", patch)));
  return TodoResponseSchema.parse(await res.json()).todo;
}

export async function deleteTodo(id: string): Promise<void> {
  await expectOk(await fetch(`/api/todos/${id}`, { method: "DELETE" }));
}
