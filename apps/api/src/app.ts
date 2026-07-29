import { HealthResponseSchema } from "@todo/shared";
import { Hono } from "hono";

export const app = new Hono();

app.get("/api/health", (c) => c.json(HealthResponseSchema.parse({ status: "ok" })));
