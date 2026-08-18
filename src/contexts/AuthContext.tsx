import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  tempUser: AppUser | null;
  setTempUser: (user: AppUser | null) => void;
  login: (user: AppUser) => void;
  logout: () => void;
  updateBalance: (balance: number) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [tempUser, setTempUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('kb_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('kb_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (u: AppUser) => {
    setUser(u);
    localStorage.setItem('kb_user', JSON.stringify(u));
    setTempUser(null);
    sessionStorage.removeItem('kb_temp_user');
  };

  const logout = () => {
    setUser(null);
    setTempUser(null);
    localStorage.removeItem('kb_user');
    sessionStorage.removeItem('kb_temp_user');
  };

  const updateBalance = (balance: number) => {
    if (user) {
      const updated = { ...user, balance };
      setUser(updated);
      localStorage.setItem('kb_user', JSON.stringify(updated));
    }
  };

  const handleSetTempUser = (u: AppUser | null) => {
    setTempUser(u);
    if (u) {
      sessionStorage.setItem('kb_temp_user', JSON.stringify(u));
    } else {
      sessionStorage.removeItem('kb_temp_user');
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('kb_temp_user');
    if (stored && !user) {
      try {
        setTempUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem('kb_temp_user');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, tempUser, setTempUser: handleSetTempUser, login, logout, updateBalance, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
