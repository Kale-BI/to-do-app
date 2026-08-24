import { describe, expect, it } from "vitest";
import {
  dueState,
  formatDue,
  resolveDueToken,
  todayIso,
  toIsoDate,
} from "./dueDate";

// A Wednesday, so "wednesday" has to point a week out rather than at itself.
const WEDNESDAY = new Date(2026, 7, 26);

function resolve(text: string, reference = WEDNESDAY) {
  return resolveDueToken(text, reference);
}

describe("resolveDueToken vocabulary", () => {
  it("resolves today and tomorrow against the reference day", () => {
    expect(resolve("buy milk @today")?.dueOn).toBe("2026-08-26");
    expect(resolve("buy milk @tomorrow")?.dueOn).toBe("2026-08-27");
  });

  it("resolves every weekday name to the next one ahead", () => {
    const expected: Record<string, string> = {
      monday: "2026-08-31",
      tuesday: "2026-09-01",
      wednesday: "2026-09-02",
      thursday: "2026-08-27",
      friday: "2026-08-28",
      saturday: "2026-08-29",
      sunday: "2026-08-30",
    };
    for (const [word, dueOn] of Object.entries(expected)) {
      expect(resolve(`buy milk @${word}`)?.dueOn, word).toBe(dueOn);
    }
  });

  it("reads a weekday naming today as a week out, not this morning", () => {
    expect(resolve("buy milk @wednesday")?.dueOn).toBe("2026-09-02");
  });

  it("resolves ISO literals, including ones far from the reference day", () => {
    expect(resolve("buy milk @2026-09-01")?.dueOn).toBe("2026-09-01");
    expect(resolve("buy milk @2027-01-01")?.dueOn).toBe("2027-01-01");
    expect(resolve("buy milk @2024-02-29")?.dueOn).toBe("2024-02-29");
  });

  it("ignores the case a word is typed in", () => {
    expect(resolve("buy milk @Friday")?.dueOn).toBe("2026-08-28");
    expect(resolve("buy milk @TODAY")?.dueOn).toBe("2026-08-26");
  });

  it("leaves text that only looks like a token exactly as typed", () => {
    const untouched = [
      "buy milk",
      "buy milk @fri",
      "buy milk @yesterday",
      "buy milk @next friday",
      "buy milk @in 3 days",
      "buy milk @friday!",
      "buy milk @01/09/2026",
      "buy milk @2026-13-01", // no thirteenth month
      "buy milk @2026-02-30", // no such day
      "buy milk @2026-9-1", // not an ISO literal
      "mail bob@example.com", // "@" needs a word boundary in front of it
      "buy milk friday",
      "buy milk @",
      "@ friday",
    ];
    for (const text of untouched) {
      expect(resolve(text), text).toBeNull();
    }
  });

  it("only reads a token at the end of the line", () => {
    expect(resolve("@friday buy milk")).toBeNull();
    expect(resolve("buy @friday milk")).toBeNull();
  });
});

describe("resolveDueToken text consumption", () => {
  it("takes the token and the blank in front of it out of the line", () => {
    expect(resolve("buy milk @friday")?.text).toBe("buy milk");
  });

  it("keeps blanks typed after the token, so the writer's spacing survives", () => {
    expect(resolve("buy milk @friday ")?.text).toBe("buy milk ");
  });

  it("leaves an empty line when the token was the whole of it", () => {
    expect(resolve("@friday")?.text).toBe("");
  });
});

describe("toIsoDate", () => {
  it("writes the local calendar day, never a UTC one", () => {
    // Late enough in the evening to be the next day in UTC anywhere east.
    expect(toIsoDate(new Date(2026, 8, 1, 23, 30))).toBe("2026-09-01");
    expect(toIsoDate(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
  });

  it("gives todayIso the same reading of the clock", () => {
    const now = new Date(2026, 8, 1, 23, 30);
    expect(todayIso(now)).toBe(toIsoDate(now));
  });
});

describe("dueState", () => {
  it("reads a date still ahead as upcoming", () => {
    expect(dueState("2026-08-27", "2026-08-26", false)).toBe("upcoming");
  });

  it("turns late on the day after the date, and not a day before", () => {
    // The boundary: due today still reads as upcoming; yesterday reads as late.
    expect(dueState("2026-08-26", "2026-08-26", false)).toBe("upcoming");
    expect(dueState("2026-08-25", "2026-08-26", false)).toBe("overdue");
  });

  it("crosses a year and a month boundary the same way", () => {
    expect(dueState("2026-12-31", "2027-01-01", false)).toBe("overdue");
    expect(dueState("2026-09-01", "2026-08-31", false)).toBe("upcoming");
  });

  it("never calls a finished task late", () => {
    expect(dueState("2020-01-01", "2026-08-26", true)).toBe("done");
    expect(dueState("2026-12-31", "2026-08-26", true)).toBe("done");
  });
});

describe("formatDue", () => {
  it("writes the day and month for a date in this year", () => {
    expect(formatDue("2026-09-01", "2026-08-26")).toBe("1 Sep");
    expect(formatDue("2026-12-31", "2026-08-26")).toBe("31 Dec");
  });

  it("carries the year when it is not this one", () => {
    expect(formatDue("2027-01-01", "2026-08-26")).toBe("1 Jan 2027");
  });
});
