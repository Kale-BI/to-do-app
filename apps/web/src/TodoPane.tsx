import { useState, type FormEvent } from "react";
import type { Todo } from "@todo/shared";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

function matches(filter: Filter, entry: Todo): boolean {
  if (filter === "active") return !entry.completed;
  if (filter === "completed") return entry.completed;
  return true;
}

export function TodoPane({
  listName,
  todos,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
}: {
  listName: string;
  todos: Todo[];
  onAdd: (title: string) => void;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = todos.filter((entry) => matches(filter, entry));

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title")).trim();
    if (!title) return;
    onAdd(title);
    form.reset();
  }

  function handleEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title")).trim();
    if (!title) return;
    onEdit(id, title);
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{listName}</h2>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          name="title"
          aria-label="New todo title"
          placeholder="Add a todo"
          className="w-full rounded-md border px-2 py-1 text-sm"
        />
        <button type="submit" className="rounded-md border px-2 py-1 text-sm">
          Add todo
        </button>
      </form>
      <div role="tablist" aria-label="Filter todos" className="flex gap-1">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-md border px-2 py-0.5 text-xs ${
              filter === key ? "bg-black/10 font-medium dark:bg-white/20" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {todos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No todos yet — add your first above.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filter === "active" ? "No active todos." : "No completed todos."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visible.map((entry) =>
            editingId === entry.id ? (
              <li key={entry.id}>
                <form
                  onSubmit={(event) => handleEdit(event, entry.id)}
                  className="flex gap-1"
                >
                  <input
                    name="title"
                    defaultValue={entry.title}
                    aria-label={`New title for ${entry.title}`}
                    autoFocus
                    className="w-full rounded-md border px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded-md border px-2 py-1 text-sm">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li key={entry.id} className="flex items-center gap-2">
                <label className="flex w-full items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={entry.completed}
                    aria-label={`Toggle ${entry.title}`}
                    onChange={() => onToggle(entry.id, !entry.completed)}
                  />
                  <span
                    className={
                      entry.completed ? "text-muted-foreground line-through" : ""
                    }
                  >
                    {entry.title}
                  </span>
                </label>
                <button
                  type="button"
                  aria-label={`Edit ${entry.title}`}
                  onClick={() => setEditingId(entry.id)}
                  className="rounded-md border px-1.5 py-0.5 text-xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${entry.title}`}
                  onClick={() => onDelete(entry.id)}
                  className="rounded-md border px-1.5 py-0.5 text-xs"
                >
                  Delete
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
