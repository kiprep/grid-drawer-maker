import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('gridfinity-theme');
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('gridfinity-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light' ? {
    // Light mode colors
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#667eea',
    primaryHover: '#5568d3',
    success: '#48bb78',
    warning: '#f59e0b',
    danger: '#ef4444',
    input: '#ffffff',
    inputBorder: '#d1d5db',
    canvasBg: '#e0e0e0',
    gridMain: '#999999',
    gridSection: '#666666'
  } : {
    // Dark mode colors
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    border: '#374151',
    primary: '#818cf8',
    primaryHover: '#6366f1',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    input: '#374151',
    inputBorder: '#4b5563',
    canvasBg: '#0f172a',
    gridMain: '#4b5563',
    gridSection: '#6b7280'
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
