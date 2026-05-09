import { createContext, useContext, useReducer } from 'react';
import { SCALE_DEFAULT } from '../lib/constants';

const INITIAL = {
  scale: SCALE_DEFAULT,
  panX: 0,
  panY: 0,
  activeTool: 'select',
  gridVisible: true,
  theme: 'dark',
  selectedUid: null,
  fitRequested: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SCALE':    return { ...state, scale: action.scale };
    case 'SET_PAN':      return { ...state, panX: action.panX, panY: action.panY };
    case 'FIT_BLOCK':    return { ...state, scale: action.scale, panX: action.panX, panY: action.panY };
    case 'REQUEST_FIT':  return { ...state, fitRequested: state.fitRequested + 1 };
    case 'SET_TOOL':     return { ...state, activeTool: action.tool };
    case 'TOGGLE_GRID':  return { ...state, gridVisible: !state.gridVisible };
    case 'TOGGLE_THEME': return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
    case 'SELECT_ROOM':  return { ...state, selectedUid: action.uid };
    case 'DESELECT':     return { ...state, selectedUid: null };
    default:             return state;
  }
}

const CanvasContext = createContext(null);

export function CanvasProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  return <CanvasContext.Provider value={{ ...state, dispatch }}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  return useContext(CanvasContext);
}
