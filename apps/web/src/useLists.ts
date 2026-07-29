import { useEffect, useState } from "react";
import type { List } from "@todo/shared";
import * as api from "./lib/lists-api";

export function useLists() {
  const [lists, setLists] = useState<List[] | null>(null);

  useEffect(() => {
    let active = true;
    void api.fetchLists().then((fetched) => {
      if (active) setLists(fetched);
    });
    return () => {
      active = false;
    };
  }, []);

  async function create(name: string): Promise<List> {
    const created = await api.createList(name);
    setLists((current) => [...(current ?? []), created]);
    return created;
  }

  async function rename(id: string, name: string): Promise<void> {
    const renamed = await api.renameList(id, name);
    setLists((current) =>
      (current ?? []).map((entry) => (entry.id === id ? renamed : entry)),
    );
  }

  async function remove(id: string): Promise<void> {
    await api.deleteList(id);
    setLists((current) => (current ?? []).filter((entry) => entry.id !== id));
  }

  return { lists, create, rename, remove };
}
