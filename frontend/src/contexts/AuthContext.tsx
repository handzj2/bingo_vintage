'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USE_MOCK_DB = true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');
      
      if (savedUser && token) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        
        if (!USE_MOCK_DB) {
          api.setToken(token);
          await refreshUser();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (USE_MOCK_DB) return;
    try {
      const response = await api.get('/auth/me');
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const login = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    try {
      if (USE_MOCK_DB) {
        const mockUsers = [
          { id: 1, username: 'admin', email: 'admin@bingo.com', password: 'admin123', first_name: 'Admin', last_name: 'User', role: 'admin' },
          { id: 2, username: 'cashier', email: 'cashier@bingo.com', password: 'cashier123', first_name: 'Cashier', last_name: 'User', role: 'cashier' },
          { id: 3, username: 'agent', email: 'agent@bingo.com', password: 'agent123', first_name: 'Agent', last_name: 'User', role: 'agent' },
        ];
        
        const mockUser = mockUsers.find((u: any) => 
          (u.username === credentials.username || u.email === credentials.username) && 
          u.password === credentials.password
        );

        if (mockUser) {
          const userData: User = {
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email,
            first_name: mockUser.first_name,
            last_name: mockUser.last_name,
            role: mockUser.role,
          };
          
          const token = 'mock_token_' + Date.now();
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('access_token', token);
          
          // Redirect to dashboard after successful mock login
          router.push('/dashboard');
        } else {
          throw new Error('Invalid credentials');
        }
      } else {
        const response = await api.post('/auth/login', {
          username: credentials.username,
          password: credentials.password,
        });
        
        if (response.success && response.data) {
          const { user: userData, access_token } = response.data;
          
          const mappedUser: User = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            first_name: userData.fullName ? userData.fullName.split(' ')[0] : userData.username,
            last_name: userData.fullName ? userData.fullName.split(' ').slice(1).join(' ') : '',
            role: userData.role,
          };
          
          api.setToken(access_token);
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('user', JSON.stringify(mappedUser));
          setUser(mappedUser);
          
          // Redirect to dashboard after successful real login
          router.push('/dashboard');
        } else {
          throw new Error(response.message || 'Login failed');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}