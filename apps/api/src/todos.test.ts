import { TodoResponseSchema, TodosResponseSchema } from "@todo/shared";
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
  return ((await res.json()) as { list: { id: string } }).list;
}

async function addTodo(app: App, cookie: string, listId: string, title: string) {
  const res = await app.request(
    `/api/lists/${listId}/todos`,
    jsonInit("POST", { title }, cookie),
  );
  expect(res.status).toBe(201);
  return TodoResponseSchema.parse(await res.json()).todo;
}

async function getTodos(app: App, cookie: string, listId: string) {
  const res = await app.request(`/api/lists/${listId}/todos`, {
    headers: { cookie },
  });
  expect(res.status).toBe(200);
  return TodosResponseSchema.parse(await res.json()).todos;
}

describe("todos", () => {
  let app: App;
  let cookie: string;
  let listId: string;

  beforeEach(async () => {
    app = createApp(await createPgliteDb());
    cookie = await registerUser(app, "owner@example.com");
    listId = (await createList(app, cookie, "Groceries")).id;
  });

  it("starts empty, then lists added todos in creation order", async () => {
    expect(await getTodos(app, cookie, listId)).toEqual([]);

    const milk = await addTodo(app, cookie, listId, "Buy milk");
    const bread = await addTodo(app, cookie, listId, "Buy bread");

    expect(await getTodos(app, cookie, listId)).toEqual([milk, bread]);
    expect(milk.completed).toBe(false);
  });

  it("toggles completion both ways", async () => {
    const created = await addTodo(app, cookie, listId, "Buy milk");

    const done = await app.request(
      `/api/todos/${created.id}`,
      jsonInit("PATCH", { completed: true }, cookie),
    );
    expect(done.status).toBe(200);
    expect(TodoResponseSchema.parse(await done.json()).todo.completed).toBe(true);

    const undone = await app.request(
      `/api/todos/${created.id}`,
      jsonInit("PATCH", { completed: false }, cookie),
    );
    expect(TodoResponseSchema.parse(await undone.json()).todo.completed).toBe(false);
  });

  it("edits the title", async () => {
    const created = await addTodo(app, cookie, listId, "Buy milk");

    const res = await app.request(
      `/api/todos/${created.id}`,
      jsonInit("PATCH", { title: "Buy oat milk" }, cookie),
    );

    expect(res.status).toBe(200);
    expect(TodoResponseSchema.parse(await res.json()).todo.title).toBe("Buy oat milk");
  });

  it("deletes a todo", async () => {
    const created = await addTodo(app, cookie, listId, "Buy milk");

    const res = await app.request(`/api/todos/${created.id}`, {
      method: "DELETE",
      headers: { cookie, origin: "http://localhost:3000" },
    });

    expect(res.status).toBe(204);
    expect(await getTodos(app, cookie, listId)).toEqual([]);
  });

  it("rejects blank titles and empty updates", async () => {
    expect(
      (await app.request(`/api/lists/${listId}/todos`, jsonInit("POST", { title: "  " }, cookie)))
        .status,
    ).toBe(400);

    const created = await addTodo(app, cookie, listId, "Buy milk");
    expect(
      (await app.request(`/api/todos/${created.id}`, jsonInit("PATCH", {}, cookie))).status,
    ).toBe(400);
  });

  it("returns 401 for every todo route without a session", async () => {
    expect((await app.request(`/api/lists/${listId}/todos`)).status).toBe(401);
    expect(
      (await app.request(`/api/lists/${listId}/todos`, jsonInit("POST", { title: "x" }))).status,
    ).toBe(401);
    expect(
      (await app.request("/api/todos/some-id", jsonInit("PATCH", { completed: true }))).status,
    ).toBe(401);
    expect((await app.request("/api/todos/some-id", { method: "DELETE" })).status).toBe(401);
  });

  it("enforces ownership through the parent list for another user's todos", async () => {
    const owned = await addTodo(app, cookie, listId, "Buy milk");
    const intruder = await registerUser(app, "intruder@example.com");

    expect(
      (await app.request(`/api/lists/${listId}/todos`, { headers: { cookie: intruder } })).status,
    ).toBe(404);
    expect(
      (await app.request(`/api/lists/${listId}/todos`, jsonInit("POST", { title: "x" }, intruder)))
        .status,
    ).toBe(404);
    expect(
      (await app.request(`/api/todos/${owned.id}`, jsonInit("PATCH", { completed: true }, intruder)))
        .status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/todos/${owned.id}`, {
          method: "DELETE",
          headers: { cookie: intruder, origin: "http://localhost:3000" },
        })
      ).status,
    ).toBe(404);

    expect(await getTodos(app, cookie, listId)).toEqual([owned]);
  });

  it("deletes a list's todos with the list", async () => {
    await addTodo(app, cookie, listId, "Buy milk");

    const res = await app.request(`/api/lists/${listId}`, {
      method: "DELETE",
      headers: { cookie, origin: "http://localhost:3000" },
    });
    expect(res.status).toBe(204);

    expect((await app.request(`/api/lists/${listId}/todos`, { headers: { cookie } })).status).toBe(
      404,
    );
  });
});
