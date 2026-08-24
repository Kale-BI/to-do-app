// Due dates on the sheet: a plain calendar day, written as a pencil annotation
// in the right margin. Everything here is pure and takes its reference day as
// an argument, so the whole vocabulary can be listed in tests without faking a
// clock. The API never sees a token — only a resolved ISO date.

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// The token is the last word on the line: an "@" on a word boundary, word
// characters, and nothing after it but blanks. "e@mail" and "@friday!" are
// ordinary text and never match.
const TOKEN = /(^|\s)@([A-Za-z0-9-]+)(\s*)$/;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A local calendar day as YYYY-MM-DD. Never UTC: a date is the day you saw. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today by the browser's own clock, so "today" means the reader's today. */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

function addDays(reference: Date, days: number): Date {
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate() + days,
  );
}

function isoLiteral(word: string): string | null {
  const match = ISO.exec(word);
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(year, month - 1, day);
  // Reject the days that do not exist: 2026-02-30 would roll into March.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return toIsoDate(date);
}

// The vocabulary, in full: today, tomorrow, the weekday names, ISO literals.
// Anything else is text the writer meant to keep.
function resolveWord(word: string, reference: Date): string | null {
  const lower = word.toLowerCase();
  if (lower === "today") return toIsoDate(reference);
  if (lower === "tomorrow") return toIsoDate(addDays(reference, 1));

  const weekday = WEEKDAYS.indexOf(lower as (typeof WEEKDAYS)[number]);
  if (weekday !== -1) {
    // A weekday name always points forward: naming today's own weekday means
    // the one a week out, never the morning already gone.
    const ahead = (weekday - reference.getDay() + 7) % 7 || 7;
    return toIsoDate(addDays(reference, ahead));
  }

  return isoLiteral(lower);
}

/**
 * Read a trailing date token off a line. Returns the resolved day and the line
 * with the token taken out of it — the date is written on the page exactly
 * once, in the margin — or null when the line ends in ordinary text.
 *
 * The token and the single blank in front of it go; blanks typed after it stay,
 * so resolving mid-sentence leaves the writer's spacing where they put it.
 */
export function resolveDueToken(
  text: string,
  reference: Date,
): { dueOn: string; text: string } | null {
  const match = TOKEN.exec(text);
  if (!match) return null;
  const dueOn = resolveWord(match[2]!, reference);
  if (!dueOn) return null;
  return { dueOn, text: text.slice(0, match.index) + match[3] };
}

export type DueState = "upcoming" | "overdue" | "done";

/**
 * How heavily a date reads. A finished task is never late, whatever its date;
 * a date is late only once its day is behind the reader — due today is still
 * upcoming, and that boundary is where the weight changes.
 */
export function dueState(
  dueOn: string,
  today: string,
  completed: boolean,
): DueState {
  if (completed) return "done";
  return dueOn < today ? "overdue" : "upcoming";
}

/** Pencil-margin form: "1 Sep", carrying the year only when it is not this one. */
export function formatDue(dueOn: string, today: string): string {
  const match = ISO.exec(dueOn);
  if (!match) return dueOn;
  const written = `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}`;
  return match[1] === today.slice(0, 4) ? written : `${written} ${match[1]}`;
}
