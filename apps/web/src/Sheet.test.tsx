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
