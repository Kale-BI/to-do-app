import { useState, type FormEvent } from "react";
import type { List } from "@todo/shared";
import { CrossIcon, PencilIcon } from "./sheet/icons";

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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
    <aside className="w-full shrink-0 sm:w-52">
      <h2 className="desk-label px-1 text-[0.6875rem] text-desk-text">
        The stack
      </h2>
      <form
        onSubmit={handleCreate}
        className="mt-3 flex items-center gap-2 rounded-[2px] border border-dashed border-desk-text/50 px-2.5 py-1.5"
      >
        <input
          name="name"
          aria-label="New list name"
          placeholder="New sheet"
          autoComplete="off"
          className="typed w-full min-w-0 bg-transparent text-sm text-desk-text placeholder:text-desk-text-dim focus:outline-none"
        />
        <button
          type="submit"
          className="typed-btn focus-pencil shrink-0 px-2 py-0.5 text-[0.625rem] text-desk-text hover:border-desk-text"
        >
          Add
        </button>
      </form>
      {lists.length === 0 ? (
        <p className="typed mt-4 px-1 text-xs leading-relaxed text-desk-text-dim">
          No sheets yet — name one above to get started.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {lists.map((entry, index) =>
            editingId === entry.id ? (
              <li key={entry.id} className="paper px-3 py-2">
                <form
                  onSubmit={(event) => handleRename(event, entry.id)}
                  className="flex flex-col gap-2"
                >
                  <input
                    name="name"
                    defaultValue={entry.name}
                    aria-label={`New name for ${entry.name}`}
                    autoFocus
                    autoComplete="off"
                    className="typed-input w-full text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="typed-btn focus-pencil px-2 py-0.5 text-[0.625rem] text-ink"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="typed-btn focus-pencil px-2 py-0.5 text-[0.625rem] text-ink-faded"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            ) : confirmingId === entry.id ? (
              <li key={entry.id} className="paper px-3 py-2">
                <p className="typed text-xs leading-relaxed text-ink">
                  Tear up “{entry.name}”? Every line on it goes too.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    aria-label={`Tear up ${entry.name}`}
                    onClick={() => {
                      setConfirmingId(null);
                      onDelete(entry.id);
                    }}
                    className="typed-btn focus-pencil px-2 py-0.5 text-[0.625rem] text-ribbon"
                  >
                    Tear up
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="typed-btn focus-pencil px-2 py-0.5 text-[0.625rem] text-ink-faded"
                  >
                    Keep
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={entry.id}
                className={`group relative transition-transform duration-150 ease-out ${
                  entry.id === selectedId
                    ? "translate-x-1.5"
                    : index % 2 === 0
                      ? "rotate-[-0.5deg]"
                      : "rotate-[0.4deg]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(entry.id)}
                  aria-current={entry.id === selectedId ? "true" : undefined}
                  className={`paper focus-pencil w-full px-3 py-2 pr-14 text-left ${
                    entry.id === selectedId ? "" : "opacity-85"
                  }`}
                >
                  <span className="typed block truncate text-sm text-ink">
                    {entry.name}
                  </span>
                </button>
                <span className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
                  <button
                    type="button"
                    aria-label={`Rename ${entry.name}`}
                    onClick={() => setEditingId(entry.id)}
                    className="line-tool focus-pencil h-5 w-5 p-0.5 text-ink-faded hover:text-ink"
                    title="Rename sheet"
                  >
                    <PencilIcon className="h-full w-full" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${entry.name}`}
                    onClick={() => setConfirmingId(entry.id)}
                    className="line-tool focus-pencil h-5 w-5 p-0.5 text-ink-faded hover:text-ribbon"
                    title="Delete sheet"
                  >
                    <CrossIcon className="h-full w-full" />
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </aside>
  );
}
