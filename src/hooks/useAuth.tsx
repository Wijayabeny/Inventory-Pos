// ============================================================
// Auth Context
// ============================================================

import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  hasAccess: (required: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: User[] = [
  { id: 'U001', username: 'admin', nama: 'Administrator', role: 'admin', aktif: true, created_at: new Date().toISOString() },
  { id: 'U002', username: 'gudang', nama: 'Staff Gudang', role: 'gudang', aktif: true, created_at: new Date().toISOString() },
  { id: 'U003', username: 'kasir', nama: 'Staff Kasir', role: 'kasir', aktif: true, created_at: new Date().toISOString() },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('inv_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const login = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem('inv_user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('inv_user');
  }, []);

  const hasAccess = useCallback((required: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return required.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { DEMO_USERS };
