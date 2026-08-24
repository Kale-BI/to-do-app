import { useEffect, useRef, useState } from "react";
import type { Block, BlockKind } from "@todo/shared";
import * as api from "./lib/blocks-api";

const TEXT_DEBOUNCE_MS = 400;

function sorted(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => a.position - b.position);
}

// Ordered blocks for one list. Local state is authoritative and updates
// synchronously (so focus can move the instant a line is created); persistence
// runs behind it on a per-block queue, text changes debounced.
export function useBlocks(listId: string) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const blocksRef = useRef<Block[] | null>(null);
  const chains = useRef(new Map<string, Promise<unknown>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingText = useRef(new Map<string, string>());

  function commit(next: Block[] | null) {
    blocksRef.current = next;
    setBlocks(next);
  }

  // Persistence for one block runs in order: create, then patches, then delete.
  function enqueue(id: string, task: () => Promise<unknown>) {
    const run = () => task().catch((error: unknown) => console.error(error));
    const next = (chains.current.get(id) ?? Promise.resolve()).then(run);
    chains.current.set(id, next);
  }

  useEffect(() => {
    let active = true;
    commit(null);
    void api.fetchBlocks(listId).then((fetched) => {
      if (active) commit(sorted(fetched));
    });
    const currentTimers = timers.current;
    return () => {
      active = false;
      for (const timer of currentTimers.values()) clearTimeout(timer);
      currentTimers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  function patchLocal(id: string, patch: Partial<Block>) {
    const current = blocksRef.current;
    if (!current) return;
    commit(sorted(current.map((b) => (b.id === id ? { ...b, ...patch } : b))));
  }

  function flushText(id: string) {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    const text = pendingText.current.get(id);
    if (text !== undefined) {
      pendingText.current.delete(id);
      enqueue(id, () => api.updateBlock(id, { text }));
    }
  }

  function setText(id: string, text: string) {
    patchLocal(id, { text });
    pendingText.current.set(id, text);
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        const latest = pendingText.current.get(id);
        pendingText.current.delete(id);
        if (latest !== undefined) enqueue(id, () => api.updateBlock(id, { text: latest }));
      }, TEXT_DEBOUNCE_MS),
    );
  }

  function place(afterId: string | null): number {
    const current = blocksRef.current ?? [];
    if (afterId === null) {
      const last = current[current.length - 1];
      return last ? last.position + 1 : 1;
    }
    const index = current.findIndex((b) => b.id === afterId);
    const anchor = current[index];
    if (!anchor) {
      const last = current[current.length - 1];
      return last ? last.position + 1 : 1;
    }
    const next = current[index + 1];
    return next ? (anchor.position + next.position) / 2 : anchor.position + 1;
  }

  // afterId null appends to the end. Synchronous: the caller can focus the
  // returned block immediately; the POST trails behind on the queue.
  function insert(afterId: string | null, kind: BlockKind, text: string): Block {
    const block: Block = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      kind,
      position: place(afterId),
      dueOn: null,
    };
    commit(sorted([...(blocksRef.current ?? []), block]));
    enqueue(block.id, () =>
      api.createBlock(listId, {
        id: block.id,
        kind,
        text,
        position: block.position,
      }),
    );
    return block;
  }

  function insertBefore(beforeId: string, kind: BlockKind, text: string): Block {
    const current = blocksRef.current ?? [];
    const index = current.findIndex((b) => b.id === beforeId);
    const anchor = current[index];
    if (!anchor) return insert(null, kind, text);
    const prev = current[index - 1];
    const position = prev
      ? (prev.position + anchor.position) / 2
      : anchor.position - 1;
    const block: Block = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      kind,
      position,
      dueOn: null,
    };
    commit(sorted([...current, block]));
    enqueue(block.id, () =>
      api.createBlock(listId, { id: block.id, kind, text, position }),
    );
    return block;
  }

  function convert(id: string, kind: BlockKind, text: string) {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    pendingText.current.delete(id);
    patchLocal(id, { kind, text });
    enqueue(id, () => api.updateBlock(id, { kind, text }));
  }

  function toggle(id: string, completed: boolean) {
    patchLocal(id, { completed });
    enqueue(id, () => api.updateBlock(id, { completed }));
  }

  // A day sets the date, null clears it. Never debounced: a date is a
  // deliberate mark, not a stream of keystrokes.
  function setDue(id: string, dueOn: string | null) {
    patchLocal(id, { dueOn });
    enqueue(id, () => api.updateBlock(id, { dueOn }));
  }

  function remove(id: string) {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    pendingText.current.delete(id);
    commit((blocksRef.current ?? []).filter((b) => b.id !== id));
    enqueue(id, () => api.deleteBlock(id));
  }

  return {
    blocks,
    insert,
    insertBefore,
    setText,
    flushText,
    convert,
    toggle,
    setDue,
    remove,
  };
}

export type BlocksApi = Omit<ReturnType<typeof useBlocks>, "blocks">;
