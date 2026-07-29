import {
  HealthResponseSchema,
  ListNameSchema,
  ListResponseSchema,
  ListsResponseSchema,
  MeResponseSchema,
  type SessionUser,
} from "@todo/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { createAuth } from "./auth";
import type { Db } from "./db";
import { list } from "./db/schema";

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

  return app;
}
