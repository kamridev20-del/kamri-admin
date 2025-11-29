'use client';

import { apiClient } from '@/lib/api';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, name: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté au chargement
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        // ✅ Vérifier que le token est valide en appelant l'API profile (plus léger que dashboard/stats)
        try {
          // Récupérer les infos utilisateur depuis localStorage d'abord
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Vérifier le token en arrière-plan sans bloquer l'UI
            apiClient.getProfile?.().catch(() => {
              // Token invalide, nettoyer silencieusement
              console.log('❌ [AuthContext] Token invalide, déconnexion...');
              apiClient.logout();
              setUser(null);
            });
          } else {
            // Si pas d'infos utilisateur, essayer de récupérer depuis l'API
            try {
              const profileResponse = await apiClient.getProfile?.();
              if (profileResponse?.data) {
                setUser(profileResponse.data);
              } else {
                // Token invalide, nettoyer
                console.log('❌ [AuthContext] Token invalide, déconnexion...');
                apiClient.logout();
                setUser(null);
              }
            } catch (error) {
              // Token invalide ou erreur, nettoyer
              console.log('❌ [AuthContext] Erreur vérification token, déconnexion...', error);
              apiClient.logout();
              setUser(null);
            }
          }
        } catch (error) {
          // Erreur, nettoyer
          console.log('❌ [AuthContext] Erreur vérification token, déconnexion...', error);
          apiClient.logout();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔑 [AuthContext] Tentative de connexion pour:', email);
    const response = await apiClient.login(email, password);
    
    if (response.data && response.data.user) {
      console.log('✅ [AuthContext] Connexion réussie, utilisateur:', response.data.user.email);
      setUser(response.data.user);
      // ✅ Vérifier que le token fonctionne avec getProfile (plus léger que dashboard/stats)
      try {
        const testResponse = await apiClient.getProfile?.();
        if (testResponse?.error || !testResponse?.data) {
          console.error('❌ [AuthContext] Token généré mais invalide:', testResponse?.error);
          return { success: false, error: 'Token invalide après connexion' };
        }
        console.log('✅ [AuthContext] Token validé avec succès');
      } catch (error) {
        console.error('❌ [AuthContext] Erreur validation token:', error);
        return { success: false, error: 'Erreur de validation du token' };
      }
      return { success: true };
    } else {
      console.error('❌ [AuthContext] Erreur de connexion:', response.error);
      return { success: false, error: response.error || 'Erreur de connexion' };
    }
  };

  const register = async (email: string, name: string, password: string, role: string = 'admin') => {
    const response = await apiClient.register(email, name, password, role);
    
    if (response.data) {
      setUser(response.data.user);
      return { success: true };
    } else {
      return { success: false, error: response.error };
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
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
