import { BlockResponseSchema, BlocksResponseSchema } from "@todo/shared";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createPgliteDb } from "./db/pglite";

type App = ReturnType<typeof createApp>;

function jsonInit(method: string, body: unknown, cookie?: string): RequestInit {
  return {
    method,
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  };
}

async function registerUser(app: App, email: string): Promise<string> {
  const res = await app.request(
    "/api/auth/sign-up/email",
    jsonInit("POST", { email, password: "correct-horse-battery", name: "Test" }),
  );
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("expected a session cookie from sign-up");
  return cookie;
}

async function createList(app: App, cookie: string, name: string) {
  const res = await app.request("/api/lists", jsonInit("POST", { name }, cookie));
  expect(res.status).toBe(201);
  return ((await res.json()) as { list: { id: string } }).list;
}

async function addBlock(
  app: App,
  cookie: string,
  listId: string,
  body: Record<string, unknown>,
) {
  const res = await app.request(
    `/api/lists/${listId}/blocks`,
    jsonInit("POST", body, cookie),
  );
  expect(res.status).toBe(201);
  return BlockResponseSchema.parse(await res.json()).block;
}

async function getBlocks(app: App, cookie: string, listId: string) {
  const res = await app.request(`/api/lists/${listId}/blocks`, {
    headers: { cookie },
  });
  expect(res.status).toBe(200);
  return BlocksResponseSchema.parse(await res.json()).blocks;
}

async function patchBlock(
  app: App,
  cookie: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const res = await app.request(`/api/blocks/${id}`, jsonInit("PATCH", patch, cookie));
  expect(res.status).toBe(200);
  return BlockResponseSchema.parse(await res.json()).block;
}

