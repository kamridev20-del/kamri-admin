'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

interface ProductUpdateNotification {
  id: string;
  productId?: string;
  cjProductId: string;
  cjVariantId?: string;
  webhookType: string;
  webhookMessageId: string;
  changes: string[];
  productName?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

interface ProductUpdateNotificationsState {
  notifications: ProductUpdateNotification[];
  total: number;
  unreadCount: number;
}

export function useProductUpdateNotifications() {
  const [notifications, setNotifications] = useState<ProductUpdateNotificationsState>({
    notifications: [],
    total: 0,
    unreadCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient('/products/update-notifications?limit=50') as any;
      if (response?.notifications) {
        setNotifications({
          notifications: response.notifications,
          total: response.total,
          unreadCount: response.unreadCount,
        });
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de la récupération des notifications de mise à jour:', err);
      setError(err.message || 'Impossible de charger les notifications de mise à jour');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);

    // Écouter l'événement de rafraîchissement manuel
    const handleRefresh = () => {
      console.log('🔄 Événement refreshProductUpdateNotifications reçu');
      fetchNotifications();
    };
    window.addEventListener('refreshProductUpdateNotifications', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshProductUpdateNotifications', handleRefresh);
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient(`/products/update-notifications/${id}/read`, {
        method: 'PATCH',
      });
      // Mettre à jour l'état local sans re-fetch complet pour une meilleure UX
      setNotifications(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif =>
          notif.id === id ? { ...notif, isRead: true, readAt: new Date().toISOString() } : notif
        ),
        unreadCount: prev.unreadCount > 0 ? prev.unreadCount - 1 : 0,
      }));
    } catch (err: any) {
      console.error('❌ Erreur lors du marquage comme lu:', err);
      setError(err.message || 'Impossible de marquer la notification comme lue');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient('/products/update-notifications/read-all', {
        method: 'PATCH',
      });
      // Mettre à jour l'état local
      setNotifications(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => ({ ...notif, isRead: true, readAt: new Date().toISOString() })),
        unreadCount: 0,
      }));
    } catch (err: any) {
      console.error('❌ Erreur lors du marquage de toutes les notifications comme lues:', err);
      setError(err.message || 'Impossible de marquer toutes les notifications comme lues');
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}

