'use client';

import CacheManager from '@/components/cj/CacheManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Info, Settings, TrendingUp } from 'lucide-react';
import React from 'react';

const CacheManagementPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion du Cache CJ</h1>
          <p className="text-muted-foreground">
            Surveillez et optimisez les performances du cache CJ Dropshipping
          </p>
        </div>
      </div>

      {/* Information sur le cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            À propos du système de cache
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Performance</h4>
                <p className="text-blue-700">
                  Le cache améliore considérablement les temps de réponse en évitant 
                  les appels répétés à l'API CJ Dropshipping.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Database className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900">Économies</h4>
                <p className="text-green-700">
                  Réduit la consommation des quotas API et améliore l'expérience 
                  utilisateur avec des réponses plus rapides.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Settings className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900">Configuration</h4>
                <p className="text-purple-700">
                  TTL différentiés selon le type de données : recherche (5min), 
                  détails (15min), stock (2min).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Composant principal de gestion du cache */}
      <CacheManager />

      {/* Documentation technique */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation Technique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Types de cache implémentés :</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Cache de recherche :</strong> Résultats des requêtes de recherche de produits</li>
                <li><strong>Cache de détails :</strong> Informations détaillées des produits individuels</li>
                <li><strong>Cache de stock :</strong> Données de stock des variantes de produits</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Stratégie de TTL (Time To Live) :</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Recherche (5 minutes) :</strong> Équilibre entre fraîcheur et performance</li>
                <li><strong>Détails (15 minutes) :</strong> Les détails produits changent moins fréquemment</li>
                <li><strong>Stock (2 minutes) :</strong> Les données de stock peuvent changer rapidement</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Nettoyage automatique :</h4>
              <p className="text-gray-600">
                Le système nettoie automatiquement les entrées expirées lors des accès aux caches.
                Vous pouvez également forcer un nettoyage complet via le bouton "Nettoyer".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CacheManagementPage;