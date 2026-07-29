import { useState, type FormEvent } from "react";
import type { List } from "@todo/shared";

export function Sidebar({
  lists,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  lists: List[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name")).trim();
    if (!name) return;
    onCreate(name);
    form.reset();
  }

  function handleRename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    if (!name) return;
    onRename(id, name);
    setEditingId(null);
  }

  return (
    <aside className="flex w-56 flex-col gap-3">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          name="name"
          aria-label="New list name"
          placeholder="New list"
          className="w-full rounded-md border px-2 py-1 text-sm"
        />
        <button type="submit" className="rounded-md border px-2 py-1 text-sm">
          Add
        </button>
      </form>
      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No lists yet — add your first above.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {lists.map((entry) =>
            editingId === entry.id ? (
              <li key={entry.id}>
                <form
                  onSubmit={(event) => handleRename(event, entry.id)}
                  className="flex gap-1"
                >
                  <input
                    name="name"
                    defaultValue={entry.name}
                    aria-label={`New name for ${entry.name}`}
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
              <li key={entry.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(entry.id)}
                  aria-current={entry.id === selectedId ? "true" : undefined}
                  className={`w-full rounded-md px-2 py-1 text-left text-sm ${
                    entry.id === selectedId ? "bg-black/10 font-medium dark:bg-white/20" : ""
                  }`}
                >
                  {entry.name}
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${entry.name}`}
                  onClick={() => setEditingId(entry.id)}
                  className="rounded-md border px-1.5 py-0.5 text-xs"
                >
                  Rename
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${entry.name}`}
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
    </aside>
  );
}
