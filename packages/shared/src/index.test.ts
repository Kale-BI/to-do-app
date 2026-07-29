import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./index";

describe("HealthResponseSchema", () => {
  it("parses a healthy response", () => {
    expect(HealthResponseSchema.parse({ status: "ok" })).toEqual({
      status: "ok",
    });
  });

  it("rejects an unknown status", () => {
    expect(() => HealthResponseSchema.parse({ status: "down" })).toThrow();
  });

  it("rejects a payload without a status", () => {
    expect(() => HealthResponseSchema.parse({})).toThrow();
  });
});
