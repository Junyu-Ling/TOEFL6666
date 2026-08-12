import { useEffect } from "react";

function touchesPassage(passage, node) {
  if (!passage || !node) return false;
  return passage.contains(node instanceof Node ? node : null);
}

function selectionTouchesPassage(passage) {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  return passage.contains(range.commonAncestorContainer);
}

function isBlankInput(node) {
  return node instanceof HTMLInputElement && node.classList.contains("rfill-blank__box");
}

export function usePassageContentProtection(passageRef) {
  useEffect(() => {
    const passage = passageRef.current;
    if (!passage) return;

    const blockPassageClipboard = (event) => {
      if (touchesPassage(passage, event.target) || selectionTouchesPassage(passage)) {
        event.preventDefault();
      }
    };

    const onContextMenu = (event) => {
      if (touchesPassage(passage, event.target)) {
        event.preventDefault();
      }
    };

    const onSelectStart = (event) => {
      if (isBlankInput(event.target)) return;
      if (touchesPassage(passage, event.target)) {
        event.preventDefault();
      }
    };

    const onDragStart = (event) => {
      if (touchesPassage(passage, event.target)) {
        event.preventDefault();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "PrintScreen") {
        event.preventDefault();
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;

      const key = event.key.toLowerCase();
      if (!["c", "x", "a", "p", "s"].includes(key)) return;

      const active = document.activeElement;
      if (isBlankInput(active)) return;

      if (key === "p" || touchesPassage(passage, active) || selectionTouchesPassage(passage)) {
        event.preventDefault();
      }
    };

    passage.addEventListener("copy", blockPassageClipboard);
    passage.addEventListener("cut", blockPassageClipboard);
    passage.addEventListener("contextmenu", onContextMenu);
    passage.addEventListener("selectstart", onSelectStart);
    passage.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      passage.removeEventListener("copy", blockPassageClipboard);
      passage.removeEventListener("cut", blockPassageClipboard);
      passage.removeEventListener("contextmenu", onContextMenu);
      passage.removeEventListener("selectstart", onSelectStart);
      passage.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [passageRef]);
}
