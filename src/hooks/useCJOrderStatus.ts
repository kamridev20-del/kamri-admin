import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface CJOrderStatus {
  hasCJOrder: boolean;
  status?: string;
  cjOrderId?: string;
  cjOrderNumber?: string;
  trackNumber?: string;
  loading: boolean;
  error?: string;
}

export function useCJOrderStatus(orderId: string): CJOrderStatus {
  const [state, setState] = useState<CJOrderStatus>({
    hasCJOrder: false,
    loading: true
  });

  useEffect(() => {
    if (!orderId) {
      setState({
        hasCJOrder: false,
        loading: false
      });
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await apiClient.getCJStatus?.(orderId);
        
        if (response?.data?.success && response.data.hasCJOrder) {
          setState({
            hasCJOrder: true,
            status: response.data.data.status,
            cjOrderId: response.data.data.cjOrderId,
            cjOrderNumber: response.data.data.cjOrderNumber,
            trackNumber: response.data.data.trackNumber,
            loading: false
          });
        } else {
          setState({
            hasCJOrder: false,
            loading: false
          });
        }
      } catch (error) {
        console.error('Erreur chargement statut CJ:', error);
        setState({
          hasCJOrder: false,
          loading: false,
          error: 'Erreur chargement statut CJ'
        });
      }
    };

    fetchStatus();
  }, [orderId]);

  return state;
}

