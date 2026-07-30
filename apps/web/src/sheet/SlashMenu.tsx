import type { BlockKind } from "@todo/shared";
import {
  DividerIcon,
  Heading1Icon,
  Heading2Icon,
  ParagraphIcon,
  TaskLineIcon,
} from "./icons";

export type MenuEntry = {
  kind: BlockKind;
  label: string;
  hint: string;
  keywords: string[];
  icon: (props: { className?: string }) => React.JSX.Element;
};

export const MENU_ENTRIES: MenuEntry[] = [
  { kind: "todo", label: "To-do", hint: "[]", keywords: ["task", "todo"], icon: TaskLineIcon },
  { kind: "h1", label: "Heading 1", hint: "#", keywords: ["title", "big"], icon: Heading1Icon },
  { kind: "h2", label: "Heading 2", hint: "##", keywords: ["subtitle"], icon: Heading2Icon },
  { kind: "p", label: "Paragraph", hint: "", keywords: ["text", "note"], icon: ParagraphIcon },
  { kind: "divider", label: "Divider", hint: "---", keywords: ["rule", "line"], icon: DividerIcon },
];

export function filterEntries(query: string): MenuEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return MENU_ENTRIES;
  return MENU_ENTRIES.filter(
    (entry) =>
      entry.label.toLowerCase().includes(q) ||
      entry.keywords.some((k) => k.startsWith(q)),
  );
}

export function SlashMenu({
  entries,
  activeIndex,
  position,
  onPick,
  onHover,
}: {
  entries: MenuEntry[];
  activeIndex: number;
  position: { top: number; left: number };
  onPick: (kind: BlockKind) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="Block menu"
      className="menu-paper absolute z-20 w-56 py-1.5"
      style={{ top: position.top, left: position.left }}
    >
      {entries.length === 0 ? (
        <p className="typed px-3 py-2 text-sm text-ink-faded">
          No block matches.
        </p>
      ) : (
        entries.map((entry, index) => (
          <button
            key={entry.kind}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => {
              // keep focus in the line so the caret survives the pick
              event.preventDefault();
              onPick(entry.kind);
            }}
            onMouseEnter={() => onHover(index)}
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left ${
              index === activeIndex ? "bg-ink/8" : ""
            }`}
          >
            <entry.icon className="h-4 w-4 shrink-0 text-ink-faded" />
            <span className="typed flex-1 text-sm">{entry.label}</span>
            {entry.hint ? (
              <span className="desk-label text-[10px] text-ink-faded">
                {entry.hint}
              </span>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}
