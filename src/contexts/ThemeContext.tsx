'use client';

import { apiClient } from '@/lib/api';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  accentColor: string;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccentColor: (color: string) => void;
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [accentColor, setAccentColorState] = useState<string>('#4CAF50');

  // Charger les paramètres de thème depuis l'API
  const loadThemeSettings = async () => {
    try {
      const response = await apiClient.getSettings();
      if (response.data) {
        const settingsData = response.data.data || response.data;
        setThemeState(settingsData.theme || 'light');
        setAccentColorState(settingsData.accentColor || '#4CAF50');
        applyThemeToDocument(settingsData.theme || 'light', settingsData.accentColor || '#4CAF50');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de thème:', error);
    }
  };

  // Appliquer le thème au document
  const applyThemeToDocument = (themeValue: 'light' | 'dark', color: string) => {
    const root = document.documentElement;
    
    // Supprimer les classes de thème existantes
    root.classList.remove('light', 'dark');
    
    // Ajouter la nouvelle classe de thème
    root.classList.add(themeValue);
    
    // Appliquer la couleur d'accent comme variable CSS
    root.style.setProperty('--accent-color', color);
    root.style.setProperty('--primary-color', color);
    
    // Appliquer les couleurs de thème
    if (themeValue === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#a0a0a0');
      root.style.setProperty('--border-color', '#404040');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--text-primary', '#1a1a1a');
      root.style.setProperty('--text-secondary', '#6b7280');
      root.style.setProperty('--border-color', '#e5e7eb');
    }
  };

  // Fonction pour changer le thème
  const setTheme = async (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    applyThemeToDocument(newTheme, accentColor);
    
    // Sauvegarder en base de données
    try {
      await apiClient.updateSettings({
        theme: newTheme,
        accentColor: accentColor
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  };

  // Fonction pour changer la couleur d'accent
  const setAccentColor = async (newColor: string) => {
    setAccentColorState(newColor);
    applyThemeToDocument(theme, newColor);
    
    // Sauvegarder en base de données
    try {
      await apiClient.updateSettings({
        theme: theme,
        accentColor: newColor
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la couleur:', error);
    }
  };

  // Fonction pour appliquer le thème (utilisée par les composants)
  const applyTheme = () => {
    applyThemeToDocument(theme, accentColor);
  };

  // Charger les paramètres au montage
  useEffect(() => {
    loadThemeSettings();
  }, []);

  // Appliquer le thème quand il change
  useEffect(() => {
    applyThemeToDocument(theme, accentColor);
  }, [theme, accentColor]);

  const value: ThemeContextType = {
    theme,
    accentColor,
    setTheme,
    setAccentColor,
    applyTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
