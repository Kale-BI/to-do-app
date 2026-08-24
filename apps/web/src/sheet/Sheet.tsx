import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Block, BlockKind, List } from "@todo/shared";
import type { BlocksApi } from "../useBlocks";
import { caretOffset } from "./caret";
import { todayIso } from "./dueDate";
import { BlockLine, type BlockLineHandle, type MenuKey } from "./BlockLine";
import { filterEntries, SlashMenu } from "./SlashMenu";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

function visibleUnder(filter: Filter, block: Block): boolean {
  if (filter === "all" || block.kind !== "todo") return true;
  return filter === "active" ? !block.completed : block.completed;
}

type Menu = {
  blockId: string;
  slashOffset: number;
  query: string;
  index: number;
  position: { top: number; left: number };
};

type FocusTarget = { id: string; offset: number | "end"; seq: number };

export function Sheet({
  list,
  blocks,
  api,
  onRename,
}: {
  list: List;
  blocks: Block[];
  api: BlocksApi;
  onRename: (name: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [menu, setMenu] = useState<Menu | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [title, setTitle] = useState(list.name);
  const [titleFor, setTitleFor] = useState(list.name);
  const refs = useRef(new Map<string, BlockLineHandle>());
  const sheetRef = useRef<HTMLDivElement>(null);
  const focusSeq = useRef(0);

  // A different sheet, or a rename from the stack, re-inks the title field.
  if (titleFor !== list.name) {
    setTitleFor(list.name);
    setTitle(list.name);
  }

  const registerRef = useCallback(
    (id: string, handle: BlockLineHandle | null) => {
      if (handle) refs.current.set(id, handle);
      else refs.current.delete(id);
    },
    [],
  );

  function focusBlock(id: string, offset: number | "end") {
    focusSeq.current += 1;
    setFocusTarget({ id, offset, seq: focusSeq.current });
  }

  useLayoutEffect(() => {
    if (!focusTarget) return;
    refs.current.get(focusTarget.id)?.focus(focusTarget.offset);
  }, [focusTarget]);

  const visible = blocks.filter((block) => visibleUnder(filter, block));
  // Read once per draw off the browser's own clock, so "late" means late where
  // the reader is sitting.
  const today = todayIso();

  function blockAt(id: string) {
    return blocks.find((b) => b.id === id);
  }
  function neighbor(id: string, dir: -1 | 1, list_: Block[]): Block | undefined {
    const index = list_.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    return list_[index + dir];
  }

  // ----- line callbacks -----

  function handleInput(id: string, text: string) {
    api.setText(id, text);
    if (menu && menu.blockId === id) {
      const el = refs.current.get(id)?.el();
      const offset = el ? (caretOffset(el as HTMLElement) ?? text.length) : text.length;
      if (text[menu.slashOffset] !== "/" || offset <= menu.slashOffset) {
        setMenu(null);
        return;
      }
      const query = text.slice(menu.slashOffset + 1, offset);
      if (/\s/.test(query)) setMenu(null);
      else setMenu({ ...menu, query, index: 0 });
    }
  }

  function handleTransform(id: string, kind: BlockKind, text: string) {
    api.convert(id, kind, text);
    if (kind === "divider") {
      const next = neighbor(id, 1, blocks);
      if (next && next.kind !== "divider") {
        focusBlock(next.id, 0);
      } else {
        const created = api.insert(id, "p", "");
        focusBlock(created.id, 0);
      }
    }
  }

  function handleSplit(id: string, before: string, after: string) {
    const block = blockAt(id);
    if (!block) return;
    if (block.kind === "divider") {
      const created = api.insert(id, "p", "");
      focusBlock(created.id, 0);
      return;
    }
    if (before === "" && after === "") {
      // Enter on an empty line exits the format instead of duplicating it:
      // a formatted line demotes to a paragraph, an empty paragraph is
      // removed — so repeated Enter can never stack placeholder lines.
      if (block.kind !== "p") {
        api.convert(id, "p", "");
        focusBlock(id, 0);
        return;
      }
      if (blocks.length > 1) {
        const next = neighbor(id, 1, visible);
        const prev = neighbor(id, -1, visible);
        api.remove(id);
        if (next) focusBlock(next.id, 0);
        else if (prev) focusBlock(prev.id, "end");
      }
      return;
    }
    api.setText(id, before);
    api.flushText(id);
    const nextKind: BlockKind = block.kind === "todo" ? "todo" : "p";
    const created = api.insert(id, nextKind, after);
    focusBlock(created.id, 0);
  }

  function handleEnterAtStart(id: string) {
    const block = blockAt(id);
    if (!block) return;
    api.insertBefore(id, block.kind === "todo" ? "todo" : "p", "");
    focusBlock(id, 0);
  }

  function handleConvertToP(id: string, text: string) {
    api.convert(id, "p", text);
    focusBlock(id, 0);
  }

  function handleMergeBack(id: string, text: string) {
    const prev = neighbor(id, -1, blocks);
    if (!prev) return;
    if (prev.kind === "divider") {
      api.remove(prev.id);
      focusBlock(id, 0);
      return;
    }
    const joined = prev.text + text;
    api.convert(prev.id, prev.kind, joined);
    api.remove(id);
    focusBlock(prev.id, prev.text.length);
  }

  function handleDeleteForward(id: string, text: string) {
    const block = blockAt(id);
    const next = neighbor(id, 1, blocks);
    if (!block || !next) return;
    if (next.kind === "divider") {
      api.remove(next.id);
      return;
    }
    api.convert(id, block.kind, text + next.text);
    api.remove(next.id);
    focusBlock(id, text.length);
  }

  function handleNavigate(id: string, dir: -1 | 1) {
    const target = neighbor(id, dir, visible);
    if (target) focusBlock(target.id, dir === -1 ? "end" : 0);
  }

  function handleDelete(id: string) {
    const fallback = neighbor(id, -1, visible) ?? neighbor(id, 1, visible);
    api.remove(id);
    setMenu((m) => (m && m.blockId === id ? null : m));
    if (fallback) focusBlock(fallback.id, "end");
  }

  function handleBlur(id: string) {
    api.flushText(id);
    setMenu((m) => (m && m.blockId === id ? null : m));
  }

  // ----- slash menu -----

  function handleSlashOpen(id: string, slashOffset: number) {
    const el = refs.current.get(id)?.el();
    const sheet = sheetRef.current;
    if (!el || !sheet) return;
    const lineRect = el.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();
    const spaceBelow = window.innerHeight - lineRect.bottom;
    const top =
      spaceBelow > 260
        ? lineRect.bottom - sheetRect.top + 6
        : lineRect.top - sheetRect.top - 246;
    setMenu({
      blockId: id,
      slashOffset,
      query: "",
      index: 0,
      position: { top, left: Math.min(lineRect.left - sheetRect.left, sheetRect.width - 240) },
    });
  }

  function handleMenuKey(key: MenuKey) {
    if (!menu) return;
    const entries = filterEntries(menu.query);
    if (key === "Escape" || key === "Tab") {
      setMenu(null);
      return;
    }
    if (key === "ArrowUp") {
      setMenu({
        ...menu,
        index: (menu.index - 1 + Math.max(entries.length, 1)) % Math.max(entries.length, 1),
      });
      return;
    }
    if (key === "ArrowDown") {
      setMenu({ ...menu, index: (menu.index + 1) % Math.max(entries.length, 1) });
      return;
    }
    if (key === "Enter") {
      const entry = entries[menu.index];
      if (entry) applyMenu(entry.kind);
      else setMenu(null);
    }
  }

  function applyMenu(kind: BlockKind) {
    if (!menu) return;
    const block = blockAt(menu.blockId);
    const handle = refs.current.get(menu.blockId);
    if (!block || !handle) {
      setMenu(null);
      return;
    }
    const text = handle.getText();
    const stripped =
      text.slice(0, menu.slashOffset) +
      text.slice(menu.slashOffset + 1 + menu.query.length);
    setMenu(null);

    if (stripped === "" && block.kind !== "divider") {
      handle.setTextAndCaret("", 0);
      if (kind === "divider") {
        handleTransform(block.id, "divider", "");
      } else {
        api.convert(block.id, kind, "");
        focusBlock(block.id, 0);
      }
      return;
    }

    handle.setTextAndCaret(stripped, menu.slashOffset);
    api.convert(block.id, block.kind, stripped);
    if (kind === "divider") {
      const divider = api.insert(block.id, "divider", "");
      const next = neighbor(block.id, 1, blocks);
      if (next && next.kind !== "divider") {
        focusBlock(next.id, 0);
      } else {
        const created = api.insert(divider.id, "p", "");
        focusBlock(created.id, 0);
      }
    } else {
      const created = api.insert(block.id, kind, "");
      focusBlock(created.id, 0);
    }
  }

  // ----- sheet-level interactions -----

  function startSheet() {
    const created = api.insert(null, "todo", "");
    focusBlock(created.id, 0);
  }

  function handleBottomClick() {
    const last = visible[visible.length - 1];
    if (last) focusBlock(last.id, "end");
    else startSheet();
  }

  function commitTitle() {
    const name = title.trim();
    if (!name) {
      setTitle(list.name);
      return;
    }
    if (name !== list.name) onRename(name);
  }

  const menuEntries = menu ? filterEntries(menu.query) : [];

  return (
    <div
      ref={sheetRef}
      className="paper sheet-stack sheet-enter relative flex min-h-[78vh] w-full flex-col px-10 pt-12 pb-6 sm:px-16"
    >
      <header className="flex flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6">
        <h2 className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitTitle();
                const first = visible[0];
                if (first) focusBlock(first.id, 0);
              }
            }}
            aria-label="List name"
            className="typed w-full border-0 bg-transparent p-0 text-[1.625rem] tracking-[0.08em] text-ink uppercase caret-ink focus:outline-none"
          />
        </h2>
        <div
          role="tablist"
          aria-label="Filter todos"
          className="flex items-baseline gap-4 self-end sm:self-auto"
        >
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`desk-label focus-pencil relative px-1 py-0.5 text-[0.6875rem] ${
                filter === key ? "text-ink" : "text-ink-faded hover:text-ink"
              }`}
            >
              {label}
              {filter === key ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 36"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute -inset-x-1.5 -inset-y-0.5 h-[calc(100%+0.25rem)] w-[calc(100%+0.75rem)]"
                >
                  <path
                    className="pencil-ring"
                    d="M 8 20 C 6 8, 30 3, 55 4 C 82 5, 97 10, 95 20 C 93 30, 68 33.5, 42 32.5 C 20 31.5, 9 28, 10 21"
                  />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      <hr className="mt-3 mb-8 border-t border-ink/25" />

      <div className="flex flex-1 flex-col">
        {blocks.length === 0 ? (
          <button
            type="button"
            onClick={startSheet}
            className="typed focus-pencil -mx-1 px-1 text-left text-[0.9375rem] leading-[1.9] text-ink-faded"
          >
            Start typing, or press / for blocks…
          </button>
        ) : visible.length === 0 ? (
          <p className="typed text-[0.9375rem] leading-[1.9] text-ink-faded">
            {filter === "active"
              ? "Everything here is crossed off."
              : "Nothing crossed off yet."}
          </p>
        ) : (
          visible.map((block) => (
            <BlockLine
              key={block.id}
              block={block}
              menuOpen={menu?.blockId === block.id}
              registerRef={registerRef}
              onInput={handleInput}
              onTransform={handleTransform}
              onSplit={handleSplit}
              onEnterAtStart={handleEnterAtStart}
              onConvertToP={handleConvertToP}
              onMergeBack={handleMergeBack}
              onDeleteForward={handleDeleteForward}
              onNavigate={handleNavigate}
              onToggle={api.toggle}
              onDelete={handleDelete}
              onSetDue={api.setDue}
              today={today}
              onSlashOpen={handleSlashOpen}
              onMenuKey={handleMenuKey}
              onBlur={handleBlur}
            />
          ))
        )}
        <div
          aria-hidden="true"
          className="min-h-16 flex-1 cursor-text"
          onMouseDown={(event) => {
            event.preventDefault();
            handleBottomClick();
          }}
        />
      </div>

      {menu ? (
        <SlashMenu
          entries={menuEntries}
          activeIndex={menu.index}
          position={menu.position}
          onPick={applyMenu}
          onHover={(index) => setMenu((m) => (m ? { ...m, index } : m))}
        />
      ) : null}
    </div>
  );
}
