import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/contexts/ToastContext';
import { useCJDropshipping } from '@/hooks/useCJDropshipping';
import { BarChart3, Clock, Database, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface CacheStats {
  searchHits: number;
  searchMisses: number;
  detailsHits: number;
  detailsMisses: number;
  stockHits: number;
  stockMisses: number;
  cacheSizes: {
    search: number;
    details: number;
    stock: number;
  };
  hitRates: {
    search: number;
    details: number;
    stock: number;
  };
}

const CacheManager: React.FC = () => {
  const { getCacheStats, cleanExpiredCache, loading } = useCJDropshipping();
  const { showToast } = useToast();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Charger les statistiques au montage
  useEffect(() => {
    loadStats();
  }, []);

  // Auto-refresh toutes les 30 secondes si activé
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadStats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadStats = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    
    try {
      const result = await getCacheStats();
      setStats(result.data);
    } catch (error) {
      if (!silent) {
        showToast({
          type: 'error',
          title: 'Erreur',
          description: 'Erreur lors du chargement des statistiques'
        });
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const handleCleanCache = async () => {
    setIsCleaning(true);
    
    try {
      await cleanExpiredCache();
      showToast({
        type: 'success',
        title: 'Succès',
        description: 'Cache nettoyé avec succès'
      });
      // Recharger les stats après nettoyage
      await loadStats();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Erreur',
        description: 'Erreur lors du nettoyage du cache'
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const calculateHitRate = (hits: number, misses: number): number => {
    const total = hits + misses;
    return total > 0 ? Math.round((hits / total) * 100) : 0;
  };

  const getHitRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHitRateVariant = (rate: number): "default" | "secondary" | "destructive" | "outline" => {
    if (rate >= 80) return 'default';
    if (rate >= 60) return 'secondary';
    return 'destructive';
  };

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gestionnaire de Cache CJ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="ml-2">Chargement des statistiques...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Gestionnaire de Cache CJ
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
              >
                <Clock className="h-4 w-4 mr-1" />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadStats()}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCleanCache}
                disabled={isCleaning}
              >
                <Trash2 className={`h-4 w-4 mr-1 ${isCleaning ? 'animate-spin' : ''}`} />
                Nettoyer
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cache de recherche */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cache Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Taux de réussite</span>
                  <Badge variant={getHitRateVariant(stats.hitRates.search)}>
                    {Math.round(stats.hitRates.search)}%
                  </Badge>
                </div>
                <Progress value={stats.hitRates.search} className="mt-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Hits:</span>
                  <div className="font-semibold text-green-600">{stats.searchHits}</div>
                </div>
                <div>
                  <span className="text-gray-500">Misses:</span>
                  <div className="font-semibold text-red-600">{stats.searchMisses}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Entrées: {stats.cacheSizes.search}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache détails */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Cache Détails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Taux de réussite</span>
                  <Badge variant={getHitRateVariant(stats.hitRates.details)}>
                    {Math.round(stats.hitRates.details)}%
                  </Badge>
                </div>
                <Progress value={stats.hitRates.details} className="mt-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Hits:</span>
                  <div className="font-semibold text-green-600">{stats.detailsHits}</div>
                </div>
                <div>
                  <span className="text-gray-500">Misses:</span>
                  <div className="font-semibold text-red-600">{stats.detailsMisses}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Entrées: {stats.cacheSizes.details}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache stock */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Taux de réussite</span>
                  <Badge variant={getHitRateVariant(stats.hitRates.stock)}>
                    {Math.round(stats.hitRates.stock)}%
                  </Badge>
                </div>
                <Progress value={stats.hitRates.stock} className="mt-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Hits:</span>
                  <div className="font-semibold text-green-600">{stats.stockHits}</div>
                </div>
                <div>
                  <span className="text-gray-500">Misses:</span>
                  <div className="font-semibold text-red-600">{stats.stockMisses}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Entrées: {stats.cacheSizes.stock}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informations détaillées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration du Cache</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">TTL Recherche</h4>
              <p className="text-gray-600">5 minutes</p>
              <p className="text-xs text-gray-500">
                Les résultats de recherche sont mis en cache pendant 5 minutes pour optimiser les requêtes répétées.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">TTL Détails</h4>
              <p className="text-gray-600">15 minutes</p>
              <p className="text-xs text-gray-500">
                Les détails des produits sont mis en cache plus longtemps car ils changent moins fréquemment.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">TTL Stock</h4>
              <p className="text-gray-600">2 minutes</p>
              <p className="text-xs text-gray-500">
                Le stock est mis en cache brièvement car il peut changer rapidement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CacheManager;