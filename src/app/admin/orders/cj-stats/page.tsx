'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { LoginModal } from '@/components/auth/LoginModal'
import { BarChart3, Package, DollarSign, TrendingUp, Calendar } from 'lucide-react'

interface CJStats {
  total: number
  byStatus: Record<string, number>
  totalAmount: number
  totalProductAmount: number
  totalPostageAmount: number
  successRate: number
  last30Days: {
    created: number
    paid: number
    shipped: number
    delivered: number
  }
}

export default function CJStatsPage() {
  const [stats, setStats] = useState<CJStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      loadStats()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getCJStats?.()
      if (response?.data?.success && response.data.data) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
    } finally {
      setIsLoading(false)
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
                Veuillez vous connecter pour accéder aux statistiques
              </p>
              <button
                onClick={() => setShowLogin(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Se connecter
              </button>
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
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <Card className="kamri-card">
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Aucune statistique disponible</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CREATED: 'Créées',
      PAID: 'Payées',
      SHIPPED: 'Expédiées',
      DELIVERED: 'Livrées',
      ERROR: 'Erreurs',
      CANCELLED: 'Annulées',
    }
    return labels[status] || status
  }

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Statistiques Commandes CJ</h1>
        <p className="text-gray-600 mt-2">Vue d'ensemble des commandes CJ Dropshipping</p>
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Commandes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Montant Total</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${stats.totalAmount.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Taux de Succès</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">30 Derniers Jours</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.last30Days.created + stats.last30Days.paid + stats.last30Days.shipped + stats.last30Days.delivered}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par statut */}
      <Card className="kamri-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Répartition par Statut
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-500">{getStatusLabel(status)}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-md ${getStatusColor(status)}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Montants détaillés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="kamri-card">
          <CardHeader>
            <CardTitle>Montants Détail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Montant Produits</span>
                <span className="text-lg font-bold text-gray-900">
                  ${stats.totalProductAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Frais de Livraison</span>
                <span className="text-lg font-bold text-gray-900">
                  ${stats.totalPostageAmount.toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${stats.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kamri-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Activité 30 Derniers Jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Créées</span>
                <span className="text-lg font-bold text-yellow-600">
                  {stats.last30Days.created}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payées</span>
                <span className="text-lg font-bold text-blue-600">
                  {stats.last30Days.paid}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expédiées</span>
                <span className="text-lg font-bold text-purple-600">
                  {stats.last30Days.shipped}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Livrées</span>
                <span className="text-lg font-bold text-green-600">
                  {stats.last30Days.delivered}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

