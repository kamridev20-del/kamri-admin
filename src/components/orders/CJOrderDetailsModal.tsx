'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw, Package, Truck, DollarSign, Calendar } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface Props {
  orderId: string
  isOpen: boolean
  onClose: () => void
  onSync?: () => void
}

interface CJDetails {
  mapping: {
    id: string
    cjOrderId: string
    cjOrderNumber: string
    status: string
    trackNumber?: string
    createdAt: string
    updatedAt: string
  }
  metadata: {
    productAmount?: number
    postageAmount?: number
    productOriginalAmount?: number
    postageOriginalAmount?: number
    totalDiscountAmount?: number
    orderAmount?: number
  }
  cjOrderDetails?: any
}

export function CJOrderDetailsModal({ orderId, isOpen, onClose, onSync }: Props) {
  const [details, setDetails] = useState<CJDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      loadDetails()
    }
  }, [isOpen, orderId])

  const loadDetails = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getCJDetails?.(orderId)
      if (response?.data?.success && response.data.data) {
        setDetails(response.data.data)
      }
    } catch (error) {
      console.error('Erreur chargement détails CJ:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!confirm('Synchroniser le statut de cette commande CJ ?')) return

    try {
      setSyncing(true)
      const response = await apiClient.syncCJStatus?.(orderId)
      if (response?.data?.success) {
        alert('✅ Statut synchronisé avec succès !')
        await loadDetails()
        onSync?.()
      } else {
        alert(`❌ Erreur : ${response?.data?.message || 'Erreur inconnue'}`)
      }
    } catch (error: any) {
      console.error('Erreur synchronisation:', error)
      alert(`❌ Erreur lors de la synchronisation: ${error?.message || 'Erreur inconnue'}`)
    } finally {
      setSyncing(false)
    }
  }

  if (!isOpen) return null

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CREATED: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      ERROR: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Détails Commande CJ</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Informations Générales */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Informations Générales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">ID Commande CJ</label>
                    <p className="text-sm font-mono text-gray-900">{details.mapping.cjOrderId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Numéro Commande</label>
                    <p className="text-sm font-mono text-gray-900">{details.mapping.cjOrderNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Statut</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${getStatusColor(details.mapping.status)}`}>
                        {details.mapping.status}
                      </span>
                    </div>
                  </div>
                  {details.mapping.trackNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Numéro de Suivi</label>
                      <p className="text-sm font-mono text-gray-900">{details.mapping.trackNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Montants */}
              {details.metadata && Object.keys(details.metadata).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Montants
                  </h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    {details.metadata.productAmount !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Montant Produits</label>
                        <p className="text-lg font-bold text-gray-900">
                          ${details.metadata.productAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {details.metadata.postageAmount !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Frais de Livraison</label>
                        <p className="text-lg font-bold text-gray-900">
                          ${details.metadata.postageAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {details.metadata.orderAmount !== undefined && (
                      <div className="col-span-2 border-t pt-4">
                        <label className="text-sm font-medium text-gray-500">Total</label>
                        <p className="text-2xl font-bold text-blue-600">
                          ${details.metadata.orderAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {details.metadata.totalDiscountAmount !== undefined && details.metadata.totalDiscountAmount > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Réduction</label>
                        <p className="text-lg font-bold text-green-600">
                          -${details.metadata.totalDiscountAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Dates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Créée le</label>
                    <p className="text-sm text-gray-900">
                      {new Date(details.mapping.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mise à jour le</label>
                    <p className="text-sm text-gray-900">
                      {new Date(details.mapping.updatedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Synchronisation...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Synchroniser le Statut
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun détail disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

