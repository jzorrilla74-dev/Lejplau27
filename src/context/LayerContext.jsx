import { createContext, useContext, useReducer } from 'react';

const DEFAULT_LAYERS = [
  { id: 'site',        name: 'Site',        visible: true, locked: true,  opacity: 1, order: 1 },
  { id: 'structure',   name: 'Structure',   visible: true, locked: true,  opacity: 1, order: 2 },
  { id: 'rooms',       name: 'Rooms',       visible: true, locked: false, opacity: 1, order: 3 },
  { id: 'annotations', name: 'Annotations', visible: true, locked: false, opacity: 1, order: 4 },
  { id: 'furniture',   name: 'Furniture',   visible: true, locked: false, opacity: 1, order: 5 },
];

const INITIAL = { layers: DEFAULT_LAYERS, activeLayerId: 'rooms' };

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_VISIBLE':
      return { ...state, layers: state.layers.map(l => l.id === action.id ? { ...l, visible: !l.visible } : l) };
    case 'TOGGLE_LOCKED':
      return { ...state, layers: state.layers.map(l => l.id === action.id ? { ...l, locked: !l.locked } : l) };
    case 'SET_OPACITY':
      return { ...state, layers: state.layers.map(l => l.id === action.id ? { ...l, opacity: action.opacity } : l) };
    case 'RENAME_LAYER':
      return { ...state, layers: state.layers.map(l => l.id === action.id ? { ...l, name: action.name } : l) };
    case 'REORDER':
      return { ...state, layers: action.layers };
    case 'ADD_LAYER': {
      const maxOrder = Math.max(...state.layers.map(l => l.order), 0);
      return { ...state, layers: [...state.layers, { id: action.id, name: action.name, visible: true, locked: false, opacity: 1, order: maxOrder + 1 }] };
    }
    case 'REMOVE_LAYER':
      return { ...state, layers: state.layers.filter(l => l.id !== action.id) };
    case 'SET_ACTIVE':
      return { ...state, activeLayerId: action.id };
    default:
      return state;
  }
}

const LayerContext = createContext(null);

export function LayerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  return <LayerContext.Provider value={{ ...state, dispatch }}>{children}</LayerContext.Provider>;
}

export function useLayers() {
  return useContext(LayerContext);
}
