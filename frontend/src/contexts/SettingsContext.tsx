import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SettingsContextType {
  theme: 'light' | 'dark';
  language: 'en' | 'th';
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: 'en' | 'th') => void;
}

const SettingsContext = createContext<SettingsContextType>({
  theme: 'light',
  language: 'en',
  setTheme: () => {},
  setLanguage: () => {},
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [language, setLanguageState] = useState<'en' | 'th'>('en');

  // Load user settings when user changes
  useEffect(() => {
    const loadUserSettings = async () => {
      if (user?.id) {
        try {
          const response = await fetch('http://localhost:8080/api/user/settings', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            // Apply user's saved theme immediately
            setThemeState(data.theme || 'light');
            setLanguageState(data.language || 'en');
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(data.theme || 'light');
          }
        } catch (error) {
          console.error('Failed to load user settings:', error);
        }
      }
    };

    loadUserSettings();
  }, [user]);

  // Apply theme changes immediately
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = async (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    
    if (user?.id) {
      try {
        await fetch('http://localhost:8080/api/user/settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: newTheme,
            language,
            emailNotifications: true,
          }),
        });
      } catch (error) {
        console.error('Failed to save theme setting:', error);
      }
    }
  };

  const setLanguage = async (newLang: 'en' | 'th') => {
    setLanguageState(newLang);
    document.documentElement.lang = newLang;
    
    if (user?.id) {
      try {
        await fetch('http://localhost:8080/api/user/settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme,
            language: newLang,
            emailNotifications: true,
          }),
        });
      } catch (error) {
        console.error('Failed to save language setting:', error);
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      theme, 
      language, 
      setTheme,
      setLanguage
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};