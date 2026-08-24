import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Block, BlockKind } from "@todo/shared";
import {
  caretOffset,
  caretOnFirstLine,
  caretOnLastLine,
  placeCaret,
  selectionCollapsed,
} from "./caret";
import { CrossIcon, StrikeIcon, UnstrikeIcon } from "./icons";
import { consumeDueToken, formatDue, isOverdue } from "./due";

export type BlockLineHandle = {
  focus: (offset: number | "end") => void;
  setTextAndCaret: (text: string, caret: number) => void;
  getText: () => string;
  el: () => HTMLElement | null;
};

export type MenuKey = "ArrowUp" | "ArrowDown" | "Enter" | "Escape" | "Tab";

type Transform = { kind: BlockKind; text: string; removed: number };

function detectTransform(kind: BlockKind, text: string): Transform | null {
  if (text === "---" && kind !== "divider")
    return { kind: "divider", text: "", removed: 3 };
  if (text.startsWith("## ") && kind !== "h2")
    return { kind: "h2", text: text.slice(3), removed: 3 };
  if (text.startsWith("# ") && kind !== "h1")
    return { kind: "h1", text: text.slice(2), removed: 2 };
  if (text.startsWith("[] ") && kind !== "todo")
    return { kind: "todo", text: text.slice(3), removed: 3 };
  if (text.startsWith("[ ] ") && kind !== "todo")
    return { kind: "todo", text: text.slice(4), removed: 4 };
  return null;
}

const KIND_TEXT_CLASS: Record<Exclude<BlockKind, "divider">, string> = {
  todo: "text-[0.9375rem] leading-[1.9]",
  p: "text-[0.9375rem] leading-[1.9]",
  h1: "mt-2 text-[1.375rem] uppercase tracking-[0.07em] leading-[1.5]",
  h2: "mt-1 text-[1.0625rem] uppercase tracking-[0.05em] leading-[1.6]",
};

const KIND_GAP_CLASS: Record<BlockKind, string> = {
  todo: "",
  p: "",
  h1: "mt-5 first:mt-0",
  h2: "mt-3 first:mt-0",
  divider: "my-2",
};

const PLACEHOLDER: Record<Exclude<BlockKind, "divider">, string> = {
  todo: "Type a task, or press / for blocks",
  p: "Type a note",
  h1: "Heading",
  h2: "Heading",
};

