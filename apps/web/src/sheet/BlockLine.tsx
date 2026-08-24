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
import { DueMargin } from "./DueMargin";
import { resolveDueToken } from "./dueDate";
import { CrossIcon, StrikeIcon, UnstrikeIcon } from "./icons";

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

// Four margins to a line: cross-off, the typed text, the pencil date, tear-up.
// The outer columns are pulled into the sheet's padding so they read as the
// page's own margins.
const LINE_GRID = "block-line group grid grid-cols-[2rem_1fr_auto_2rem] -mx-8";

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
  today,
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
  onDelete,
  onSetDue,
  onSlashOpen,
  onMenuKey,
  onBlur,
}: {
  block: Block;
  menuOpen: boolean;
  today: string;
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
  onDelete: (id: string) => void;
  onSetDue: (id: string, dueOn: string | null) => void;
  onSlashOpen: (id: string, slashOffset: number) => void;
  onMenuKey: (key: MenuKey) => void;
  onBlur: (id: string) => void;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const [strikeAnimated, setStrikeAnimated] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(block.completed);

  // The strike draws itself on the crossing-off, not on every later draw of an
  // already-finished line.
  if (wasCompleted !== block.completed) {
    setWasCompleted(block.completed);
    setStrikeAnimated(block.completed);
  }

  // The contentEditable is uncontrolled while focused; sync external changes.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el && document.activeElement !== el && el.textContent !== block.text) {
      el.textContent = block.text;
    }
  });

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

  // Only a task line takes a date. The token is consumed the moment it
  // completes — at a blank, or when the line is committed — so the date is
  // written on the page exactly once, in the margin.
  function consumeDueToken(el: HTMLElement, text: string): string {
    if (kind !== "todo") return text;
    const resolved = resolveDueToken(text, new Date());
    if (!resolved) return text;
    el.textContent = resolved.text;
    onSetDue(block.id, resolved.dueOn);
    return resolved.text;
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
      const typed = el.textContent ?? "";
      const offset = caretOffset(el) ?? typed.length;
      // Committing the line completes a token still sitting at its end.
      const text = consumeDueToken(el, typed);
      const cut = Math.min(offset, text.length);
      const before = text.slice(0, cut);
      const after = text.slice(cut);
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
    }
    // A blank finishes a token. The line rewrites itself under the cursor and
    // the caret carries on from where the writer left it.
    if (/\s$/.test(text)) {
      const offset = caretOffset(el) ?? text.length;
      const consumed = consumeDueToken(el, text);
      if (consumed !== text) {
        placeCaret(el, Math.max(0, offset - (text.length - consumed.length)));
        onInput(block.id, consumed);
        return;
      }
    }
    onInput(block.id, text);
  }

  function handleBlur() {
    const el = textRef.current;
    if (el) {
      const text = el.textContent ?? "";
      const consumed = consumeDueToken(el, text);
      if (consumed !== text) onInput(block.id, consumed);
    }
    onBlur(block.id);
  }

  const isTodo = kind === "todo";
  const done = isTodo && block.completed;
  const label = block.text.trim() || "empty line";

  return (
    <div
      className={`${LINE_GRID} items-start ${KIND_GAP_CLASS[kind]}`}
      data-kind={kind}
      data-completed={done || undefined}
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
          onBlur={handleBlur}
        />
        {done ? <StrikeOverlay textEl={textRef} animate={strikeAnimated} /> : null}
      </div>
      {/* Dates are drawn for tasks only — the rule lives here, at the drawing,
          not in the row: another kind keeps its date, it just does not show. */}
      {isTodo ? (
        <DueMargin
          block={block}
          label={label}
          today={today}
          onSetDue={onSetDue}
        />
      ) : (
        <span />
      )}
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
      className={`${LINE_GRID} items-center ${KIND_GAP_CLASS.divider}`}
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
