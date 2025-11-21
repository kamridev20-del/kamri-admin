'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

interface DuplicateStats {
  totalProducts: number;
  cjProducts: number;
  duplicatesFound: number;
  lastImports: {
    id: string;
    name: string;
    importStatus: string;
    lastImportAt: string;
    cjProductId: string;
  }[];
}

export function DuplicateStatsCard() {
  const [stats, setStats] = useState<DuplicateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const loadStats = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getDuplicateStats();
      
      if (response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.error || 'Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur chargement stats doublons:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-green-600 bg-green-100';
      case 'updated': return 'text-blue-600 bg-blue-100';
      case 'imported': return 'text-purple-600 bg-purple-100';
      case 'duplicate': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Nouveau';
      case 'updated': return 'Mis à jour';
      case 'imported': return 'Importé';
      case 'duplicate': return 'Doublon';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          Connexion requise pour voir les statistiques
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            🛡️ Protection Anti-Doublons
          </h3>
          <p className="text-sm text-gray-500">
            Statistiques de prévention des doublons
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {loading && !stats && (
        <div className="animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <>
          {/* Métriques principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-2xl text-blue-500">📦</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Produits</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-2xl text-green-500">🔗</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Produits CJ</p>
                  <p className="text-2xl font-bold text-green-900">{stats.cjProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-2xl text-orange-500">🛡️</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-600">Doublons Évités</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.duplicatesFound}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Historique des imports récents */}
          {stats.lastImports.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">
                📈 Derniers Imports CJ
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.lastImports.map((import_) => (
                  <div
                    key={import_.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {import_.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        CJ ID: {import_.cjProductId}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(import_.importStatus)}`}>
                        {getStatusLabel(import_.importStatus)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(import_.lastImportAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.lastImports.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>Aucun import récent</p>
              <p className="text-sm">Les imports CJ apparaîtront ici</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}