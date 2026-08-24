import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Block } from "@todo/shared";
import { Sheet } from "./sheet/Sheet";
import type { BlocksApi } from "./useBlocks";

afterEach(cleanup);

const list = { id: "l1", name: "Groceries" };

const blocks: Block[] = [
  { id: "b1", text: "Buy milk", completed: false, kind: "todo", position: 1 },
  { id: "b2", text: "Buy bread", completed: true, kind: "todo", position: 2 },
  { id: "b3", text: "Notes for the trip", completed: false, kind: "p", position: 3 },
  { id: "b4", text: "Later", completed: false, kind: "h2", position: 4 },
  { id: "b5", text: "", completed: false, kind: "divider", position: 5 },
];

function fakeApi(): BlocksApi {
  let nextId = 100;
  return {
    insert: vi.fn(
      (_after, kind, text) =>
        ({
          id: `n${nextId++}`,
          text,
          completed: false,
          kind,
          position: 99,
        }) as Block,
    ),
    insertBefore: vi.fn(
      (_before, kind, text) =>
        ({
          id: `n${nextId++}`,
          text,
          completed: false,
          kind,
          position: 0,
        }) as Block,
    ),
    setText: vi.fn(),
    flushText: vi.fn(),
    convert: vi.fn(),
    toggle: vi.fn(),
    setDue: vi.fn(),
    remove: vi.fn(),
  };
}

function renderSheet(overrides?: { blocks?: Block[]; api?: BlocksApi }) {
  const api = overrides?.api ?? fakeApi();
  const onRename = vi.fn();
  const utils = render(
    <Sheet
      list={list}
      blocks={overrides?.blocks ?? blocks}
      api={api}
      onRename={onRename}
    />,
  );
  return { api, onRename, ...utils };
}

function lineEl(container: HTMLElement, kind: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(
    `[data-kind="${kind}"] .block-text`,
  );
  if (!el) throw new Error(`no ${kind} line rendered`);
  return el;
}

describe("Sheet", () => {
  it("renders every block kind and the list title", () => {
    renderSheet();

    expect(screen.getByLabelText<HTMLInputElement>("List name").value).toBe(
      "Groceries",
    );
    expect(screen.getByText("Buy milk")).toBeTruthy();
    expect(screen.getByText("Notes for the trip")).toBeTruthy();
    expect(screen.getByText("Later")).toBeTruthy();
    expect(screen.getByLabelText("Divider")).toBeTruthy();
  });

  it("crosses a task off and uncrosses it through the margin control", () => {
    const { api } = renderSheet();

    const cross = screen.getByRole("button", { name: "Cross off Buy milk" });
    expect(cross.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(cross);
    expect(api.toggle).toHaveBeenCalledWith("b1", true);

    const uncross = screen.getByRole("button", { name: "Uncross Buy bread" });
    expect(uncross.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(uncross);
    expect(api.toggle).toHaveBeenCalledWith("b2", false);
  });

  it("deletes a line from the margin control", () => {
    const { api } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));

    expect(api.remove).toHaveBeenCalledWith("b1");
  });

  it("filters only task lines; notes and headings stay on the sheet", () => {
    renderSheet();

    fireEvent.click(screen.getByRole("tab", { name: "Active" }));
    expect(screen.queryByText("Buy bread")).toBeNull();
    expect(screen.getByText("Buy milk")).toBeTruthy();
    expect(screen.getByText("Notes for the trip")).toBeTruthy();
    expect(screen.getByText("Later")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));
    expect(screen.queryByText("Buy milk")).toBeNull();
    expect(screen.getByText("Buy bread")).toBeTruthy();
  });

  it("starts an empty sheet with a first task line", async () => {
    const { api } = renderSheet({ blocks: [] });

    fireEvent.click(
      screen.getByRole("button", { name: /start typing, or press \//i }),
    );

    expect(api.insert).toHaveBeenCalledWith(null, "todo", "");
  });

  it("converts a line via markdown shortcut on input", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "p");
    el.textContent = "# Plans";
    fireEvent.input(el);

    expect(api.convert).toHaveBeenCalledWith("b3", "h1", "Plans");
  });

  it("converts a paragraph into a divider when --- is typed", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "p");
    el.textContent = "---";
    fireEvent.input(el);

    expect(api.convert).toHaveBeenCalledWith("b3", "divider", "");
  });

  it("splits a line on Enter into a following block", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "todo");
    el.focus();
    // place the caret at the end of the line
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.keyDown(el, { key: "Enter" });

    expect(api.flushText).toHaveBeenCalledWith("b1");
    expect(api.insert).toHaveBeenCalledWith("b1", "todo", "");
  });

  it("demotes an empty formatted line to a paragraph on Enter", () => {
    const emptyTodo: Block[] = [
      { id: "e1", text: "Buy milk", completed: false, kind: "todo", position: 1 },
      { id: "e2", text: "", completed: false, kind: "todo", position: 2 },
    ];
    const { api, container } = renderSheet({ blocks: emptyTodo });

    const el = container.querySelectorAll<HTMLElement>(".block-text")[1]!;
    el.focus();
    fireEvent.keyDown(el, { key: "Enter" });

    expect(api.convert).toHaveBeenCalledWith("e2", "p", "");
    expect(api.insert).not.toHaveBeenCalled();
  });

  it("demotes an empty heading to a paragraph on Enter", () => {
    const emptyHeading: Block[] = [
      { id: "h1", text: "", completed: false, kind: "h2", position: 1 },
      { id: "h2", text: "Buy milk", completed: false, kind: "todo", position: 2 },
    ];
    const { api, container } = renderSheet({ blocks: emptyHeading });

    const el = lineEl(container, "h2");
    el.focus();
    fireEvent.keyDown(el, { key: "Enter" });

    expect(api.convert).toHaveBeenCalledWith("h1", "p", "");
    expect(api.insert).not.toHaveBeenCalled();
  });

  it("removes an empty paragraph on Enter instead of stacking placeholders", () => {
    const emptyParagraph: Block[] = [
      { id: "p1", text: "Buy milk", completed: false, kind: "todo", position: 1 },
      { id: "p2", text: "", completed: false, kind: "p", position: 2 },
    ];
    const { api, container } = renderSheet({ blocks: emptyParagraph });

    const el = lineEl(container, "p");
    el.focus();
    fireEvent.keyDown(el, { key: "Enter" });

    expect(api.remove).toHaveBeenCalledWith("p2");
    expect(api.insert).not.toHaveBeenCalled();
  });

  it("keeps the sheet's only line through Enter when it is an empty paragraph", () => {
    const lone: Block[] = [
      { id: "solo", text: "", completed: false, kind: "p", position: 1 },
    ];
    const { api, container } = renderSheet({ blocks: lone });

    const el = lineEl(container, "p");
    el.focus();
    fireEvent.keyDown(el, { key: "Enter" });

    expect(api.remove).not.toHaveBeenCalled();
    expect(api.convert).not.toHaveBeenCalled();
    expect(api.insert).not.toHaveBeenCalled();
  });

  it("opens the slash menu on /, navigates, and applies a block", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "p");
    el.focus();
    fireEvent.keyDown(el, { key: "/" });

    expect(screen.getByRole("listbox", { name: "Block menu" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /to-do/i })).toBeTruthy();

    fireEvent.keyDown(el, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.keyDown(el, { key: "/" });
    fireEvent.keyDown(el, { key: "Enter" });
    expect(api.insert).toHaveBeenCalledWith("b3", "todo", "");
  });

  it("renames the list from the sheet title", () => {
    const { onRename } = renderSheet();

    const title = screen.getByLabelText<HTMLInputElement>("List name");
    fireEvent.change(title, { target: { value: "Weekly shop" } });
    fireEvent.blur(title);

    expect(onRename).toHaveBeenCalledWith("Weekly shop");
  });

  it("converts a non-paragraph line to a paragraph on Backspace at start", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "h2");
    el.focus();
    // jsdom offers no caret; place one at the line start explicitly
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(el, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.keyDown(el, { key: "Backspace" });

    expect(api.convert).toHaveBeenCalledWith("b4", "p", "Later");
  });
});

