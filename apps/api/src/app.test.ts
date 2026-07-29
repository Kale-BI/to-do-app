import { HealthResponseSchema } from "@todo/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createDb } from "./db";

describe("GET /api/health", () => {
  it("responds 200 with a payload matching the shared health contract", async () => {
    const app = createApp(createDb(":memory:"));
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(HealthResponseSchema.parse(await res.json())).toEqual({
      status: "ok",
    });
  });

  it("responds 404 for unknown routes", async () => {
    const app = createApp(createDb(":memory:"));
    const res = await app.request("/api/nope");

    expect(res.status).toBe(404);
  });
});
