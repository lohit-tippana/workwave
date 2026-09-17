import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role: 'client' | 'freelancer') => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('workwave_token'));
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data.data.user))
      .catch(() => { localStorage.removeItem('workwave_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const persist = (u: User, t: string) => {
    localStorage.setItem('workwave_token', t);
    setToken(t);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    persist(r.data.data.user, r.data.data.token);
    return r.data.data.user as User;
  };

  const register = async (name: string, email: string, password: string, role: 'client' | 'freelancer') => {
    const r = await api.post('/auth/register', { name, email, password, role });
    persist(r.data.data.user, r.data.data.token);
    return r.data.data.user as User;
  };

  const logout = () => {
    localStorage.removeItem('workwave_token');
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    const r = await api.get('/auth/me');
    setUser(r.data.data.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