export function BlockLine({
  block,
  menuOpen,
  registerRef,
  onInput,
  onTransform,
  onSplit,
  onEnterAtStart,
  onConvertToP,
  onMergeBack,
  onDeleteForward,
  onNavigate,
  onToggle,
  onDue,
  onDelete,
  onSlashOpen,
  onMenuKey,
  onBlur,
}: {
  block: Block;
  menuOpen: boolean;
  registerRef: (id: string, handle: BlockLineHandle | null) => void;
  onInput: (id: string, text: string) => void;
  onTransform: (id: string, kind: BlockKind, text: string) => void;
  onSplit: (id: string, before: string, after: string) => void;
  onEnterAtStart: (id: string) => void;
  onConvertToP: (id: string, text: string) => void;
  onMergeBack: (id: string, text: string) => void;
  onDeleteForward: (id: string, text: string) => void;
  onNavigate: (id: string, dir: -1 | 1) => void;
  onToggle: (id: string, completed: boolean) => void;
  onDue: (id: string, dueOn: string | null) => void;
  onDelete: (id: string) => void;
  onSlashOpen: (id: string, slashOffset: number) => void;
  onMenuKey: (key: MenuKey) => void;
  onBlur: (id: string) => void;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const wasCompleted = useRef(block.completed);
  const [strikeAnimated, setStrikeAnimated] = useState(false);

  // The contentEditable is uncontrolled while focused; sync external changes.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el && document.activeElement !== el && el.textContent !== block.text) {
      el.textContent = block.text;
    }
  });

  useLayoutEffect(() => {
    if (block.completed && !wasCompleted.current) setStrikeAnimated(true);
    if (!block.completed) setStrikeAnimated(false);
    wasCompleted.current = block.completed;
  }, [block.completed]);

  useLayoutEffect(() => {
    const handle: BlockLineHandle = {
      focus(offset) {
        const el = textRef.current;
        if (!el) return;
        el.focus();
        const length = el.textContent?.length ?? 0;
        placeCaret(el, offset === "end" ? length : offset);
      },
      setTextAndCaret(text, caret) {
        const el = textRef.current;
        if (!el) return;
        el.textContent = text;
        placeCaret(el, caret);
      },
      getText: () => textRef.current?.textContent ?? "",
      el: () => textRef.current,
    };
    registerRef(block.id, handle);
    return () => registerRef(block.id, null);
  }, [block.id, registerRef]);

  if (block.kind === "divider") {
    return (
      <DividerLine
        block={block}
        registerRef={registerRef}
        onNavigate={onNavigate}
        onDelete={onDelete}
        onSplit={onSplit}
      />
    );
  }

  const kind = block.kind;

  // Only a task line takes a date, so a token typed into a note or a heading
  // stays what it plainly is: text. Nothing is consumed where the date would
  // have nowhere to show.
  function takeDueToken(commit: boolean): boolean {
    const el = textRef.current;
    if (!el || kind !== "todo") return false;
    const consumed = consumeDueToken(el.textContent ?? "", { commit });
    if (!consumed) return false;
    el.textContent = consumed.text;
    if (document.activeElement === el) placeCaret(el, consumed.caret);
    onInput(block.id, consumed.text);
    onDue(block.id, consumed.dueOn);
    return true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const el = textRef.current;
    if (!el) return;

    if (
      menuOpen &&
      ["ArrowUp", "ArrowDown", "Enter", "Escape", "Tab"].includes(event.key)
    ) {
      event.preventDefault();
      onMenuKey(event.key as MenuKey);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey) {
        if (kind === "todo") onToggle(block.id, !block.completed);
        return;
      }
      takeDueToken(true);
      const text = el.textContent ?? "";
      const offset = caretOffset(el) ?? text.length;
      const before = text.slice(0, offset);
      const after = text.slice(offset);
      if (before === "" && after !== "") {
        onEnterAtStart(block.id);
        return;
      }
      el.textContent = before;
      onSplit(block.id, before, after);
      return;
    }

    const collapsed = selectionCollapsed();
    const offset = collapsed ? caretOffset(el) : null;
    const length = el.textContent?.length ?? 0;

    if (event.key === "Backspace" && offset === 0) {
      event.preventDefault();
      const text = el.textContent ?? "";
      if (kind !== "p") onConvertToP(block.id, text);
      else onMergeBack(block.id, text);
      return;
    }

    if (event.key === "Delete" && offset === length) {
      event.preventDefault();
      onDeleteForward(block.id, el.textContent ?? "");
      return;
    }

    if (event.key === "ArrowUp" && collapsed && caretOnFirstLine(el)) {
      event.preventDefault();
      onNavigate(block.id, -1);
      return;
    }
    if (event.key === "ArrowDown" && collapsed && caretOnLastLine(el)) {
      event.preventDefault();
      onNavigate(block.id, 1);
      return;
    }
    if (event.key === "ArrowLeft" && offset === 0) {
      event.preventDefault();
      onNavigate(block.id, -1);
      return;
    }
    if (event.key === "ArrowRight" && offset === length) {
      event.preventDefault();
      onNavigate(block.id, 1);
      return;
    }

    if (event.key === "/" && !menuOpen) {
      onSlashOpen(block.id, caretOffset(el) ?? length);
    }
  }

  function handleInput() {
    const el = textRef.current;
    if (!el) return;
    const text = el.textContent ?? "";
    if (!menuOpen) {
      const transform = detectTransform(kind, text);
      if (transform) {
        if (transform.kind !== "divider") {
          const offset = caretOffset(el) ?? text.length;
          el.textContent = transform.text;
          placeCaret(el, Math.max(0, offset - transform.removed));
        }
        onTransform(block.id, transform.kind, transform.text);
        return;
      }
      if (takeDueToken(false)) return;
    }
    onInput(block.id, text);
  }

  const isTodo = kind === "todo";
  const done = isTodo && block.completed;
  const label = block.text.trim() || "empty line";
  // A date lives on the record whatever the line has become, but only a task
  // line wears one.
  const dueOn = isTodo ? (block.dueOn ?? null) : null;
  const overdue = dueOn !== null && !done && isOverdue(dueOn);

  return (
    <div
      className={`block-line group grid grid-cols-[2rem_1fr_4.75rem_2rem] items-start ${KIND_GAP_CLASS[kind]} -mx-8`}
      data-kind={kind}
      data-completed={done || undefined}
      data-due={dueOn ?? undefined}
      data-overdue={overdue || undefined}
    >
      <span className="flex justify-center pt-[0.45em]">
        {isTodo ? (
          <button
            type="button"
            aria-pressed={block.completed}
            aria-label={
              block.completed ? `Uncross ${label}` : `Cross off ${label}`
            }
            onClick={() => onToggle(block.id, !block.completed)}
            className="line-tool focus-pencil h-5 w-5 text-ribbon"
            title={block.completed ? "Uncross" : "Cross off"}
          >
            {block.completed ? (
              <UnstrikeIcon className="h-full w-full" />
            ) : (
              <StrikeIcon className="h-full w-full" />
            )}
          </button>
        ) : null}
      </span>
      <div className="relative min-w-0">
        <div
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-placeholder={PLACEHOLDER[kind]}
          className={`block-text typed ${KIND_TEXT_CLASS[kind]} ${
            done ? "text-ink-faded" : "text-ink"
          }`}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onBlur={() => {
            takeDueToken(true);
            onBlur(block.id);
          }}
        />
        {done ? <StrikeOverlay textEl={textRef} animate={strikeAnimated} /> : null}
      </div>
      <DueMargin
        block={block}
        isTodo={isTodo}
        dueOn={dueOn}
        overdue={overdue}
        done={done}
        label={label}
        onDue={onDue}
      />
      <span className="flex justify-center pt-[0.45em]">
        <button
          type="button"
          aria-label={`Delete ${label}`}
          onClick={() => onDelete(block.id)}
          className="line-tool focus-pencil h-5 w-5 text-ink-faded hover:text-ribbon"
          title="Delete line"
        >
          <CrossIcon className="h-full w-full" />
        </button>
      </span>
    </div>
  );
}

