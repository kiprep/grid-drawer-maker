import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

const STORAGE_KEY = 'gridfinity-settings';
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore corrupt data */ }
  return {};
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = loadSettings();
    return {
      apiBase: saved.apiBase || DEFAULT_API_BASE,
      apiKey: saved.apiKey || '',
      showLabelBackground: saved.showLabelBackground !== undefined ? saved.showLabelBackground : false
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (partial) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  return (
    <SettingsContext.Provider value={{ ...settings, defaultApiBase: DEFAULT_API_BASE, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
