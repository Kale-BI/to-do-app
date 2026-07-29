import type { HealthResponse } from "@todo/shared";
import { Hono } from "hono";

export const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" } satisfies HealthResponse));
