import { useState } from 'react';

export function useHistory(initialState) {
  const [history, setHistory] = useState({
    past: [],
    present: initialState,
    future: [],
  });

  const push = (newState) =>
    setHistory(h => ({
      past: [...h.past.slice(-49), h.present],
      present: newState,
      future: [],
    }));

  const undo = () =>
    setHistory(h => {
      if (!h.past.length) return h;
      const previous = h.past[h.past.length - 1];
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
    });

  const redo = () =>
    setHistory(h => {
      if (!h.future.length) return h;
      const next = h.future[0];
      return { past: [...h.past, h.present], present: next, future: h.future.slice(1) };
    });

  return {
    state: history.present,
    push,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