// The date pencilled into the line's right margin, and the affordance that
// sets or clears it for anyone who does not know the token. The strike is
// drawn over the words only, so crossing a task off never scores out its date.
function DueMargin({
  block,
  isTodo,
  dueOn,
  overdue,
  done,
  label,
  onDue,
}: {
  block: Block;
  isTodo: boolean;
  dueOn: string | null;
  overdue: boolean;
  done: boolean;
  label: string;
  onDue: (id: string, dueOn: string | null) => void;
}) {
  if (!isTodo) return <span />;

  // Faded by default, full ink once it is late, faint once the task is done —
  // a finished task's date recedes and stops reading as late.
  const ink = done ? "text-ink-faint" : overdue ? "text-ink" : "text-ink-faded";

  return (
    // pt sits the annotation's baseline on the line's own — measured, not guessed.
    <span className="flex items-start justify-end gap-1 pt-[0.625rem]">
      {dueOn ? (
        <button
          type="button"
          aria-label={`Clear date for ${label}`}
          onClick={() => onDue(block.id, null)}
          className="line-tool focus-pencil mt-[0.05rem] h-3.5 w-3.5 shrink-0 text-ink-faded hover:text-ribbon"
          title="Clear date"
        >
          <CrossIcon className="h-full w-full" />
        </button>
      ) : null}
      <span className="due-slot">
        {dueOn ? (
          <span className={`due-mark desk-label ${ink}`}>{formatDue(dueOn)}</span>
        ) : (
          <span className="due-mark desk-label line-tool text-ink-faded" aria-hidden="true">
            Date
          </span>
        )}
        <input
          type="date"
          className="due-input"
          value={dueOn ?? ""}
          aria-label={dueOn ? `Change date for ${label}` : `Set date for ${label}`}
          title={dueOn ? "Change date" : "Set a date"}
          onClick={(event) => event.currentTarget.showPicker?.()}
          onChange={(event) => onDue(block.id, event.target.value || null)}
        />
      </span>
    </span>
  );
}

