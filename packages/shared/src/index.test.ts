import { describe, expect, it } from "vitest";
import {
  BlockSchema,
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

describe("BlockSchema", () => {
  const undated = {
    id: "b1",
    text: "Buy milk",
    completed: false,
    kind: "todo" as const,
    position: 1,
  };

  it("parses a block without a due date exactly as before", () => {
    expect(BlockSchema.parse(undated)).toEqual(undated);
  });

  it("carries a due date on any block kind", () => {
    for (const kind of ["todo", "p", "h1", "h2", "divider"] as const) {
      expect(BlockSchema.parse({ ...undated, kind, dueOn: "2026-08-28" }).dueOn).toBe(
        "2026-08-28",
      );
    }
  });

  it("reads an explicitly undated block as null", () => {
    expect(BlockSchema.parse({ ...undated, dueOn: null }).dueOn).toBeNull();
  });

  it("rejects a due date that is a timestamp or a non-date", () => {
    expect(() => BlockSchema.parse({ ...undated, dueOn: "2026-08-28T09:00:00Z" })).toThrow();
    expect(() => BlockSchema.parse({ ...undated, dueOn: "friday" })).toThrow();
    expect(() => BlockSchema.parse({ ...undated, dueOn: "2026-02-30" })).toThrow();
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

  it("accepts a due date being set", () => {
    expect(UpdateBlockSchema.parse({ dueOn: "2026-08-28" })).toEqual({
      dueOn: "2026-08-28",
    });
  });

  it("accepts { dueOn: null } as a real edit that clears the date", () => {
    expect(UpdateBlockSchema.parse({ dueOn: null })).toEqual({ dueOn: null });
  });

  it("rejects a patch of unknown keys only, which is empty once stripped", () => {
    expect(() => UpdateBlockSchema.parse({ notAField: 1 })).toThrow();
  });

  it("leaves the date alone when dueOn is absent", () => {
    expect(UpdateBlockSchema.parse({ text: "Buy oat milk" })).not.toHaveProperty("dueOn");
  });
});
