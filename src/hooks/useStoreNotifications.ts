'use client';

import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

export interface StoreNotification {
  id: string;
  name: string;
  count: number;
  type: 'store';
}

export interface NotificationSummary {
  total: number;
  items: StoreNotification[];
  storesCount: number;
}

/**
 * Hook pour récupérer les notifications de produits disponibles à importer
 * Rafraîchit automatiquement toutes les 30 secondes
 */
export function useStoreNotifications() {
  const [notifications, setNotifications] = useState<NotificationSummary>({
    total: 0,
    items: [],
    storesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setError(null);
      
      // Récupérer la liste des magasins
      const storesResponse = await apiClient('/stores') as any;
      const stores = Array.isArray(storesResponse) ? storesResponse : [];
      
      console.log('📊 Magasins récupérés pour notifications:', stores.length);

      // Pour chaque magasin, compter les produits disponibles
      const storeNotifications: StoreNotification[] = await Promise.all(
        stores.map(async (store: any) => {
          try {
            let products: any[] = [];
            
            // Les magasins CJ utilisent un endpoint spécial
            if (store.id === 'cj-dropshipping' || store.id === 'cj-favorites') {
              const response = await apiClient(`/cj-dropshipping/stores/${store.id}/products`) as any;
              // La réponse CJ est { products: [...], categories: [...] }
              products = response.products || [];
            } else {
              // Magasins normaux
              const response = await apiClient(`/stores/${store.id}/products`) as any;
              // Peut être directement un tableau ou un objet { products: [...] }
              products = Array.isArray(response) ? response : (response.products || []);
            }
            
            // Compter les produits avec status "available"
            const availableCount = products.filter(
              (p: any) => p.status === 'available'
            ).length;

            console.log(`🏪 ${store.name}: ${availableCount} produits disponibles sur ${products.length} total`);

            return {
              id: store.id,
              name: store.name || 'Magasin sans nom',
              count: availableCount,
              type: 'store' as const,
            };
          } catch (err) {
            console.error(`❌ Erreur récupération produits magasin ${store.id}:`, err);
            return {
              id: store.id,
              name: store.name || 'Magasin sans nom',
              count: 0,
              type: 'store' as const,
            };
          }
        })
      );

      // Filtrer uniquement les magasins avec des produits
      const itemsWithProducts = storeNotifications.filter(item => item.count > 0);
      const totalCount = itemsWithProducts.reduce((sum, item) => sum + item.count, 0);

      console.log(`🔔 Notifications: ${totalCount} produits au total (${itemsWithProducts.length} magasins)`);

      setNotifications({
        total: totalCount,
        items: itemsWithProducts,
        storesCount: itemsWithProducts.length,
      });
      setLoading(false);
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des notifications:', err);
      setError('Impossible de charger les notifications');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);

    // Écouter l'événement de rafraîchissement manuel
    const handleRefresh = () => fetchNotifications();
    window.addEventListener('refreshStoreNotifications', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshStoreNotifications', handleRefresh);
    };
  }, []);

  return {
    notifications,
    loading,
    error,
    refresh: fetchNotifications,
  };
}
