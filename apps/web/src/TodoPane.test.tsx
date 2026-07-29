import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodoPane } from "./TodoPane";

afterEach(cleanup);

const noHandlers = {
  onAdd: () => {},
  onToggle: () => {},
  onEdit: () => {},
  onDelete: () => {},
};

const milk = { id: "t1", title: "Buy milk", completed: false };
const bread = { id: "t2", title: "Buy bread", completed: true };

describe("TodoPane", () => {
  it("shows an empty state when the list has no todos", () => {
    render(<TodoPane listName="Groceries" todos={[]} {...noHandlers} />);

    expect(screen.getByText("No todos yet — add your first above.")).toBeTruthy();
  });

  it("adds a todo with the trimmed title and clears the input", () => {
    const onAdd = vi.fn();
    render(<TodoPane listName="Groceries" todos={[]} {...noHandlers} onAdd={onAdd} />);

    const input = screen.getByLabelText<HTMLInputElement>("New todo title");
    fireEvent.change(input, { target: { value: "  Buy milk  " } });
    fireEvent.submit(input.closest("form")!);

    expect(onAdd).toHaveBeenCalledWith("Buy milk");
    expect(input.value).toBe("");
  });

  it("ignores add submissions with a blank title", () => {
    const onAdd = vi.fn();
    render(<TodoPane listName="Groceries" todos={[]} {...noHandlers} onAdd={onAdd} />);

    const input = screen.getByLabelText<HTMLInputElement>("New todo title");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("toggles a todo to the opposite completion state", () => {
    const onToggle = vi.fn();
    render(
      <TodoPane
        listName="Groceries"
        todos={[milk, bread]}
        {...noHandlers}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByLabelText("Toggle Buy milk"));
    expect(onToggle).toHaveBeenCalledWith("t1", true);

    fireEvent.click(screen.getByLabelText("Toggle Buy bread"));
    expect(onToggle).toHaveBeenCalledWith("t2", false);
  });

  it("renders completed todos visually distinct from active ones", () => {
    render(<TodoPane listName="Groceries" todos={[milk, bread]} {...noHandlers} />);

    expect(screen.getByText("Buy bread").className).toContain("line-through");
    expect(screen.getByText("Buy milk").className).not.toContain("line-through");
    expect(screen.getByLabelText<HTMLInputElement>("Toggle Buy bread").checked).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>("Toggle Buy milk").checked).toBe(false);
  });

  it("edits through the inline edit flow", () => {
    const onEdit = vi.fn();
    render(
      <TodoPane listName="Groceries" todos={[milk]} {...noHandlers} onEdit={onEdit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Buy milk" }));
    const input = screen.getByLabelText<HTMLInputElement>("New title for Buy milk");
    fireEvent.change(input, { target: { value: "Buy oat milk" } });
    fireEvent.submit(input.closest("form")!);

    expect(onEdit).toHaveBeenCalledWith("t1", "Buy oat milk");
    expect(screen.queryByLabelText("New title for Buy milk")).toBeNull();
  });

  it("cancels an inline edit without editing", () => {
    const onEdit = vi.fn();
    render(
      <TodoPane listName="Groceries" todos={[milk]} {...noHandlers} onEdit={onEdit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Buy milk" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("Buy milk")).toBeTruthy();
  });

  it("deletes a todo", () => {
    const onDelete = vi.fn();
    render(
      <TodoPane listName="Groceries" todos={[milk]} {...noHandlers} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));

    expect(onDelete).toHaveBeenCalledWith("t1");
  });

  it("defaults the filter to All, showing every todo", () => {
    render(<TodoPane listName="Groceries" todos={[milk, bread]} {...noHandlers} />);

    expect(screen.getByRole("tab", { name: "All" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Buy milk")).toBeTruthy();
    expect(screen.getByText("Buy bread")).toBeTruthy();
  });

  it("narrows to active-only todos on the Active tab", () => {
    render(<TodoPane listName="Groceries" todos={[milk, bread]} {...noHandlers} />);

    fireEvent.click(screen.getByRole("tab", { name: "Active" }));

    expect(screen.getByText("Buy milk")).toBeTruthy();
    expect(screen.queryByText("Buy bread")).toBeNull();
  });

  it("narrows to completed-only todos on the Completed tab", () => {
    render(<TodoPane listName="Groceries" todos={[milk, bread]} {...noHandlers} />);

    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));

    expect(screen.queryByText("Buy milk")).toBeNull();
    expect(screen.getByText("Buy bread")).toBeTruthy();
  });

  it("returns everything when switching back to All", () => {
    render(<TodoPane listName="Groceries" todos={[milk, bread]} {...noHandlers} />);

    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));
    fireEvent.click(screen.getByRole("tab", { name: "All" }));

    expect(screen.getByText("Buy milk")).toBeTruthy();
    expect(screen.getByText("Buy bread")).toBeTruthy();
  });

  it("explains an empty filtered view", () => {
    render(<TodoPane listName="Groceries" todos={[milk]} {...noHandlers} />);

    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));

    expect(screen.getByText("No completed todos.")).toBeTruthy();
  });
});
