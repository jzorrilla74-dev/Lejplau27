import { createContext, useContext, useRef, useEffect } from 'react';
import { useHistory } from '../hooks/useHistory';
import { BLOCK } from '../lib/constants';

function loadSaved() {
  try {
    const saved = localStorage.getItem('lejplau27_layout');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { rooms: [], partyWallStartM: BLOCK.partyWall.startM };
}

function roomsReducer(rooms, action) {
  switch (action.type) {
    case 'ADD_ROOM': {
      const maxZ = rooms.reduce((m, r) => Math.max(m, r.zIndex ?? 0), 0);
      return [...rooms, { ...action.room, zIndex: maxZ + 1 }];
    }
    case 'UPDATE_ROOM': return rooms.map(r => r.uid === action.uid ? { ...r, ...action.patch } : r);
    case 'REMOVE_ROOM': return rooms.filter(r => r.uid !== action.uid);
    case 'CLEAR_ROOMS': return [];
    case 'BRING_TO_FRONT': {
      const maxZ = rooms.reduce((m, r) => Math.max(m, r.zIndex ?? 0), 0);
      return rooms.map(r => r.uid === action.uid ? { ...r, zIndex: maxZ + 1 } : r);
    }
    case 'SEND_TO_BACK': {
      const minZ = rooms.reduce((m, r) => Math.min(m, r.zIndex ?? 0), 0);
      return rooms.map(r => r.uid === action.uid ? { ...r, zIndex: minZ - 1 } : r);
    }
    case 'BRING_FORWARD': {
      const target = rooms.find(r => r.uid === action.uid);
      if (!target) return rooms;
      const nextHigher = rooms
        .filter(r => r.uid !== action.uid && (r.zIndex ?? 0) > (target.zIndex ?? 0))
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))[0];
      if (!nextHigher) return rooms;
      return rooms.map(r => {
        if (r.uid === action.uid) return { ...r, zIndex: nextHigher.zIndex ?? 0 };
        if (r.uid === nextHigher.uid) return { ...r, zIndex: target.zIndex ?? 0 };
        return r;
      });
    }
    case 'SEND_BACKWARD': {
      const target = rooms.find(r => r.uid === action.uid);
      if (!target) return rooms;
      const nextLower = rooms
        .filter(r => r.uid !== action.uid && (r.zIndex ?? 0) < (target.zIndex ?? 0))
        .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))[0];
      if (!nextLower) return rooms;
      return rooms.map(r => {
        if (r.uid === action.uid) return { ...r, zIndex: nextLower.zIndex ?? 0 };
        if (r.uid === nextLower.uid) return { ...r, zIndex: target.zIndex ?? 0 };
        return r;
      });
    }
    default: return rooms;
  }
}

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const saved = loadSaved();
  const { state: rooms, push, undo, redo, canUndo, canRedo } = useHistory(saved.rooms);
  const pwRef = useRef(saved.partyWallStartM);

  useEffect(() => {
    localStorage.setItem('lejplau27_layout', JSON.stringify({
      rooms,
      partyWallStartM: pwRef.current,
    }));
  });

  function dispatch(action) {
    if (action.type === 'SET_PARTY_WALL') {
      pwRef.current = Math.max(0, Math.min(action.startM, BLOCK.depthM - BLOCK.partyWall.lengthM));
      return;
    }
    if (action.type === 'LOAD_LAYOUT') {
      push(action.rooms ?? []);
      pwRef.current = action.partyWallStartM ?? BLOCK.partyWall.startM;
      return;
    }
    push(roomsReducer(rooms, action));
  }

  return (
    <LayoutContext.Provider value={{ rooms, partyWallStartM: pwRef.current, dispatch, undo, redo, canUndo, canRedo }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
