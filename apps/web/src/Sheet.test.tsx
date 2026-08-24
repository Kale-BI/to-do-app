import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("pencils a date into the margin of a task line, and nowhere else", () => {
    vi.setSystemTime(new Date(2026, 7, 24));
    const dated: Block[] = [
      {
        id: "d1",
        text: "Buy milk",
        completed: false,
        kind: "todo",
        position: 1,
        dueOn: "2026-08-29",
      },
      {
        id: "d2",
        text: "Notes for the trip",
        completed: false,
        kind: "p",
        position: 2,
        dueOn: "2026-08-29",
      },
    ];
    const { container } = renderSheet({ blocks: dated });

    expect(screen.getByText("29 AUG")).toBeTruthy();
    expect(container.querySelectorAll("[data-due]")).toHaveLength(1);
    expect(
      container.querySelector('[data-kind="p"]')?.getAttribute("data-due"),
    ).toBeNull();
    vi.useRealTimers();
  });

  it("darkens an overdue date and lets a crossed-off one recede", () => {
    vi.setSystemTime(new Date(2026, 7, 24));
    const dated: Block[] = [
      { id: "o1", text: "Late", completed: false, kind: "todo", position: 1, dueOn: "2026-08-23" },
      { id: "o2", text: "Today", completed: false, kind: "todo", position: 2, dueOn: "2026-08-24" },
      { id: "o3", text: "Done", completed: true, kind: "todo", position: 3, dueOn: "2026-08-23" },
    ];
    const { container } = renderSheet({ blocks: dated });

    const overdue = container.querySelectorAll("[data-overdue]");
    expect(overdue).toHaveLength(1);
    expect(overdue[0]?.getAttribute("data-due")).toBe("2026-08-23");
    // `text-ink-faded` contains `text-ink`, so compare whole class names.
    const inkOf = (el?: Element) => el?.className.split(" ").at(-1);
    const late = screen.getAllByText("23 AUG");
    expect(inkOf(late[0])).toBe("text-ink");
    expect(inkOf(screen.getByText("24 AUG"))).toBe("text-ink-faded");

    // The finished task keeps its date, in the faintest ink, and stops
    // reading as late.
    const finished = container.querySelector('[data-completed]');
    expect(finished?.getAttribute("data-overdue")).toBeNull();
    expect(inkOf(late[1])).toBe("text-ink-faint");
    vi.useRealTimers();
  });

  it("resolves a typed token once a space finishes it, and not before", () => {
    vi.setSystemTime(new Date(2026, 7, 24));
    const { api, container } = renderSheet();

    const el = lineEl(container, "todo");
    el.textContent = "Buy milk @frid";
    fireEvent.input(el);
    expect(api.setDue).not.toHaveBeenCalled();
    expect(api.setText).toHaveBeenLastCalledWith("b1", "Buy milk @frid");

    el.textContent = "Buy milk @friday ";
    fireEvent.input(el);
    expect(api.setDue).toHaveBeenCalledWith("b1", "2026-08-28");
    expect(api.setText).toHaveBeenLastCalledWith("b1", "Buy milk");
    expect(el.textContent).toBe("Buy milk");
    vi.useRealTimers();
  });

  it("leaves a token typed into a note as plain text", () => {
    const { api, container } = renderSheet();

    const el = lineEl(container, "p");
    el.textContent = "Notes @friday ";
    fireEvent.input(el);

    expect(api.setDue).not.toHaveBeenCalled();
    expect(api.setText).toHaveBeenCalledWith("b3", "Notes @friday ");
  });

  it("sets and clears a date from the margin", () => {
    vi.setSystemTime(new Date(2026, 7, 24));
    const dated: Block[] = [
      { id: "m1", text: "Buy milk", completed: false, kind: "todo", position: 1 },
      { id: "m2", text: "Buy bread", completed: false, kind: "todo", position: 2, dueOn: "2026-08-29" },
    ];
    const { api } = renderSheet({ blocks: dated });

    fireEvent.change(screen.getByLabelText("Set date for Buy milk"), {
      target: { value: "2026-09-01" },
    });
    expect(api.setDue).toHaveBeenCalledWith("m1", "2026-09-01");

    // Clearing lives only in the margin — there is no clearing token.
    fireEvent.click(screen.getByRole("button", { name: "Clear date for Buy bread" }));
    expect(api.setDue).toHaveBeenCalledWith("m2", null);
    vi.useRealTimers();
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
