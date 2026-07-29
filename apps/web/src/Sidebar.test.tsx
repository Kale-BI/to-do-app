import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

afterEach(cleanup);

const noHandlers = {
  onSelect: () => {},
  onCreate: () => {},
  onRename: () => {},
  onDelete: () => {},
};

describe("Sidebar", () => {
  it("shows an empty state when there are no lists", () => {
    render(<Sidebar lists={[]} selectedId={null} {...noHandlers} />);

    expect(
      screen.getByText("No lists yet — add your first above."),
    ).toBeTruthy();
  });

  it("creates a list with the trimmed name and clears the input", () => {
    const onCreate = vi.fn();
    render(
      <Sidebar lists={[]} selectedId={null} {...noHandlers} onCreate={onCreate} />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("New list name");
    fireEvent.change(input, { target: { value: "  Groceries  " } });
    fireEvent.submit(input.closest("form")!);

    expect(onCreate).toHaveBeenCalledWith("Groceries");
    expect(input.value).toBe("");
  });

  it("ignores create submissions with a blank name", () => {
    const onCreate = vi.fn();
    render(
      <Sidebar lists={[]} selectedId={null} {...noHandlers} onCreate={onCreate} />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("New list name");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("selects a list when its name is clicked", () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        lists={[{ id: "l1", name: "Groceries" }]}
        selectedId={null}
        {...noHandlers}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Groceries" }));

    expect(onSelect).toHaveBeenCalledWith("l1");
  });

  it("renames through the inline edit flow", () => {
    const onRename = vi.fn();
    render(
      <Sidebar
        lists={[{ id: "l1", name: "Groceries" }]}
        selectedId={null}
        {...noHandlers}
        onRename={onRename}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename Groceries" }));
    const input = screen.getByLabelText<HTMLInputElement>("New name for Groceries");
    fireEvent.change(input, { target: { value: "Weekly shop" } });
    fireEvent.submit(input.closest("form")!);

    expect(onRename).toHaveBeenCalledWith("l1", "Weekly shop");
    expect(screen.queryByLabelText("New name for Groceries")).toBeNull();
  });

  it("cancels an inline rename without renaming", () => {
    const onRename = vi.fn();
    render(
      <Sidebar
        lists={[{ id: "l1", name: "Groceries" }]}
        selectedId={null}
        {...noHandlers}
        onRename={onRename}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rename Groceries" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Groceries" })).toBeTruthy();
  });

  it("deletes a list", () => {
    const onDelete = vi.fn();
    render(
      <Sidebar
        lists={[{ id: "l1", name: "Groceries" }]}
        selectedId={null}
        {...noHandlers}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Groceries" }));

    expect(onDelete).toHaveBeenCalledWith("l1");
  });
});
