import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { AuthContextType, User } from '../types/index';
import { storage } from '../utils/storage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on app launch + seed default data
  useEffect(() => {
    const init = async () => {
      await storage.seedDefaultData();
      const savedUser = await storage.getUser();
      if (savedUser) setUser(savedUser);
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const users = await storage.getUsers();
      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!found) throw new Error('Invalid email or password.');
      await storage.setUser(found);
      setUser(found);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await storage.removeUser();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const users = await storage.getUsers();
      const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) throw new Error('Email already in use.');
      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        password,
        role: 'user',
      };
      await storage.setUsers([...users, newUser]);
      await storage.setUser(newUser);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};