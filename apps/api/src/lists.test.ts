import { ListResponseSchema, ListsResponseSchema } from "@todo/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createPgliteDb } from "./db";

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
  return ListResponseSchema.parse(await res.json()).list;
}

async function getLists(app: App, cookie: string) {
  const res = await app.request("/api/lists", { headers: { cookie } });
  expect(res.status).toBe(200);
  return ListsResponseSchema.parse(await res.json()).lists;
}

describe("lists", () => {
  let app: App;
  let cookie: string;

  beforeEach(async () => {
    app = createApp(await createPgliteDb());
    cookie = await registerUser(app, "owner@example.com");
  });

  it("starts empty, then lists created lists in creation order", async () => {
    expect(await getLists(app, cookie)).toEqual([]);

    const groceries = await createList(app, cookie, "Groceries");
    const errands = await createList(app, cookie, "Errands");

    expect(await getLists(app, cookie)).toEqual([groceries, errands]);
  });

  it("renames a list", async () => {
    const created = await createList(app, cookie, "Groceries");

    const res = await app.request(
      `/api/lists/${created.id}`,
      jsonInit("PATCH", { name: "Weekly shop" }, cookie),
    );

    expect(res.status).toBe(200);
    expect(ListResponseSchema.parse(await res.json()).list.name).toBe("Weekly shop");
    expect(await getLists(app, cookie)).toEqual([{ ...created, name: "Weekly shop" }]);
  });

  it("deletes a list", async () => {
    const created = await createList(app, cookie, "Groceries");

    const res = await app.request(`/api/lists/${created.id}`, {
      method: "DELETE",
      headers: { cookie, origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(204);
    expect(await getLists(app, cookie)).toEqual([]);
  });

  it("rejects blank names", async () => {
    const created = await app.request("/api/lists", jsonInit("POST", { name: "   " }, cookie));
    expect(created.status).toBe(400);

    const existing = await createList(app, cookie, "Groceries");
    const renamed = await app.request(
      `/api/lists/${existing.id}`,
      jsonInit("PATCH", { name: "" }, cookie),
    );
    expect(renamed.status).toBe(400);
  });

  it("returns 401 for every list route without a session", async () => {
    expect((await app.request("/api/lists")).status).toBe(401);
    expect((await app.request("/api/lists", jsonInit("POST", { name: "x" }))).status).toBe(401);
    expect((await app.request("/api/lists/some-id", jsonInit("PATCH", { name: "x" }))).status).toBe(401);
    expect((await app.request("/api/lists/some-id", { method: "DELETE" })).status).toBe(401);
  });

  it("keeps lists private: another user cannot read, rename, or delete them", async () => {
    const owned = await createList(app, cookie, "Groceries");
    const intruder = await registerUser(app, "intruder@example.com");

    expect(await getLists(app, intruder)).toEqual([]);

    const rename = await app.request(
      `/api/lists/${owned.id}`,
      jsonInit("PATCH", { name: "Hijacked" }, intruder),
    );
    expect(rename.status).toBe(404);

    const remove = await app.request(`/api/lists/${owned.id}`, {
      method: "DELETE",
      headers: { cookie: intruder, origin: "http://localhost:3000" },
    });
    expect(remove.status).toBe(404);

    expect(await getLists(app, cookie)).toEqual([owned]);
  });
});
