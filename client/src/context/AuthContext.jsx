import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('owba_token');
    const storedUser = localStorage.getItem('owba_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('owba_token');
        localStorage.removeItem('owba_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (owba_id, password) => {
    const data = await apiLogin(owba_id, password);
    localStorage.setItem('owba_token', data.token);
    localStorage.setItem('owba_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('owba_token');
    localStorage.removeItem('owba_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('owba_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, updateUser, isAdmin, isSuperAdmin, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
