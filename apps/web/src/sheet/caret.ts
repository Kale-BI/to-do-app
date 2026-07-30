// Caret helpers for single-block contentEditable lines. jsdom implements only
// part of the Selection API, so every helper degrades to a safe answer there.

export function caretOffset(el: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer)) return null;
  const before = range.cloneRange();
  before.selectNodeContents(el);
  before.setEnd(range.startContainer, range.startOffset);
  return before.toString().length;
}

export function placeCaret(el: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  const length = el.textContent?.length ?? 0;
  let remaining = Math.max(0, Math.min(offset, length));
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (remaining <= node.data.length) {
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= node.data.length;
    node = walker.nextNode() as Text | null;
  }
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function selectionCollapsed(): boolean {
  const selection = window.getSelection();
  return !selection || selection.isCollapsed;
}

function caretRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const rects = selection.getRangeAt(0).getClientRects();
  return rects.length > 0 ? (rects[0] ?? null) : null;
}

// Whether the caret sits on the first/last visual line of a wrapped block.
// When rects are unavailable (empty block, jsdom) the answer is true so that
// arrow keys still cross block boundaries.
export function caretOnFirstLine(el: HTMLElement): boolean {
  const rect = caretRect();
  if (!rect || rect.height === 0) return true;
  return rect.top - el.getBoundingClientRect().top < rect.height * 0.9;
}

export function caretOnLastLine(el: HTMLElement): boolean {
  const rect = caretRect();
  if (!rect || rect.height === 0) return true;
  return el.getBoundingClientRect().bottom - rect.bottom < rect.height * 0.9;
}
