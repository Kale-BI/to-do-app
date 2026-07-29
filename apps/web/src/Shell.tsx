import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { authClient } from "./lib/auth-client";
import { useLists } from "./useLists";

export function Shell() {
  const { data: session } = authClient.useSession();
  const { lists, create, rename, remove } = useLists();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = lists?.find((entry) => entry.id === selectedId) ?? null;

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex w-full items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Signed in as {session?.user.email}
        </p>
        <button
          type="button"
          onClick={() => void authClient.signOut()}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Sign out
        </button>
      </div>
      {lists === null ? (
        <p className="text-sm">Loading lists…</p>
      ) : (
        <div className="flex gap-6">
          <Sidebar
            lists={lists}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={(name) => {
              void create(name).then((created) => setSelectedId(created.id));
            }}
            onRename={(id, name) => void rename(id, name)}
            onDelete={(id) => {
              void remove(id);
              if (id === selectedId) setSelectedId(null);
            }}
          />
          <main className="flex-1">
            {selected ? (
              <>
                <h2 className="mb-2 text-lg font-semibold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Todos arrive with the next ticket.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a list — or create one.
              </p>
            )}
          </main>
        </div>
      )}
    </section>
  );
}