describe("blocks", () => {
  let app: App;
  let cookie: string;
  let listId: string;

  beforeEach(async () => {
    app = createApp(await createPgliteDb());
    cookie = await registerUser(app, "owner@example.com");
    listId = (await createList(app, cookie, "Groceries")).id;
  });

  it("starts empty, then lists added blocks in position order", async () => {
    expect(await getBlocks(app, cookie, listId)).toEqual([]);

    const milk = await addBlock(app, cookie, listId, { text: "Buy milk" });
    const bread = await addBlock(app, cookie, listId, { text: "Buy bread" });

    expect(await getBlocks(app, cookie, listId)).toEqual([milk, bread]);
    expect(milk.completed).toBe(false);
    expect(milk.kind).toBe("todo");
    expect(bread.position).toBeGreaterThan(milk.position);
  });

  it("orders by explicit position, not creation time", async () => {
    const first = await addBlock(app, cookie, listId, { text: "First" });
    const wedged = await addBlock(app, cookie, listId, {
      text: "Wedged in front",
      position: first.position - 1,
    });

    expect(await getBlocks(app, cookie, listId)).toEqual([wedged, first]);
  });

  it("honors a client-supplied block id", async () => {
    const id = crypto.randomUUID();
    const created = await addBlock(app, cookie, listId, { id, text: "Buy milk" });
    expect(created.id).toBe(id);
  });

  it("creates non-todo kinds and allows empty text", async () => {
    const heading = await addBlock(app, cookie, listId, {
      text: "Errands",
      kind: "h1",
    });
    const divider = await addBlock(app, cookie, listId, { kind: "divider" });

    expect(heading.kind).toBe("h1");
    expect(divider.kind).toBe("divider");
    expect(divider.text).toBe("");
  });

  it("toggles completion both ways", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Buy milk" });

    const done = await app.request(
      `/api/blocks/${created.id}`,
      jsonInit("PATCH", { completed: true }, cookie),
    );
    expect(done.status).toBe(200);
    expect(BlockResponseSchema.parse(await done.json()).block.completed).toBe(true);

    const undone = await app.request(
      `/api/blocks/${created.id}`,
      jsonInit("PATCH", { completed: false }, cookie),
    );
    expect(BlockResponseSchema.parse(await undone.json()).block.completed).toBe(false);
  });

  it("edits text and converts kind", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Buy milk" });

    const res = await app.request(
      `/api/blocks/${created.id}`,
      jsonInit("PATCH", { text: "Shopping", kind: "h2" }, cookie),
    );

    expect(res.status).toBe(200);
    const updated = BlockResponseSchema.parse(await res.json()).block;
    expect(updated.text).toBe("Shopping");
    expect(updated.kind).toBe("h2");
  });

  it("deletes a block", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Buy milk" });

    const res = await app.request(`/api/blocks/${created.id}`, {
      method: "DELETE",
      headers: { cookie, origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(204);
    expect(await getBlocks(app, cookie, listId)).toEqual([]);
  });

  it("rejects unknown kinds and empty updates", async () => {
    expect(
      (
        await app.request(
          `/api/lists/${listId}/blocks`,
          jsonInit("POST", { kind: "callout" }, cookie),
        )
      ).status,
    ).toBe(400);

    const created = await addBlock(app, cookie, listId, { text: "Buy milk" });
    expect(
      (await app.request(`/api/blocks/${created.id}`, jsonInit("PATCH", {}, cookie))).status,
    ).toBe(400);
  });

  it("returns 401 for every block route without a session", async () => {
    expect((await app.request(`/api/lists/${listId}/blocks`)).status).toBe(401);
    expect(
      (await app.request(`/api/lists/${listId}/blocks`, jsonInit("POST", { text: "x" }))).status,
    ).toBe(401);
    expect(
      (await app.request("/api/blocks/some-id", jsonInit("PATCH", { completed: true }))).status,
    ).toBe(401);
    expect((await app.request("/api/blocks/some-id", { method: "DELETE" })).status).toBe(401);
  });

  it("enforces ownership through the parent list for another user's blocks", async () => {
    const owned = await addBlock(app, cookie, listId, { text: "Buy milk" });
    const intruder = await registerUser(app, "intruder@example.com");

    expect(
      (await app.request(`/api/lists/${listId}/blocks`, { headers: { cookie: intruder } })).status,
    ).toBe(404);
    expect(
      (await app.request(`/api/lists/${listId}/blocks`, jsonInit("POST", { text: "x" }, intruder)))
        .status,
    ).toBe(404);
    expect(
      (
        await app.request(
          `/api/blocks/${owned.id}`,
          jsonInit("PATCH", { completed: true }, intruder),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/blocks/${owned.id}`, {
          method: "DELETE",
          headers: { cookie: intruder, origin: "http://localhost:3000" },
        })
      ).status,
    ).toBe(404);

    expect(await getBlocks(app, cookie, listId)).toEqual([owned]);
  });

  it("deletes a list's blocks with the list", async () => {
    await addBlock(app, cookie, listId, { text: "Buy milk" });

    const res = await app.request(`/api/lists/${listId}`, {
      method: "DELETE",
      headers: { cookie, origin: "http://localhost:3000" },
    });
    expect(res.status).toBe(204);

    expect((await app.request(`/api/lists/${listId}/blocks`, { headers: { cookie } })).status).toBe(
      404,
    );
  });
});

// One sheet, shared across these reads: each test writes its own line, and a
// fresh PGlite boot and password hash per test costs more than it proves.
describe("block due dates", () => {
  let app: App;
  let cookie: string;
  let listId: string;

  beforeAll(async () => {
    app = createApp(await createPgliteDb());
    cookie = await registerUser(app, "dates@example.com");
    listId = (await createList(app, cookie, "Deadlines")).id;
  });

  async function readBack(id: string) {
    const blocks = await getBlocks(app, cookie, listId);
    const found = blocks.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`expected block ${id} to still be on the sheet`);
    return found;
  }

  it("reads a line written without a date as having none", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Buy milk" });

    expect(created.dueOn).toBeNull();
    expect((await readBack(created.id)).dueOn).toBeNull();
  });

  it("keeps a date given at create, on every later read", async () => {
    const created = await addBlock(app, cookie, listId, {
      text: "Buy milk",
      dueOn: "2026-09-01",
    });

    expect(created.dueOn).toBe("2026-09-01");
    expect((await readBack(created.id)).dueOn).toBe("2026-09-01");
  });

  it("sets a date on an undated line, then changes it", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Buy milk" });

    await patchBlock(app, cookie, created.id, { dueOn: "2026-09-01" });
    expect((await readBack(created.id)).dueOn).toBe("2026-09-01");

    await patchBlock(app, cookie, created.id, { dueOn: "2026-09-08" });
    expect((await readBack(created.id)).dueOn).toBe("2026-09-08");
  });

  it("clears a date when the patch says so with an explicit null", async () => {
    const created = await addBlock(app, cookie, listId, {
      text: "Buy milk",
      dueOn: "2026-09-01",
    });

    const cleared = await patchBlock(app, cookie, created.id, { dueOn: null });

    expect(cleared.dueOn).toBeNull();
    expect((await readBack(created.id)).dueOn).toBeNull();
  });

  it("leaves a date alone when the patch never mentions it", async () => {
    const created = await addBlock(app, cookie, listId, {
      text: "Buy milk",
      dueOn: "2026-09-01",
    });

    await patchBlock(app, cookie, created.id, { text: "Buy oat milk" });
    await patchBlock(app, cookie, created.id, { completed: true });

    const after = await readBack(created.id);
    expect(after.text).toBe("Buy oat milk");
    expect(after.completed).toBe(true);
    expect(after.dueOn).toBe("2026-09-01");
  });

  // Retain on conversion: reformatting a line is a fluid editing gesture, and
  // a kind change must never carry a date clear along with it.
  it("retains a due date when a dated todo is converted to another kind", async () => {
    const created = await addBlock(app, cookie, listId, {
      text: "Buy milk",
      dueOn: "2026-09-01",
    });

    const heading = await patchBlock(app, cookie, created.id, { kind: "h2" });
    expect(heading.kind).toBe("h2");
    expect((await readBack(created.id)).dueOn).toBe("2026-09-01");

    const back = await patchBlock(app, cookie, created.id, { kind: "todo" });
    expect(back.kind).toBe("todo");
    expect((await readBack(created.id)).dueOn).toBe("2026-09-01");
  });

  it("accepts a patch whose only content is a cleared date", async () => {
    const created = await addBlock(app, cookie, listId, {
      text: "Buy milk",
      dueOn: "2026-09-01",
    });

    const res = await app.request(
      `/api/blocks/${created.id}`,
      jsonInit("PATCH", { dueOn: null }, cookie),
    );

    expect(res.status).toBe(200);
  });

  it("rejects a malformed date on create and on update", async () => {
    expect(
      (
        await app.request(
          `/api/lists/${listId}/blocks`,
          jsonInit("POST", { text: "Buy milk", dueOn: "friday" }, cookie),
        )
      ).status,
    ).toBe(400);

    const created = await addBlock(app, cookie, listId, { text: "Buy milk" });
    expect(
      (
        await app.request(
          `/api/blocks/${created.id}`,
          jsonInit("PATCH", { dueOn: "2026-13-01" }, cookie),
        )
      ).status,
    ).toBe(400);
  });
});
