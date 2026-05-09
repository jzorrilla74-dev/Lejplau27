import { createContext, useContext, useReducer, useEffect } from 'react';

const INITIAL_STATE = {
  projectName: '79 Woods Street Newport',
  household: {
    occupants: 2,
    children: false,
    pets: '1 dog',
    workFromHome: true,
    whfDescription: '2 studios required',
    accessibility: '',
  },
  programme: [
    { id: 'br1', name: 'Bedroom',      targetM2: 18, priority: 'essential', checked: true },
    { id: 'br2', name: 'Bedroom',      targetM2: 16, priority: 'essential', checked: true },
    { id: 'st1', name: 'Studio',       targetM2: 20, priority: 'essential', checked: true },
    { id: 'st2', name: 'Studio',       targetM2: 18, priority: 'essential', checked: true },
    { id: 'ba1', name: 'Bathroom',     targetM2: 5,  priority: 'essential', checked: true },
    { id: 'ba2', name: 'Bathroom',     targetM2: 5,  priority: 'essential', checked: true },
    { id: 'ba3', name: 'Bathroom',     targetM2: 5,  priority: 'essential', checked: true },
    { id: 'kc1', name: 'Kitchen',      targetM2: 16, priority: 'essential', checked: true },
    { id: 'lv1', name: 'Living/dining',targetM2: 35, priority: 'essential', checked: true },
    { id: 'co1', name: 'Courtyard',    targetM2: 30, priority: 'essential', checked: true },
    { id: 'la1', name: 'Laundry',      targetM2: 5,  priority: 'essential', checked: true },
    { id: 'pk1', name: 'Parking',      targetM2: 18, priority: 'desired',   checked: true },
    { id: 'ga1', name: 'Garden',       targetM2: 40, priority: 'desired',   checked: true },
  ],
  priorities: [
    'indoor-outdoor connection',
    'natural light / passive solar',
    'acoustic separation',
    'privacy from street',
    'dog-friendly design',
    'sustainability / NatHERS 7-star',
  ],
  style: {
    aesthetic: 'Japanese/Persian courtyard',
    materials: '',
    references: '',
    avoid: '',
  },
  siteNotes: 'GRZ1 Hobsons Bay, no overlays. 9.4×33.5m block. Party wall south boundary 9.37–17.62m from street. Street faces north. Cooperative neighbour Lot 10.',
};

function loadSaved() {
  try {
    const saved = localStorage.getItem('lejplau27_brief');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.value };
    case 'UPDATE_HOUSEHOLD':
      return { ...state, household: { ...state.household, ...action.patch } };
    case 'UPDATE_PROGRAMME_ITEM':
      return {
        ...state,
        programme: state.programme.map(p => p.id === action.id ? { ...p, ...action.patch } : p),
      };
    case 'ADD_PROGRAMME_ITEM':
      return { ...state, programme: [...state.programme, action.item] };
    case 'REMOVE_PROGRAMME_ITEM':
      return { ...state, programme: state.programme.filter(p => p.id !== action.id) };
    case 'REORDER_PRIORITIES':
      return { ...state, priorities: action.priorities };
    case 'UPDATE_STYLE':
      return { ...state, style: { ...state.style, ...action.patch } };
    case 'UPDATE_SITE_NOTES':
      return { ...state, siteNotes: action.value };
    default:
      return state;
  }
}

const BriefContext = createContext(null);

export function BriefProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadSaved);

  useEffect(() => {
    localStorage.setItem('lejplau27_brief', JSON.stringify(state));
  }, [state]);

  return <BriefContext.Provider value={{ state, dispatch }}>{children}</BriefContext.Provider>;
}

export function useBrief() {
  return useContext(BriefContext);
}
