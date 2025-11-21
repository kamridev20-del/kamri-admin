'use client'

import { useState } from 'react'
import { useCJOrderStatus } from '@/hooks/useCJOrderStatus';
import { Package, Truck, CheckCircle, Clock, AlertCircle, Info } from 'lucide-react';
import { CJOrderDetailsModal } from './CJOrderDetailsModal';

interface Props {
  orderId: string;
  onCreateCJ?: () => void;
}

export function CJOrderBadge({ orderId, onCreateCJ }: Props) {
  const { hasCJOrder, status, cjOrderId, cjOrderNumber, trackNumber, loading } = useCJOrderStatus(orderId);
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-xs text-gray-500">Vérification CJ...</span>
      </div>
    );
  }

  if (!hasCJOrder) {
    return (
      <button
        onClick={onCreateCJ}
        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Package className="w-3 h-3 mr-1" />
        Créer CJ
      </button>
    );
  }

  // Mapping des statuts vers des couleurs et icônes
  const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    CREATED: { color: 'bg-yellow-50 text-yellow-700', icon: Clock, label: 'CJ Créée' },
    PAID: { color: 'bg-blue-50 text-blue-700', icon: Package, label: 'CJ Payée' },
    SHIPPED: { color: 'bg-purple-50 text-purple-700', icon: Truck, label: 'CJ Expédiée' },
    DELIVERED: { color: 'bg-green-50 text-green-700', icon: CheckCircle, label: 'CJ Livrée' },
    ERROR: { color: 'bg-red-50 text-red-700', icon: AlertCircle, label: 'CJ Erreur' },
    CANCELLED: { color: 'bg-gray-50 text-gray-700', icon: AlertCircle, label: 'CJ Annulée' },
  };

  const config = statusConfig[status || 'CREATED'] || statusConfig.CREATED;
  const Icon = config.icon;

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </div>
          {hasCJOrder && (
            <button
              onClick={() => setShowDetails(true)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="Voir les détails"
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {trackNumber && (
          <div className="text-xs text-gray-600 font-mono">
            📦 {trackNumber}
          </div>
        )}
        
        {cjOrderId && (
          <div className="text-xs text-gray-500">
            ID: {cjOrderId.substring(0, 12)}...
          </div>
        )}
      </div>

      {hasCJOrder && (
        <CJOrderDetailsModal
          orderId={orderId}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          onSync={() => {
            // Recharger le statut après synchronisation
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

