import {
  BlockResponseSchema,
  BlocksResponseSchema,
  type Block,
  type CreateBlock,
  type UpdateBlock,
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

export async function fetchBlocks(listId: string): Promise<Block[]> {
  const res = await expectOk(await fetch(`/api/lists/${listId}/blocks`));
  return BlocksResponseSchema.parse(await res.json()).blocks;
}

export async function createBlock(
  listId: string,
  body: CreateBlock,
): Promise<Block> {
  const res = await expectOk(
    await fetch(`/api/lists/${listId}/blocks`, json("POST", body)),
  );
  return BlockResponseSchema.parse(await res.json()).block;
}

export async function updateBlock(
  id: string,
  patch: UpdateBlock,
): Promise<Block> {
  const res = await expectOk(await fetch(`/api/blocks/${id}`, json("PATCH", patch)));
  return BlockResponseSchema.parse(await res.json()).block;
}

export async function deleteBlock(id: string): Promise<void> {
  await expectOk(await fetch(`/api/blocks/${id}`, { method: "DELETE" }));
}
