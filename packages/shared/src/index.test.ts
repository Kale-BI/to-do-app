import { describe, expect, it } from "vitest";
import {
  CreateBlockSchema,
  HealthResponseSchema,
  UpdateBlockSchema,
} from "./index";

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

describe("CreateBlockSchema", () => {
  it("defaults to an empty todo line", () => {
    expect(CreateBlockSchema.parse({})).toEqual({ text: "", kind: "todo" });
  });

  it("accepts any core block kind", () => {
    expect(CreateBlockSchema.parse({ kind: "h1", text: "Errands" })).toEqual({
      text: "Errands",
      kind: "h1",
    });
  });

  it("rejects an unknown kind", () => {
    expect(() => CreateBlockSchema.parse({ kind: "callout" })).toThrow();
  });
});

describe("UpdateBlockSchema", () => {
  it("accepts a lone position change", () => {
    expect(UpdateBlockSchema.parse({ position: 2.5 })).toEqual({
      position: 2.5,
    });
  });

  it("rejects an empty patch", () => {
    expect(() => UpdateBlockSchema.parse({})).toThrow();
  });
});
