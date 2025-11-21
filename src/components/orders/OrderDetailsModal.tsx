'use client'

import { useEffect, useState } from 'react'
import { X, Package, User, Calendar, DollarSign, Truck, MapPin, Phone, Mail } from 'lucide-react'
import { apiClient } from '@/lib/api'
// Formatage de date natif (pas besoin de date-fns)
import { CJOrderDetailsModal } from './CJOrderDetailsModal'
import { CJOrderBadge } from './CJOrderBadge'

// Fonction utilitaire pour nettoyer les URLs d'images
const getCleanImageUrl = (image: string | string[] | null | undefined): string | null => {
  if (!image) return null;
  
  if (typeof image === 'string') {
    // Si c'est une string, vérifier si c'est un JSON
    try {
      const parsed = JSON.parse(image);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const url = parsed[0];
        // Vérifier que c'est une URL valide
        return url && (url.startsWith('http://') || url.startsWith('https://')) ? url : null;
      }
      // Si ce n'est pas un tableau, vérifier que c'est une URL valide
      return image.startsWith('http://') || image.startsWith('https://') ? image : null;
    } catch {
      // Si le parsing échoue, vérifier que c'est une URL valide
      return image.startsWith('http://') || image.startsWith('https://') ? image : null;
    }
  } else if (Array.isArray(image) && image.length > 0) {
    const url = image[0];
    return url && (url.startsWith('http://') || url.startsWith('https://')) ? url : null;
  }
  
  return null;
};

interface OrderDetails {
  id: string
  userId: string
  total: number
  status: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name?: string
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
  }
  items?: Array<{
    id: string
    product: {
      id: string
      name: string
      price: number
      image?: string
      supplier?: { name: string }
    }
    quantity: number
    price: number
  }>
  shippingAddress?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    phone?: string
  }
}

interface Props {
  orderId: string
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailsModal({ orderId, isOpen, onClose }: Props) {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCJDetails, setShowCJDetails] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrderDetails()
    }
  }, [isOpen, orderId])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getOrder(orderId)
      
      // Vérifier si la réponse contient une erreur
      if (response?.error) {
        setError(response.error)
        return
      }
      
      // Vérifier si les données sont présentes
      if (response?.data) {
        setOrder(response.data)
      } else {
        setError('Commande introuvable')
      }
    } catch (err: any) {
      console.error('Erreur chargement détails commande:', err)
      // Gérer les erreurs HTTP (404, 500, etc.)
      if (err.response?.status === 404) {
        setError('Commande introuvable')
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError(err.message || 'Erreur lors du chargement des détails de la commande')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-green-100 text-green-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              Détails de la Commande #{orderId.substring(0, 12)}...
            </h2>
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
                <span className="ml-3 text-gray-600">Chargement...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            ) : order ? (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Statut</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Montant Total</label>
                    <div className="mt-1 text-lg font-semibold text-green-600">
                      {order.total.toFixed(2)}$
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date de Création</label>
                    <div className="mt-1 flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(order.createdAt).toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dernière Mise à Jour</label>
                    <div className="mt-1 flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(order.updatedAt).toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                {order.user && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Informations Client
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nom</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {order.user.name || `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <div className="mt-1 flex items-center text-sm text-gray-900">
                          <Mail className="w-4 h-4 mr-2" />
                          {order.user.email || 'N/A'}
                        </div>
                      </div>
                      {order.user.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Téléphone</label>
                          <div className="mt-1 flex items-center text-sm text-gray-900">
                            <Phone className="w-4 h-4 mr-2" />
                            {order.user.phone}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      Adresse de Livraison
                    </h3>
                    <div className="text-sm text-gray-900">
                      {order.shippingAddress.street && <div>{order.shippingAddress.street}</div>}
                      <div>
                        {order.shippingAddress.postalCode} {order.shippingAddress.city}
                      </div>
                      {order.shippingAddress.state && <div>{order.shippingAddress.state}</div>}
                      {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                      {order.shippingAddress.phone && (
                        <div className="mt-2 flex items-center">
                          <Phone className="w-4 h-4 mr-2" />
                          {order.shippingAddress.phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Products */}
                {order.items && order.items.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Produits Commandés ({order.items.length})
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={item.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3 flex-1">
                            {(() => {
                              const imageUrl = getCleanImageUrl(item.product.image);
                              return imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.product.name}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null;
                            })()}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.product.name}</div>
                              {item.product.supplier && (
                                <div className="text-sm text-gray-500">{item.product.supplier.name}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">x{item.quantity}</div>
                            <div className="font-semibold text-gray-900">{(item.price * item.quantity).toFixed(2)}$</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CJ Dropshipping Section */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    CJ Dropshipping
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <CJOrderBadge orderId={orderId} />
                    </div>
                    <button
                      onClick={() => setShowCJDetails(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Voir détails CJ
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* CJ Details Modal */}
      {showCJDetails && (
        <CJOrderDetailsModal
          orderId={orderId}
          isOpen={showCJDetails}
          onClose={() => setShowCJDetails(false)}
          onSync={() => {
            loadOrderDetails()
            setShowCJDetails(false)
          }}
        />
      )}
    </>
  )
}

