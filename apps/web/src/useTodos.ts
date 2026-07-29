import { useEffect, useState } from "react";
import type { Todo, UpdateTodo } from "@todo/shared";
import * as api from "./lib/todos-api";

export function useTodos(listId: string) {
  const [todos, setTodos] = useState<Todo[] | null>(null);

  useEffect(() => {
    let active = true;
    void api.fetchTodos(listId).then((fetched) => {
      if (active) setTodos(fetched);
    });
    return () => {
      active = false;
    };
  }, [listId]);

  async function add(title: string): Promise<void> {
    const created = await api.createTodo(listId, title);
    setTodos((current) => [...(current ?? []), created]);
  }

  async function update(id: string, patch: UpdateTodo): Promise<void> {
    const updated = await api.updateTodo(id, patch);
    setTodos((current) =>
      (current ?? []).map((entry) => (entry.id === id ? updated : entry)),
    );
  }

  async function remove(id: string): Promise<void> {
    await api.deleteTodo(id);
    setTodos((current) => (current ?? []).filter((entry) => entry.id !== id));
  }

  return { todos, add, update, remove };
}
