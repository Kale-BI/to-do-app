import {
  ListResponseSchema,
  ListsResponseSchema,
  type List,
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

export async function fetchLists(): Promise<List[]> {
  const res = await expectOk(await fetch("/api/lists"));
  return ListsResponseSchema.parse(await res.json()).lists;
}

export async function createList(name: string): Promise<List> {
  const res = await expectOk(await fetch("/api/lists", json("POST", { name })));
  return ListResponseSchema.parse(await res.json()).list;
}

export async function renameList(id: string, name: string): Promise<List> {
  const res = await expectOk(
    await fetch(`/api/lists/${id}`, json("PATCH", { name })),
  );
  return ListResponseSchema.parse(await res.json()).list;
}

export async function deleteList(id: string): Promise<void> {
  await expectOk(await fetch(`/api/lists/${id}`, { method: "DELETE" }));
}
