'use client'

import { LoginModal } from '@/components/auth/LoginModal'
import { DuplicateStatsCard } from '@/components/dashboard/DuplicateStatsCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    DollarSign,
    Globe,
    Package,
    RefreshCw,
    ShoppingCart,
    TrendingUp,
    Truck,
    Users
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  totalProducts: number
  promoProducts: number
  totalOrders: number
  connectedSuppliers: number
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  monthlyRevenue: number
  changes?: {
    products: number
    promoProducts: number
    orders: number
    suppliers: number
    revenue: number
  }
}

interface TopCategory {
  name: string
  productCount: number
}

interface RecentActivity {
  recentOrders: any[]
  recentProducts: any[]
}

interface SalesChartData {
  month: string
  revenue: number
}

interface CJStats {
  total: number
  byStatus: Record<string, number>
  totalAmount: number
  successRate: number
  last30Days: {
    created: number
    paid: number
    shipped: number
    delivered: number
  }
}

type TimeFilter = 'day' | 'week' | 'month' | 'year'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null)
  const [pendingProducts, setPendingProducts] = useState<any[]>([])
  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([])
  const [cjStats, setCjStats] = useState<CJStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month')
  const [showLogin, setShowLogin] = useState(false)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated, timeFilter])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Charger les statistiques
      const statsResponse = await apiClient.getDashboardStats()
      if (statsResponse.data) {
        setStats(statsResponse.data)
      }

      // Charger les top catégories
      const categoriesResponse = await apiClient.getTopCategories()
      if (categoriesResponse.data) {
        setTopCategories(categoriesResponse.data)
      }

      // Charger l'activité récente
      const activityResponse = await apiClient.getDashboardActivity()
      if (activityResponse.data) {
        setRecentActivity(activityResponse.data)
      }

      // Charger les produits en attente de validation
      const pendingResponse = await apiClient.getProductsReadyForValidation()
      if (pendingResponse.data) {
        setPendingProducts(pendingResponse.data)
      }

      // Charger les données du graphique des ventes
      const salesResponse = await apiClient.getSalesChart()
      if (salesResponse.data) {
        setSalesChartData(salesResponse.data)
      }

      // Charger les statistiques CJ Dropshipping
      try {
        const cjStatsResponse = await apiClient.getCJStats()
        if (cjStatsResponse.data) {
          setCjStats(cjStatsResponse.data)
        }
      } catch (error) {
        console.warn('Erreur chargement stats CJ:', error)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDashboardData()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const formatChange = (change: number | undefined, isAbsolute = false) => {
    if (change === undefined || change === null) return { text: 'N/A', type: 'neutral' }
    
    if (isAbsolute) {
      const sign = change >= 0 ? '+' : ''
      return {
        text: `${sign}${change}`,
        type: change >= 0 ? 'positive' : 'negative'
      }
    }
    
    const sign = change >= 0 ? '+' : ''
    const absChange = Math.abs(change)
    return {
      text: `${sign}${absChange.toFixed(1)}%`,
      type: change >= 0 ? 'positive' : 'negative'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
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
                Veuillez vous connecter pour accéder au dashboard
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
          <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    )
  }

  // Données formatées pour l'affichage avec changements dynamiques
  const displayStats = [
    {
      title: 'Produits Totaux',
      value: stats?.totalProducts?.toString() || '0',
      change: formatChange(stats?.changes?.products),
      icon: Package,
      link: '/admin/products',
    },
    {
      title: 'Produits en Promotion',
      value: stats?.promoProducts?.toString() || '0',
      change: formatChange(stats?.changes?.promoProducts),
      icon: TrendingUp,
      link: '/admin/products',
    },
    {
      title: 'Commandes',
      value: stats?.totalOrders?.toString() || '0',
      change: formatChange(stats?.changes?.orders),
      icon: ShoppingCart,
      link: '/admin/orders',
    },
    {
      title: 'Fournisseurs Connectés',
      value: stats?.connectedSuppliers?.toString() || '0',
      change: formatChange(stats?.changes?.suppliers, true),
      icon: Truck,
      link: '/admin/suppliers',
    },
    {
      title: 'Revenus Totaux',
      value: formatCurrency(stats?.totalRevenue || 0),
      change: formatChange(stats?.changes?.revenue),
      icon: DollarSign,
      link: '/admin/orders',
    },
    {
      title: 'Revenus du Mois',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      change: formatChange(stats?.changes?.revenue),
      icon: TrendingUp,
      link: '/admin/orders',
    },
    {
      title: 'Utilisateurs Totaux',
      value: stats?.totalUsers?.toString() || '0',
      change: { text: 'N/A', type: 'neutral' as const },
      icon: Users,
      link: '/admin/users',
    },
    {
      title: 'Utilisateurs Actifs',
      value: stats?.activeUsers?.toString() || '0',
      change: { text: 'N/A', type: 'neutral' as const },
      icon: Users,
      link: '/admin/users',
    },
  ]

  // Formatage de l'activité récente (plus d'éléments)
  const displayActivity = [
    ...(recentActivity?.recentProducts?.slice(0, 5).map((product, index) => ({
      id: `product-${index}`,
      action: 'Nouveau produit ajouté',
      description: `${product.name} - ${product.supplier?.name || 'Import'}`,
      time: new Date(product.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'product',
      link: `/admin/products/${product.id}/edit`
    })) || []),
    ...(recentActivity?.recentOrders?.slice(0, 5).map((order, index) => ({
      id: `order-${index}`,
      action: 'Commande reçue',
      description: `Commande #${order.id} - ${order.items?.length || 0} produit(s) - ${formatCurrency(order.total || 0)}`,
      time: new Date(order.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
      type: 'order',
      link: `/admin/orders`
    })) || [])
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header avec bouton refresh */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Vue d'ensemble de votre plateforme KAMRI</p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">Connecté en tant que {user.name}</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </Button>
      </div>

      {/* Filtres temporels */}
      <div className="flex gap-2">
        <Button
          variant={timeFilter === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFilter('day')}
        >
          Aujourd'hui
        </Button>
        <Button
          variant={timeFilter === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFilter('week')}
        >
          Cette semaine
        </Button>
        <Button
          variant={timeFilter === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFilter('month')}
        >
          Ce mois
        </Button>
        <Button
          variant={timeFilter === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFilter('year')}
        >
          Cette année
        </Button>
      </div>

      {/* Stats Cards - Grille 4 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat) => {
          const ChangeIcon = stat.change.type === 'positive' ? ArrowUpRight : 
                           stat.change.type === 'negative' ? ArrowDownRight : null
          const changeColor = stat.change.type === 'positive' ? 'text-green-600' :
                            stat.change.type === 'negative' ? 'text-red-600' :
                            'text-gray-600'
          
          return (
            <Link key={stat.title} href={stat.link}>
              <Card className="kamri-card hover:shadow-xl transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-primary-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  {stat.change.text !== 'N/A' && (
                    <div className={`flex items-center text-xs mt-1 ${changeColor}`}>
                      {ChangeIcon && <ChangeIcon className="h-3 w-3 mr-1" />}
                      {stat.change.text} par rapport au mois dernier
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Statistiques CJ Dropshipping */}
      {cjStats && (
        <Card className="kamri-card border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Globe className="h-5 w-5 mr-2" />
              Statistiques CJ Dropshipping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-blue-700">Total Commandes</p>
                <p className="text-2xl font-bold text-blue-900">{cjStats.total || 0}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Taux de Succès</p>
                <p className="text-2xl font-bold text-blue-900">
                  {cjStats.successRate !== undefined && cjStats.successRate !== null 
                    ? `${cjStats.successRate.toFixed(1)}%` 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Montant Total</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(cjStats.totalAmount || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">30 Derniers Jours</p>
                <p className="text-lg font-semibold text-blue-900">
                  {((cjStats.last30Days?.paid || 0) + (cjStats.last30Days?.shipped || 0) + (cjStats.last30Days?.delivered || 0))} commandes
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/admin/orders/cj-stats">
                <Button variant="outline" className="bg-blue-600 text-white hover:bg-blue-700">
                  Voir les détails
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Produits en attente */}
      {pendingProducts.length > 0 && (
        <Card className="kamri-card border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              Produits en attente de validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-4">
              {pendingProducts.length} produit(s) attendent votre validation
            </p>
            <Button asChild className="bg-yellow-600 hover:bg-yellow-700">
              <Link href="/admin/products/validation">
                Valider les produits
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart avec Recharts */}
        <Card className="kamri-card">
          <CardHeader>
            <CardTitle>Ventes Mensuelles (12 derniers mois)</CardTitle>
          </CardHeader>
          <CardContent>
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `€${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune donnée disponible</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Catégories */}
        <Card className="kamri-card">
          <CardHeader>
            <CardTitle>Top Catégories</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length > 0 ? (
              <div className="space-y-3">
                {topCategories.slice(0, 7).map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{category.name}</p>
                        <p className="text-sm text-gray-500">{category.productCount} produit(s)</p>
                      </div>
                    </div>
                    <Link href={`/admin/products?category=${encodeURIComponent(category.name)}`}>
                      <Button variant="ghost" size="sm">
                        Voir
                      </Button>
                    </Link>
                  </div>
                ))}
                <Link href="/admin/categories">
                  <Button variant="outline" className="w-full mt-4">
                    Voir toutes les catégories
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune catégorie disponible</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity améliorée */}
      <Card className="kamri-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activité Récente</CardTitle>
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm">
              Voir tout l'historique
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayActivity.length > 0 ? (
              displayActivity.map((activity) => (
                <Link key={activity.id} href={activity.link || '#'}>
                  <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.type === 'product' ? 'bg-primary-500' :
                      activity.type === 'order' ? 'bg-green-500' :
                      activity.type === 'supplier' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucune activité récente
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques Anti-Doublons */}
      <DuplicateStatsCard />

      {/* Quick Actions fonctionnelles */}
      <Card className="kamri-card">
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/suppliers">
              <Button className="kamri-button h-auto p-4 flex flex-col items-center space-y-2 w-full">
                <Package className="h-6 w-6" />
                <span>Importer Produits</span>
              </Button>
            </Link>
            <Link href="/admin/suppliers">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 w-full">
                <Truck className="h-6 w-6" />
                <span>Ajouter Fournisseur</span>
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2 w-full">
                <Users className="h-6 w-6" />
                <span>Gérer Utilisateurs</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