// A Wednesday, so a weekday token has somewhere to point and "25 Aug" is
// yesterday. The sheet reads the browser's own clock; the tests pin it.
const TODAY = new Date(2026, 7, 26);

const dated: Block[] = [
  {
    id: "d1",
    text: "Buy milk",
    completed: false,
    kind: "todo",
    position: 1,
    dueOn: "2026-09-01",
  },
  {
    id: "d2",
    text: "Call the plumber",
    completed: false,
    kind: "todo",
    position: 2,
    dueOn: "2026-08-25",
  },
  {
    id: "d3",
    text: "Post the letter",
    completed: true,
    kind: "todo",
    position: 3,
    dueOn: "2026-08-20",
  },
];

describe("Sheet due dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves a token as the blank completes it and takes it out of the line", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "todo");
    el.textContent = "Buy milk @friday ";
    fireEvent.input(el);

    expect(api.setDue).toHaveBeenCalledWith("b1", "2026-08-28");
    expect(api.setText).toHaveBeenCalledWith("b1", "Buy milk ");
    expect(el.textContent).toBe("Buy milk ");
  });

  it("resolves a token still on the line when the line is committed", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "todo");
    el.textContent = "Buy milk @tomorrow";
    el.focus();
    fireEvent.keyDown(el, { key: "Enter" });

    expect(api.setDue).toHaveBeenCalledWith("b1", "2026-08-27");
    expect(el.textContent).toBe("Buy milk");
  });

  it("leaves text that only looks like a token exactly as typed", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "todo");
    el.textContent = "Buy milk @fri ";
    fireEvent.input(el);

    expect(api.setDue).not.toHaveBeenCalled();
    expect(api.setText).toHaveBeenCalledWith("b1", "Buy milk @fri ");
  });

  it("reads no token on a line that is not a task", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "p");
    el.textContent = "Notes for the trip @friday ";
    fireEvent.input(el);

    expect(api.setDue).not.toHaveBeenCalled();
    expect(api.setText).toHaveBeenCalledWith("b3", "Notes for the trip @friday ");
  });

  it("writes the date in the right margin as a pencil annotation", () => {
    const { container } = renderSheet({ blocks: dated });

    const annotation = screen.getByRole("button", { name: "Due 1 Sep, Buy milk" });
    expect(annotation.textContent).toBe("1 Sep");
    // The desk label voice, faded ink, and nothing drawn around it.
    expect(annotation.classList.contains("desk-label")).toBe(true);
    expect(annotation.classList.contains("text-ink-faded")).toBe(true);
    expect(annotation.className).not.toMatch(/bg-|rounded|border|ribbon/);
    // In the margin, outside the typed text.
    expect(lineEl(container, "todo").contains(annotation)).toBe(false);
  });

  it("darkens a date that has already passed to full ink", () => {
    renderSheet({ blocks: dated });

    const late = screen.getByRole("button", {
      name: "Overdue 25 Aug, Call the plumber",
    });
    expect(late.getAttribute("data-due-state")).toBe("overdue");
    expect(late.classList.contains("text-ink")).toBe(true);
    expect(late.classList.contains("text-ink-faded")).toBe(false);
  });

  it("turns a date late the day after it, and not the day of it", () => {
    const boundary: Block[] = [
      {
        id: "t1",
        text: "Due today",
        completed: false,
        kind: "todo",
        position: 1,
        dueOn: "2026-08-26",
      },
      {
        id: "t2",
        text: "Due yesterday",
        completed: false,
        kind: "todo",
        position: 2,
        dueOn: "2026-08-25",
      },
    ];
    renderSheet({ blocks: boundary });

    expect(
      screen
        .getByRole("button", { name: "Due 26 Aug, Due today" })
        .getAttribute("data-due-state"),
    ).toBe("upcoming");
    expect(
      screen
        .getByRole("button", { name: "Overdue 25 Aug, Due yesterday" })
        .getAttribute("data-due-state"),
    ).toBe("overdue");
  });

  it("fades a crossed-off task's date and drops its overdue weight", () => {
    const { container } = renderSheet({ blocks: dated });

    const struck = screen.getByRole("button", {
      name: "Due 20 Aug, Post the letter",
    });
    expect(struck.getAttribute("data-due-state")).toBe("done");
    expect(struck.classList.contains("text-ink-faint")).toBe(true);
    // The strike is drawn over the typed text and stops at the margin.
    const line = container.querySelector<HTMLElement>("[data-completed]")!;
    expect(line.querySelector(".block-text")!.contains(struck)).toBe(false);
  });

  it("retains a date on conversion: no date clear rides along with the kind", () => {
    const { api, rerender } = renderSheet({ blocks: dated });

    // Backspace at the start of the dated task turns it into a note.
    const el = screen.getByText("Buy milk");
    el.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(el, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.keyDown(el, { key: "Backspace" });

    expect(api.convert).toHaveBeenCalledWith("d1", "p", "Buy milk");
    expect(api.setDue).not.toHaveBeenCalled();

    // Drawn as a note the date is hidden, but the row still holds it…
    const asNote = dated.map((b) => (b.id === "d1" ? { ...b, kind: "p" as const } : b));
    rerender(
      <Sheet list={list} blocks={asNote} api={api} onRename={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Due 1 Sep, Buy milk" })).toBeNull();

    // …so converting back brings the same date out again.
    rerender(<Sheet list={list} blocks={dated} api={api} onRename={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Due 1 Sep, Buy milk" })).toBeTruthy();
  });

  it("never draws a date on a line that is not a task, whatever the row holds", () => {
    const others: Block[] = [
      {
        id: "o1",
        text: "Notes",
        completed: false,
        kind: "p",
        position: 1,
        dueOn: "2026-09-01",
      },
      {
        id: "o2",
        text: "Later",
        completed: false,
        kind: "h2",
        position: 2,
        dueOn: "2026-09-01",
      },
      {
        id: "o3",
        text: "",
        completed: false,
        kind: "divider",
        position: 3,
        dueOn: "2026-09-01",
      },
    ];
    const { container } = renderSheet({ blocks: others });

    expect(container.querySelector("[data-due]")).toBeNull();
    expect(screen.queryByText("1 Sep")).toBeNull();
  });

  it("sets a date from the margin affordance", () => {
    const { api } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Set a due date for Buy milk" }));
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "2026-09-01" },
    });

    expect(api.setDue).toHaveBeenCalledWith("b1", "2026-09-01");
  });

  it("clears a date from the margin affordance, the only way to clear one", () => {
    const { api, container } = renderSheet({ blocks: dated });

    fireEvent.click(screen.getByRole("button", { name: "Due 1 Sep, Buy milk" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Clear the due date on Buy milk" }),
    );
    expect(api.setDue).toHaveBeenCalledWith("d1", null);

    // There is no clearing token: typing one is ordinary text.
    const el = lineEl(container, "todo");
    el.textContent = "Buy milk @none ";
    fireEvent.input(el);
    expect(api.setDue).toHaveBeenCalledTimes(1);
    expect(api.setText).toHaveBeenCalledWith("d1", "Buy milk @none ");
  });
});
