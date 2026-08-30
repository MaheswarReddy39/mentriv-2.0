import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  getAccessToken,
  getStoredUser,
  setAccessToken,
  setStoredUser,
} from '../utils/token-storage.js';

export const AuthContext = createContext(null);

const buildAuthValue = (accessToken, storedUser) => {
  // JWT payload contains only sub/role/tv/iat/exp (backend token contract).
  try {
    const [, payloadB64] = accessToken.split('.');
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    ));

    return {
      userId: payload.sub,
      role: payload.role,
      accessToken,
      user: {
        ...storedUser,
        id: payload.sub,
        role: payload.role,
        name: storedUser?.name || null,
        email: storedUser?.email || null,
      },
    };
  } catch {
    return null;
  }
};

export default function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const token = getAccessToken();
    if (!token) return null;
    return buildAuthValue(token, getStoredUser());
  });

  const setSession = useCallback((token, userSnapshot) => {
    if (token) {
      setAccessToken(token);
      if (userSnapshot) setStoredUser(userSnapshot);
    } else {
      setAccessToken(null);
      setStoredUser(null);
    }
    setState(token ? buildAuthValue(token, userSnapshot ?? getStoredUser()) : null);
  }, []);

  const value = useMemo(
    () => ({
      user: state?.user ?? null,
      accessToken: state?.accessToken ?? null,
      role: state?.role ?? null,
      isAuthenticated: Boolean(state),
      setSession,
    }),
    [state, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
