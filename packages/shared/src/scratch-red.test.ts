import { describe, expect, it } from "vitest";

describe("scratch: CI red-check verification", () => {
  it("deliberately fails so the PR check shows red", () => {
    expect(true).toBe(false);
  });
});
