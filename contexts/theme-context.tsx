import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    cardBorder: string;
    success: string;
    error: string;
    warning: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors = {
  background: '#FFF9E6',
  card: '#FFFFFF',
  text: '#2C2C2C',
  textSecondary: '#666666',
  primary: '#FFD700',
  border: '#E8E8E8',
  cardBorder: '#F0F0F0',
  success: '#0bda95',
  error: '#fb444a',
  warning: '#ffa500',
};

const darkColors = {
  background: '#303135',
  card: '#46474a',
  text: '#e0daca',
  textSecondary: '#9e9c93',
  primary: '#0bda95',
  border: '#525560',
  cardBorder: '#3a3d42',
  success: '#0bda95',
  error: '#fb444a',
  warning: '#ffa500',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((saved) => {
      if (saved === 'light' || saved === 'dark') setTheme(saved);
      else setTheme('light'); // Default to light
    });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    AsyncStorage.setItem('theme', newTheme);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
