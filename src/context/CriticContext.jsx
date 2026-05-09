import { createContext, useContext, useReducer } from 'react';

const INITIAL = {
  messages: [],
  loading: false,
  apiKey: localStorage.getItem('lejplau27_apikey') || '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'APPEND_LAST': {
      const msgs = [...state.messages];
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + action.chunk };
      return { ...state, messages: msgs };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_API_KEY':
      localStorage.setItem('lejplau27_apikey', action.key);
      return { ...state, apiKey: action.key };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    default:
      return state;
  }
}

const CriticContext = createContext(null);

export function CriticProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  return <CriticContext.Provider value={{ ...state, dispatch }}>{children}</CriticContext.Provider>;
}

export function useCritic() {
  return useContext(CriticContext);
}
