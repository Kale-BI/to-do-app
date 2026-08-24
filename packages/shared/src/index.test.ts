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

describe("BlockSchema", () => {
  const line = {
    id: "b1",
    text: "Buy milk",
    completed: false,
    kind: "todo",
    position: 1,
  };

  it("carries a due date on a read block", () => {
    expect(BlockSchema.parse({ ...line, dueOn: "2026-09-01" }).dueOn).toBe("2026-09-01");
  });

  it("reads a dateless block as null", () => {
    expect(BlockSchema.parse({ ...line, dueOn: null }).dueOn).toBeNull();
  });

  it("stays parseable for a block with no date key at all", () => {
    expect(BlockSchema.parse(line).dueOn).toBeUndefined();
  });

  it("rejects a malformed date string", () => {
    expect(() => BlockSchema.parse({ ...line, dueOn: "friday" })).toThrow();
    expect(() => BlockSchema.parse({ ...line, dueOn: "2026-13-01" })).toThrow();
    expect(() => BlockSchema.parse({ ...line, dueOn: "01/09/2026" })).toThrow();
    expect(() => BlockSchema.parse({ ...line, dueOn: "2026-09-01T00:00:00Z" })).toThrow();
  });
});

describe("CreateBlockSchema due date", () => {
  it("accepts a line born with a date", () => {
    expect(CreateBlockSchema.parse({ text: "Buy milk", dueOn: "2026-09-01" })).toEqual({
      text: "Buy milk",
      kind: "todo",
      dueOn: "2026-09-01",
    });
  });

  it("rejects a malformed date", () => {
    expect(() => CreateBlockSchema.parse({ dueOn: "next friday" })).toThrow();
  });
});

describe("UpdateBlockSchema due date", () => {
  it("accepts setting a date", () => {
    expect(UpdateBlockSchema.parse({ dueOn: "2026-09-01" })).toEqual({
      dueOn: "2026-09-01",
    });
  });

  it("rejects a malformed date", () => {
    expect(() => UpdateBlockSchema.parse({ dueOn: "2026-9-1" })).toThrow();
    expect(() => UpdateBlockSchema.parse({ dueOn: "tomorrow" })).toThrow();
  });

  // The refine asks whether the key is present, not whether it is defined.
  // Comparing against undefined would read a cleared date as an empty patch.
  it("treats a patch of only a cleared date as a real edit, not an empty patch", () => {
    expect(UpdateBlockSchema.parse({ dueOn: null })).toEqual({ dueOn: null });
  });

  it("distinguishes clearing a date from leaving it alone", () => {
    expect("dueOn" in UpdateBlockSchema.parse({ dueOn: null })).toBe(true);
    expect("dueOn" in UpdateBlockSchema.parse({ text: "Buy milk" })).toBe(false);
  });
});