// The red stroke drawn across a finished task. Single-line tasks get a drawn
// SVG stroke sized to the words; wrapped tasks fall back to a per-line rule.
function StrikeOverlay({
  textEl,
  animate,
}: {
  textEl: React.RefObject<HTMLDivElement | null>;
  animate: boolean;
}) {
  const [metrics, setMetrics] = useState<{
    width: number;
    lineHeight: number;
    single: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const el = textEl.current;
    if (!el) return;
    function measure() {
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      if (typeof range.getBoundingClientRect !== "function") {
        setMetrics(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
      if (rect.width > 0) {
        setMetrics({
          width: rect.width,
          lineHeight,
          single: rect.height < lineHeight * 1.6,
        });
      } else {
        setMetrics(null);
      }
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [textEl]);

  if (metrics?.single) {
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0"
        style={{
          width: metrics.width + 8,
          height: metrics.lineHeight,
          marginLeft: -4,
        }}
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
      >
        <path
          className={`strike-path ${animate ? "strike-draw" : ""}`}
          pathLength={100}
          d="M 1 12.4 C 20 10.8, 45 13.6, 66 11.4 S 96 12.8, 99 11.2"
        />
      </svg>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(to_bottom,transparent_0,transparent_0.85em,var(--ribbon)_0.85em,var(--ribbon)_calc(0.85em+2px),transparent_calc(0.85em+2px),transparent_1.9em)] opacity-80"
    />
  );
}

function DividerLine({
  block,
  registerRef,
  onNavigate,
  onDelete,
  onSplit,
}: {
  block: Block;
  registerRef: (id: string, handle: BlockLineHandle | null) => void;
  onNavigate: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onSplit: (id: string, before: string, after: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const handle: BlockLineHandle = {
      focus: () => buttonRef.current?.focus(),
      setTextAndCaret: () => {},
      getText: () => "",
      el: () => buttonRef.current,
    };
    registerRef(block.id, handle);
    return () => registerRef(block.id, null);
  }, [block.id, registerRef]);

  return (
    <div
      className={`block-line group grid grid-cols-[2rem_1fr_4.75rem_2rem] items-center ${KIND_GAP_CLASS.divider} -mx-8`}
      data-kind="divider"
    >
      <span />
      <button
        ref={buttonRef}
        type="button"
        aria-label="Divider"
        className="focus-pencil flex h-8 w-full items-center justify-center"
        onKeyDown={(event) => {
          if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            onDelete(block.id);
          } else if (event.key === "Enter") {
            event.preventDefault();
            onSplit(block.id, "", "");
          } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            event.preventDefault();
            onNavigate(block.id, -1);
          } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            event.preventDefault();
            onNavigate(block.id, 1);
          }
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 6"
          preserveAspectRatio="none"
          className="h-1.5 w-2/5 text-ink-faint"
        >
          <path
            d="M 1 3 C 25 2.2, 50 3.8, 75 2.8 S 96 3.4, 99 3"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </button>
      <span />
      <span className="flex justify-center">
        <button
          type="button"
          aria-label="Delete divider"
          onClick={() => onDelete(block.id)}
          className="line-tool focus-pencil h-5 w-5 text-ink-faded hover:text-ribbon"
          title="Delete divider"
        >
          <CrossIcon className="h-full w-full" />
        </button>
      </span>
    </div>
  );
}
