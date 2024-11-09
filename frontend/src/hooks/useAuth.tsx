import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      login: (token, user) => {
        localStorage.setItem('token', token);
        set({
          user,
          token,
          isAuthenticated: true,
          isAdmin: user.role === 'admin'
        });
      },
      logout: () => {
        localStorage.removeItem('token');
        // Force light theme on logout
        const root = window.document.documentElement;
        root.classList.remove('dark');
        root.classList.add('light');
        localStorage.setItem('theme', 'light');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAdmin: false
        });
      },
      updateUser: (user) => set({
        user,
        isAdmin: user.role === 'admin'
      })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin
      })
    }
  )
);

export const checkAuthStatus = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    useAuth.getState().logout();
    return;
  }

  try {
    const response = await fetch('http://localhost:8080/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const user = await response.json();
    useAuth.getState().updateUser(user);
  } catch (error) {
    useAuth.getState().logout();
  }
};