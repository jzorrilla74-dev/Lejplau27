import { createContext, useContext, useState } from 'react';

export const FirestoreContext = createContext({
  status: 'idle',
  lastSaved: null,
  setStatus: () => {},
  setLastSaved: () => {},
});

export function FirestoreProvider({ children }) {
  const [status, setStatus] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);

  return (
    <FirestoreContext.Provider value={{ status, lastSaved, setStatus, setLastSaved }}>
      {children}
    </FirestoreContext.Provider>
  );
}

export function useFirestoreStatus() {
  return useContext(FirestoreContext);
}
