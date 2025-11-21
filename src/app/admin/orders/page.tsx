'use client'

import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import {
  CheckCircle,
  Clock,
  Eye,
  Package,
  Search,
  ShoppingCart,
  Truck,
  XCircle
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { CJOrderBadge } from '@/components/orders/CJOrderBadge'
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal'

interface Order {
  id: string
  userId: string
  total: number
  status: string
  createdAt: string
  user?: {
    name: string
    email: string
  }
  items?: Array<{
    product: {
      name: string
      supplier?: { name: string }
    }
    quantity: number
    price: number
  }>
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [creatingCJ, setCreatingCJ] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated])

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getOrders()
      if (response.data) {
        // L'API retourne { data: [...], message: "..." }, on doit extraire data
        const ordersData = response.data.data || response.data;
        // S'assurer que ordersData est un tableau
        const ordersArray = Array.isArray(ordersData) ? ordersData : [];
        setOrders(ordersArray);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCJ = async (orderId: string) => {
    if (!confirm('Créer une commande CJ pour cette commande ?')) return;

    setCreatingCJ(orderId);

    try {
      const response = await apiClient.createCJOrder?.(orderId);

      if (response?.data?.success) {
        alert('✅ Commande CJ créée avec succès !');
        // Recharger la liste
        await loadOrders();
      } else {
        alert(`❌ Erreur : ${response?.data?.message || response?.error || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('Erreur création CJ:', error);
      alert(`❌ Erreur lors de la création de la commande CJ: ${error?.message || 'Erreur inconnue'}`);
    } finally {
      setCreatingCJ(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Connexion Requise</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-4">
                Veuillez vous connecter pour accéder aux commandes
              </p>
              <Button onClick={() => setShowLogin(true)}>
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des commandes...</p>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'shipped':
        return <Truck className="w-4 h-4 text-blue-500" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing':
        return 'En traitement'
      case 'shipped':
        return 'Expédié'
      case 'delivered':
        return 'Livré'
      case 'cancelled':
        return 'Annulé'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredOrders = orders && Array.isArray(orders) ? orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'Tous' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
          <p className="text-gray-600 mt-2">Gérez les commandes de vos clients</p>
        </div>
        <Button
          onClick={() => window.location.href = '/admin/orders/create'}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Créer une commande
        </Button>
      </div>

      {/* Filters */}
      <Card className="kamri-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher une commande..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="processing">En traitement</option>
              <option value="shipped">Expédié</option>
              <option value="delivered">Livré</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="kamri-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Commande #{order.id}</h3>
                    <p className="text-sm text-gray-500">
                      {order.user?.name || 'Client'} • {order.user?.email || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(order.status)}
                      <span>{getStatusText(order.status)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">{order.total}$</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* CJ Status Badge */}
              <div className="mb-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Statut CJ Dropshipping:</span>
                  {creatingCJ === order.id ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-xs text-gray-500">Création...</span>
                    </div>
                  ) : (
                    <CJOrderBadge
                      orderId={order.id}
                      onCreateCJ={() => handleCreateCJ(order.id)}
                    />
                  )}
                </div>
              </div>

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Produits commandés</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{item.product.name}</span>
                          {item.product.supplier && (
                            <span className="text-gray-500">({item.product.supplier.name})</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-500">x{item.quantity}</span>
                          <span className="font-medium">{item.price}$</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Voir détails
                </Button>
                <Button variant="outline" size="sm">
                  Modifier statut
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <Card className="kamri-card">
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune commande trouvée</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'Tous' 
                ? 'Essayez de modifier vos critères de recherche'
                : 'Les commandes apparaîtront ici une fois que vos clients passeront commande'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}