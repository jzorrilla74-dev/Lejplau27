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
    case 'ADD_ROOM':    return [...rooms, action.room];
    case 'UPDATE_ROOM': return rooms.map(r => r.uid === action.uid ? { ...r, ...action.patch } : r);
    case 'REMOVE_ROOM': return rooms.filter(r => r.uid !== action.uid);
    case 'CLEAR_ROOMS': return [];
    default:            return rooms;
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
