import { BlockResponseSchema, BlocksResponseSchema } from "@todo/shared";
import { beforeEach, describe, expect, it } from "vitest";
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

async function getBlocks(app: App, cookie: string, listId: string) {
  const res = await app.request(`/api/lists/${listId}/blocks`, {
    headers: { cookie },
  });
  expect(res.status).toBe(200);
  return BlocksResponseSchema.parse(await res.json()).blocks;
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

  it("stores no due date by default and survives a round trip once set", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Call the plumber" });
    expect(created.dueOn).toBeNull();

    const dated = await patchBlock(app, cookie, created.id, { dueOn: "2026-08-28" });
    expect(dated.dueOn).toBe("2026-08-28");

    expect(await getBlocks(app, cookie, listId)).toEqual([dated]);
  });

  it("clears a due date with an explicit null, and leaves it alone when absent", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Call the plumber" });
    await patchBlock(app, cookie, created.id, { dueOn: "2026-08-28" });

    const untouched = await patchBlock(app, cookie, created.id, { text: "Call the roofer" });
    expect(untouched.dueOn).toBe("2026-08-28");

    const cleared = await patchBlock(app, cookie, created.id, { dueOn: null });
    expect(cleared.dueOn).toBeNull();
  });

  it("retains a due date across a conversion away from todo and back", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Call the plumber" });
    await patchBlock(app, cookie, created.id, { dueOn: "2026-08-28" });

    const asHeading = await patchBlock(app, cookie, created.id, { kind: "h2" });
    expect(asHeading.kind).toBe("h2");
    expect(asHeading.dueOn).toBe("2026-08-28");

    const backToTodo = await patchBlock(app, cookie, created.id, { kind: "todo" });
    expect(backToTodo.kind).toBe("todo");
    expect(backToTodo.dueOn).toBe("2026-08-28");
  });

  it("rejects a due date that is not a plain calendar day", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Call the plumber" });

    for (const dueOn of ["2026-08-28T09:00:00Z", "friday", "2026-02-30"]) {
      const res = await app.request(
        `/api/blocks/${created.id}`,
        jsonInit("PATCH", { dueOn }, cookie),
      );
      expect(res.status).toBe(400);
    }
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

  it("rejects an empty patch but not a due-date clear", async () => {
    const created = await addBlock(app, cookie, listId, { text: "Call the plumber" });

    expect(
      (await app.request(`/api/blocks/${created.id}`, jsonInit("PATCH", {}, cookie))).status,
    ).toBe(400);
    expect(
      (await app.request(`/api/blocks/${created.id}`, jsonInit("PATCH", { dueOn: null }, cookie)))
        .status,
    ).toBe(200);
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
