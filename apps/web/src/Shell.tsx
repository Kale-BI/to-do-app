import { useState } from "react";
import type { List } from "@todo/shared";
import { Sidebar } from "./Sidebar";
import { Sheet } from "./sheet/Sheet";
import { authClient } from "./lib/auth-client";
import { useBlocks } from "./useBlocks";
import { useLists } from "./useLists";

function SheetSection({
  list,
  onRename,
}: {
  list: List;
  onRename: (name: string) => void;
}) {
  const { blocks, ...api } = useBlocks(list.id);

  if (blocks === null) {
    return (
      <p className="desk-label text-xs text-desk-text-dim">Fetching the sheet…</p>
    );
  }

  return <Sheet list={list} blocks={blocks} api={api} onRename={onRename} />;
}

export function Shell() {
  const { data: session } = authClient.useSession();
  const { lists, create, rename, remove } = useLists();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    window.localStorage.getItem("selected-sheet"),
  );

  function select(id: string | null) {
    setSelectedId(id);
    if (id === null) window.localStorage.removeItem("selected-sheet");
    else window.localStorage.setItem("selected-sheet", id);
  }

  // A returning writer lands on the sheet they left open, or the top of the stack.
  const selected =
    lists?.find((entry) => entry.id === selectedId) ?? lists?.[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-4 pr-16 sm:pl-8">
        <h1 className="desk-label text-sm text-desk-text">To-Do</h1>
        <div className="flex items-center gap-5">
          <p className="hidden text-xs text-desk-text sm:block">
            Signed in as {session?.user.email}
          </p>
          <button
            type="button"
            onClick={() => void authClient.signOut()}
            className="typed-btn focus-pencil px-3 py-1 text-[0.6875rem] text-desk-text hover:border-desk-text"
          >
            Sign out
          </button>
        </div>
      </header>
      {lists === null ? (
        <p className="desk-label px-8 pt-8 text-xs text-desk-text-dim">
          Opening the desk…
        </p>
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start gap-8 px-4 pt-4 pb-16 sm:flex-row sm:px-6">
          <Sidebar
            lists={lists}
            selectedId={selected?.id ?? null}
            onSelect={select}
            onCreate={(name) => {
              void create(name).then((created) => select(created.id));
            }}
            onRename={(id, name) => void rename(id, name)}
            onDelete={(id) => {
              void remove(id);
              if (id === selected?.id) select(null);
            }}
          />
          <main className="min-w-0 w-full flex-1 self-stretch">
            {selected ? (
              <SheetSection
                key={selected.id}
                list={selected}
                onRename={(name) => void rename(selected.id, name)}
              />
            ) : (
              <div className="flex h-full min-h-[50vh] items-center justify-center">
                <p className="typed max-w-xs text-center text-sm leading-relaxed text-desk-text">
                  {lists.length === 0
                    ? "The desk is clear. Name a sheet on the left to start one."
                    : "Pull a sheet from the stack to keep writing."}
                </p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
