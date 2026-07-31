import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ms_token'));
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ms_token', data.token);
    localStorage.setItem('ms_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ms_token');
    localStorage.removeItem('ms_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      localStorage.setItem('ms_user', JSON.stringify(data));
    } catch (e) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data);
          localStorage.setItem('ms_user', JSON.stringify(data));
        } catch (e) {
          setUser(null);
          localStorage.removeItem('ms_token');
          localStorage.removeItem('ms_user');
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
