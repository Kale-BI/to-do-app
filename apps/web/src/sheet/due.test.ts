import { describe, expect, it } from "vitest";
import {
  consumeDueToken,
  formatDue,
  isOverdue,
  resolveDueToken,
  today,
} from "./due";

// A fixed clock so the vocabulary can be read against a known day.
// 2026-08-24 is a Monday.
const MONDAY = new Date(2026, 7, 24, 9, 30);

describe("resolveDueToken", () => {
  it("resolves the fixed vocabulary against the local clock", () => {
    expect(resolveDueToken("today", MONDAY)).toBe("2026-08-24");
    expect(resolveDueToken("tomorrow", MONDAY)).toBe("2026-08-25");
    expect(resolveDueToken("friday", MONDAY)).toBe("2026-08-28");
    expect(resolveDueToken("fri", MONDAY)).toBe("2026-08-28");
    expect(resolveDueToken("SUNDAY", MONDAY)).toBe("2026-08-30");
    expect(resolveDueToken("2027-01-05", MONDAY)).toBe("2027-01-05");
  });

  it("reads a weekday as the nearest one, today included", () => {
    expect(resolveDueToken("monday", MONDAY)).toBe("2026-08-24");
  });

  it("leaves anything outside the vocabulary alone", () => {
    expect(resolveDueToken("soon", MONDAY)).toBeNull();
    expect(resolveDueToken("example.com", MONDAY)).toBeNull();
    expect(resolveDueToken("2026-02-30", MONDAY)).toBeNull();
    expect(resolveDueToken("2026-13-01", MONDAY)).toBeNull();
  });
});

describe("consumeDueToken", () => {
  it("takes a token out only once a space finishes it", () => {
    expect(consumeDueToken("Buy milk @fri", { commit: false }, MONDAY)).toBeNull();
    expect(consumeDueToken("Buy milk @friday ", { commit: false }, MONDAY)).toEqual({
      text: "Buy milk",
      dueOn: "2026-08-28",
      caret: 8,
    });
  });

  it("takes a trailing token when the line is committed", () => {
    expect(consumeDueToken("Buy milk @friday", { commit: true }, MONDAY)).toEqual({
      text: "Buy milk",
      dueOn: "2026-08-28",
      caret: 8,
    });
  });

  it("closes the words up around a token written mid-line", () => {
    expect(consumeDueToken("Call @tomorrow the plumber", { commit: false }, MONDAY)).toEqual({
      text: "Call the plumber",
      dueOn: "2026-08-25",
      caret: 5,
    });
  });

  it("leaves text that only looks like a token as content", () => {
    expect(consumeDueToken("Email bob@example.com ", { commit: true }, MONDAY)).toBeNull();
    expect(consumeDueToken("Ask @carol about it ", { commit: true }, MONDAY)).toBeNull();
    expect(consumeDueToken("Read @2026-02-30 ", { commit: true }, MONDAY)).toBeNull();
  });
});

describe("formatDue", () => {
  it("pencils the day and month, adding a year only when it is another one", () => {
    expect(formatDue("2026-08-29", MONDAY)).toBe("29 AUG");
    expect(formatDue("2026-09-03", MONDAY)).toBe("3 SEP");
    expect(formatDue("2027-01-05", MONDAY)).toBe("5 JAN 27");
  });
});

describe("isOverdue", () => {
  it("counts yesterday as late and today as not", () => {
    expect(isOverdue("2026-08-23", MONDAY)).toBe(true);
    expect(isOverdue("2026-08-24", MONDAY)).toBe(false);
    expect(isOverdue("2026-08-25", MONDAY)).toBe(false);
  });
});

describe("today", () => {
  it("reads the local day, not a UTC one", () => {
    // Late enough in the day that a UTC reading would roll the date over in
    // any timezone east of London.
    expect(today(new Date(2026, 7, 24, 23, 45))).toBe("2026-08-24");
  });
});
