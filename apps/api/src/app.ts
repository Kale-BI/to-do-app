import { HealthResponseSchema, MeResponseSchema } from "@todo/shared";
import { Hono } from "hono";
import { createAuth } from "./auth";
import type { Db } from "./db";

export function createApp(db: Db) {
  const auth = createAuth(db);
  const app = new Hono();

  app.get("/api/health", (c) => c.json(HealthResponseSchema.parse({ status: "ok" })));

  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  app.get("/api/me", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.json(
      MeResponseSchema.parse({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      }),
    );
  });

  return app;
}
