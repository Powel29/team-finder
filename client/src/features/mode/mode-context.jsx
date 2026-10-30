import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'tf_mode';
const ModeContext = createContext(null);

const readStoredMode = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'owner' ? 'owner' : 'member';
  } catch {
    return 'member';
  }
};

/** "member" or "owner": changes emphasis in navigation and dashboard, never permissions. */
export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode);

  const setMode = useCallback((next) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage can be blocked; the mode still applies for this session
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode, isOwner: mode === 'owner' }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used inside ModeProvider');
  return ctx;
}
