import {
  BlockResponseSchema,
  BlocksResponseSchema,
  CreateBlockSchema,
  HealthResponseSchema,
  ListNameSchema,
  ListResponseSchema,
  ListsResponseSchema,
  MeResponseSchema,
  UpdateBlockSchema,
  type SessionUser,
} from "@todo/shared";
import { and, asc, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { createAuth } from "./auth";
import type { Db } from "./db";
import { block, list } from "./db/schema";

type SessionEnv = { Variables: { user: SessionUser } };

export function createApp(db: Db) {
  const auth = createAuth(db);
  const app = new Hono<SessionEnv>();

  const requireSession = createMiddleware<SessionEnv>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    await next();
  });

  app.get("/api/health", (c) => c.json(HealthResponseSchema.parse({ status: "ok" })));

  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.get("/api/me", requireSession, (c) =>
    c.json(MeResponseSchema.parse({ user: c.get("user") })),
  );

  app.get("/api/lists", requireSession, async (c) => {
    const rows = await db
      .select()
      .from(list)
      .where(eq(list.userId, c.get("user").id))
      .orderBy(list.createdAt);
    return c.json(
      ListsResponseSchema.parse({
        lists: rows.map((row) => ({ id: row.id, name: row.name })),
      }),
    );
  });

  app.post("/api/lists", requireSession, async (c) => {
    const parsed = ListNameSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "A list needs a non-empty name" }, 400);
    }
    const now = new Date();
    const row = {
      id: crypto.randomUUID(),
      name: parsed.data.name,
      userId: c.get("user").id,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(list).values(row);
    return c.json(ListResponseSchema.parse({ list: { id: row.id, name: row.name } }), 201);
  });

  app.patch("/api/lists/:id", requireSession, async (c) => {
    const parsed = ListNameSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "A list needs a non-empty name" }, 400);
    }
    const [row] = await db
      .update(list)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(and(eq(list.id, c.req.param("id")), eq(list.userId, c.get("user").id)))
      .returning();
    if (!row) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json(ListResponseSchema.parse({ list: { id: row.id, name: row.name } }));
  });

  app.delete("/api/lists/:id", requireSession, async (c) => {
    const [row] = await db
      .delete(list)
      .where(and(eq(list.id, c.req.param("id")), eq(list.userId, c.get("user").id)))
      .returning();
    if (!row) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.body(null, 204);
  });

  async function ownedList(listId: string, userId: string) {
    const [row] = await db
      .select({ id: list.id })
      .from(list)
      .where(and(eq(list.id, listId), eq(list.userId, userId)));
    return row;
  }

  async function ownedBlock(blockId: string, userId: string) {
    const [row] = await db
      .select({ id: block.id })
      .from(block)
      .innerJoin(list, eq(block.listId, list.id))
      .where(and(eq(block.id, blockId), eq(list.userId, userId)));
    return row;
  }

  function toBlock(row: typeof block.$inferSelect) {
    return {
      id: row.id,
      text: row.text,
      completed: row.completed,
      kind: row.kind,
      position: row.position,
    };
  }

  app.get("/api/lists/:listId/blocks", requireSession, async (c) => {
    if (!(await ownedList(c.req.param("listId"), c.get("user").id))) {
      return c.json({ error: "Not found" }, 404);
    }
    const rows = await db
      .select()
      .from(block)
      .where(eq(block.listId, c.req.param("listId")))
      .orderBy(asc(block.position), asc(block.createdAt));
    return c.json(BlocksResponseSchema.parse({ blocks: rows.map(toBlock) }));
  });

  app.post("/api/lists/:listId/blocks", requireSession, async (c) => {
    if (!(await ownedList(c.req.param("listId"), c.get("user").id))) {
      return c.json({ error: "Not found" }, 404);
    }
    const parsed = CreateBlockSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Not a valid block" }, 400);
    }
    let position = parsed.data.position;
    if (position === undefined) {
      const [tail] = await db
        .select({ max: max(block.position) })
        .from(block)
        .where(eq(block.listId, c.req.param("listId")));
      position = (tail?.max ?? 0) + 1;
    }
    const now = new Date();
    const row = {
      id: parsed.data.id ?? crypto.randomUUID(),
      text: parsed.data.text,
      completed: false,
      kind: parsed.data.kind,
      position,
      listId: c.req.param("listId"),
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(block).values(row);
    return c.json(BlockResponseSchema.parse({ block: toBlock(row) }), 201);
  });

  app.patch("/api/blocks/:id", requireSession, async (c) => {
    if (!(await ownedBlock(c.req.param("id"), c.get("user").id))) {
      return c.json({ error: "Not found" }, 404);
    }
    const parsed = UpdateBlockSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Nothing valid to update" }, 400);
    }
    const [row] = await db
      .update(block)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(block.id, c.req.param("id")))
      .returning();
    if (!row) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json(BlockResponseSchema.parse({ block: toBlock(row) }));
  });

  app.delete("/api/blocks/:id", requireSession, async (c) => {
    if (!(await ownedBlock(c.req.param("id"), c.get("user").id))) {
      return c.json({ error: "Not found" }, 404);
    }
    await db.delete(block).where(eq(block.id, c.req.param("id")));
    return c.body(null, 204);
  });

  return app;
}
