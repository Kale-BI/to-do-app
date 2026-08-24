// Dates typed onto a line. The vocabulary is small and fixed — `today`,
// `tomorrow`, a weekday name, or an ISO day — and it resolves here, in the
// browser, against the reader's own clock. The API only ever sees a plain
// calendar day; a token never leaves this file.

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const WEEKDAY_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(from: Date, days: number): Date {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** The reader's own today, as a plain calendar day. */
export function today(now: Date = new Date()): string {
  return isoDay(now);
}

/**
 * The day a single token means, or null if the word is not one of ours —
 * in which case the writer meant it as text and it is left alone.
 */
export function resolveDueToken(word: string, now: Date = new Date()): string | null {
  const token = word.toLowerCase();
  if (token === "today") return isoDay(now);
  if (token === "tomorrow") return isoDay(addDays(now, 1));

  const named = WEEKDAYS.indexOf(token);
  const short = WEEKDAY_SHORT.indexOf(token);
  const weekday = named === -1 ? short : named;
  if (weekday !== -1) {
    // The nearest such weekday, today included: `@friday` written on a Friday
    // means today, not a week away.
    return isoDay(addDays(now, (weekday - now.getDay() + 7) % 7));
  }

  if (ISO_DAY.test(token)) {
    const [year, month, day] = token.split("-").map(Number) as [number, number, number];
    const date = new Date(year, month - 1, day);
    // A well-formed string is not necessarily a real day: 2026-02-30 rolls
    // over into March, and that is not what the writer asked for.
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return token;
    }
  }

  return null;
}

export type ConsumedToken = {
  /** The line with the token taken out of it. */
  text: string;
  dueOn: string;
  /** Where the caret belongs once the token is gone. */
  caret: number;
};

// A token has to start the line or follow a space, so `bob@example.com` is an
// address and stays one.
const TOKEN = /(^|\s)@([A-Za-z]+|\d{4}-\d{2}-\d{2})(?=\s|$)/g;

/**
 * Take a finished token out of a line and hand back the day it meant.
 *
 * A token is finished when a space is typed after it, or — with `commit` —
 * when the line itself is committed by Enter or by leaving it. Mid-word the
 * answer is null, so half-typed `@fri` is never snatched from under the caret.
 */
export function consumeDueToken(
  text: string,
  { commit }: { commit: boolean },
  now: Date = new Date(),
): ConsumedToken | null {
  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(text)) !== null) {
    const start = match.index + match[1]!.length;
    const end = start + 1 + match[2]!.length;
    const terminator = text[end];
    if (terminator === undefined && !commit) continue;

    const dueOn = resolveDueToken(match[2]!, now);
    if (!dueOn) continue;

    // The token takes its terminating space with it, so the words either side
    // of it close up rather than leaving a gap.
    const cut = terminator === undefined ? text.length : end + 1;
    const next = (text.slice(0, start) + text.slice(cut)).replace(/\s+$/, "");
    return { text: next, dueOn, caret: Math.min(start, next.length) };
  }
  return null;
}

/** The date as it is pencilled into the margin: `29 AUG`, `29 AUG 27`. */
export function formatDue(dueOn: string, now: Date = new Date()): string {
  const [year, month, day] = dueOn.split("-").map(Number) as [number, number, number];
  const stamp = `${day} ${MONTHS[month - 1]}`;
  return year === now.getFullYear() ? stamp : `${stamp} ${String(year).slice(2)}`;
}

/** Yesterday is late, today is not. */
export function isOverdue(dueOn: string, now: Date = new Date()): boolean {
  return dueOn < isoDay(now);
}
