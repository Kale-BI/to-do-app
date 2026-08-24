import { useState, type FocusEvent } from "react";
import type { Block } from "@todo/shared";
import { dueState, formatDue, type DueState } from "./dueDate";
import { DueDateIcon } from "./icons";

// A due date reads as weight, never as colour: faded pencil while it is ahead
// of you, full ink once it has slipped, faintest of all once the line is
// crossed off — a finished task is not late.
const DUE_INK: Record<DueState, string> = {
  upcoming: "text-ink-faded",
  overdue: "text-ink",
  done: "text-ink-faint",
};

/**
 * The right-margin date: a pencil annotation when the line has one, a margin
 * affordance in the same family as cross-off and tear-up when it does not.
 * Setting and clearing both happen here — there is no clearing token, because a
 * clear should not be reachable by a slip mid-sentence.
 */
export function DueMargin({
  block,
  label,
  today,
  onSetDue,
}: {
  block: Block;
  label: string;
  today: string;
  onSetDue: (id: string, dueOn: string | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const dueOn = block.dueOn ?? null;
  const state = dueOn ? dueState(dueOn, today, block.completed) : null;
  const written = dueOn ? formatDue(dueOn, today) : null;

  function pick(next: string | null) {
    setPicking(false);
    onSetDue(block.id, next);
  }

  // A click landing outside the scrap closes it; a click travelling between the
  // field and the clear mark does not.
  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setPicking(false);
  }

  return (
    <span
      className="relative flex justify-end pt-[0.5em] pl-2"
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") setPicking(false);
      }}
    >
      {dueOn && written && state ? (
        <button
          type="button"
          data-due={dueOn}
          data-due-state={state}
          aria-label={`${state === "overdue" ? "Overdue" : "Due"} ${written}, ${label}`}
          title="Change or clear the date"
          onClick={() => setPicking((open) => !open)}
          className={`desk-label focus-pencil text-[0.625rem] whitespace-nowrap ${DUE_INK[state]}`}
        >
          {written}
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Set a due date for ${label}`}
          title="Due date"
          onClick={() => setPicking((open) => !open)}
          className="line-tool focus-pencil h-4 w-4 text-ink-faded hover:text-ink"
        >
          <DueDateIcon className="h-full w-full" />
        </button>
      )}

      {picking ? (
        <span
          className="menu-paper absolute top-full right-0 z-20 mt-1 flex items-center gap-2 px-2 py-1.5"
          role="group"
          aria-label={`Due date for ${label}`}
        >
          <input
            type="date"
            autoFocus
            aria-label="Due date"
            defaultValue={dueOn ?? ""}
            onChange={(event) => pick(event.target.value || null)}
            className="typed-input desk-label px-1 py-0 text-[0.6875rem] tracking-[0.06em]"
          />
          <button
            type="button"
            aria-label={`Clear the due date on ${label}`}
            onClick={() => pick(null)}
            disabled={!dueOn}
            className="desk-label focus-pencil text-[0.625rem] text-ink-faded hover:text-ink disabled:opacity-40"
          >
            Clear
          </button>
        </span>
      ) : null}
    </span>
  );
}
