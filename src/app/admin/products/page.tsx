"use client"

import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ProductDetailsModal } from '@/components/products/ProductDetailsModal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import {
    Download,
    Edit,
    ExternalLink,
    Eye,
    EyeOff,
    Filter,
    Globe,
    MoreHorizontal,
    Package,
    Search,
    Trash2
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  supplier?: { name: string }
  category?: { name: string }
  status: string
  badge?: string
  image?: string
  stock: number
  sales: number
}

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface CJProduct {
  pid: string
  productName: string
  productNameEn: string
  productSku: string
  productImage: string
  sellPrice: number
  originalPrice: number
  categoryName: string
  variants: CJVariant[]
  stock: number
  deliveryTime: string
  freeShipping: boolean
}

interface CJVariant {
  variantId: string
  variantSku: string
  sellPrice: number
  originalPrice: number
  stock: number
  variantName: string
}

// Fonction utilitaire pour nettoyer les URLs d'images
const getCleanImageUrl = (image: string | string[] | undefined): string | null => {
  if (!image) return null;

  if (typeof image === 'string') {
    // Si c'est une string, vérifier si c'est un JSON
    try {
      const parsed = JSON.parse(image);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
      return image;
    } catch {
      return image;
    }
  } else if (Array.isArray(image) && image.length > 0) {
    return image[0];
  }

  return null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Toutes')
  const [selectedSupplier, setSelectedSupplier] = useState('Tous')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()
  const toast = useToast()

  // ✅ États pour la recherche CJ Dropshipping
  const [activeTab, setActiveTab] = useState<'local' | 'cj'>('local')
  const [cjProducts, setCJProducts] = useState<CJProduct[]>([])
  const [cjCategories, setCJCategories] = useState<any[]>([])
  const [cjSearchQuery, setCJSearchQuery] = useState('')
  const [cjSelectedCategory, setCJSelectedCategory] = useState('Toutes')
  const [cjMinPrice, setCJMinPrice] = useState<number>(0)
  const [cjMaxPrice, setCJMaxPrice] = useState<number>(1000)
  const [cjCountryCode, setCJCountryCode] = useState<string | undefined>(undefined) // ✅ Tous les pays par défaut
  const [isCJLoading, setIsCJLoading] = useState(false)
  const [cjPageNum, setCJPageNum] = useState(1)
  const [cjTotal, setCJTotal] = useState(0)

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Charger les produits
      const productsResponse = await apiClient.getProducts()
      if (productsResponse.data) {
        const productsData = productsResponse.data.data || productsResponse.data
        const productsList = Array.isArray(productsData) ? productsData : []
        console.log('🛍️ [ADMIN-PRODUCTS] Produits chargés:', productsList.length)
        setProducts(productsList)
      }

      // Charger les catégories
      const categoriesResponse = await apiClient.getCategories()
      if (categoriesResponse.data) {
        const categoriesData = categoriesResponse.data.data || categoriesResponse.data
        const categoriesList = Array.isArray(categoriesData) ? categoriesData : []
        console.log('📂 [ADMIN-PRODUCTS] Catégories chargées:', categoriesList.length)
        console.log('📂 [ADMIN-PRODUCTS] Catégories:', categoriesList.map(c => ({ id: c.id, name: c.name })))
        setCategories(categoriesList)
      }

      // Charger les fournisseurs
      const suppliersResponse = await apiClient.getSuppliers()
      if (suppliersResponse.data) {
        const suppliersData = suppliersResponse.data.data || suppliersResponse.data
        const suppliersList = Array.isArray(suppliersData) ? suppliersData : []
        console.log('🚚 [ADMIN-PRODUCTS] Fournisseurs chargés:', suppliersList.length)
        console.log('🚚 [ADMIN-PRODUCTS] Fournisseurs:', suppliersList.map(s => ({ id: s.id, name: s.name })))
        setSuppliers(suppliersList)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Fonctions pour la recherche CJ Dropshipping
  const loadCJCategories = async () => {
    try {
      const response = await apiClient.getCJCategories()
      if (response.data) {
        setCJCategories(response.data.data || [])
      }
    } catch (error) {
      console.error('Erreur chargement catégories CJ:', error)
    }
  }

  const searchCJProducts = async () => {
    try {
      setIsCJLoading(true)
      const response = await apiClient.searchCJProducts({
        productName: cjSearchQuery,
        categoryId: cjSelectedCategory !== 'Toutes' ? cjSelectedCategory : undefined,
        minPrice: cjMinPrice,
        maxPrice: cjMaxPrice,
        pageNum: cjPageNum,
        pageSize: 50,
        countryCode: cjCountryCode,
        sort: 'DESC',
        orderBy: 'listedNum'
      })

      if (response.data) {
        setCJProducts(response.data.data?.list || [])
        setCJTotal(response.data.data?.total || 0)
      }
    } catch (error) {
      console.error('Erreur recherche CJ:', error)
    } finally {
      setIsCJLoading(false)
    }
  }

  const importCJProduct = async (cjProduct: CJProduct, variant: CJVariant) => {
    try {
      const response = await apiClient.importCJProduct({
        pid: cjProduct.pid,
        variantSku: variant.variantSku,
        categoryId: categories[0]?.id, // Utiliser la première catégorie disponible
        supplierId: suppliers.find(s => s.name === 'CJ Dropshipping')?.id || suppliers[0]?.id
      })

      if (response.data?.success) {
        toast.showToast({ type: 'success', title: 'Import', description: 'Produit importé avec succès !' })
        // Recharger les produits locaux
        loadData()
      } else {
        toast.showToast({ type: 'error', title: 'Import', description: response.data?.error || 'Erreur inconnue' })
      }
    } catch (error) {
      console.error('Erreur import produit CJ:', error)
      toast.showToast({ type: 'error', title: 'Import', description: 'Erreur lors de l\'import du produit' })
    }
  }

  // Charger les catégories CJ quand on passe à l'onglet CJ
  useEffect(() => {
    if (activeTab === 'cj' && cjCategories.length === 0) {
      loadCJCategories()
    }
  }, [activeTab])

  // ✅ Debounce pour la recherche CJ en temps réel
  const debouncedSearchCJ = useCallback(() => {
    const timeoutId = setTimeout(() => {
      if (cjSearchQuery.length > 2) {
        searchCJProducts()
      }
    }, 500) // 500ms de délai

    return () => clearTimeout(timeoutId)
  }, [cjSearchQuery])

  // Déclencher la recherche automatique quand la requête change
  useEffect(() => {
    if (activeTab === 'cj' && cjSearchQuery.length > 2) {
      const cleanup = debouncedSearchCJ()
      return cleanup
    }
  }, [cjSearchQuery, activeTab, debouncedSearchCJ])

  const getBadgeStyle = (badge: string | null) => {
    switch (badge) {
      case 'promo':
        return 'badge-promo'
      case 'top-ventes':
        return 'badge-top-ventes'
      case 'tendances':
        return 'badge-tendances'
      case 'nouveau':
        return 'badge-nouveau'
      default:
        return 'hidden'
    }
  }

  const getBadgeText = (badge: string | null) => {
    switch (badge) {
      case 'promo':
        return 'PROMO'
      case 'top-ventes':
        return 'TOP VENTES'
      case 'tendances':
        return 'TENDANCES'
      case 'nouveau':
        return 'NOUVEAU'
      default:
        return ''
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
                Veuillez vous connecter pour accéder aux produits
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
          <p className="mt-4 text-gray-600">Chargement des produits...</p>
        </div>
      </div>
    )
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'Toutes' || product.category?.name === selectedCategory
    const matchesSupplier = selectedSupplier === 'Tous' || product.supplier?.name === selectedSupplier

    // Logs de debug pour le filtrage par catégorie
    if (selectedCategory !== 'Toutes') {
      console.log('🔍 [ADMIN-PRODUCTS] Filtrage par catégorie:', selectedCategory)
      console.log('🔍 [ADMIN-PRODUCTS] Produit:', product.name, 'Catégorie:', product.category?.name, 'Match:', matchesCategory)
    }

    return matchesSearch && matchesCategory && matchesSupplier
  })

  const categoryOptions = ['Toutes', ...(categories || []).map(cat => cat.name)]
  const supplierOptions = ['Tous', ...(suppliers || []).map(sup => sup.name)]

  // Logs de debug pour les catégories
  console.log('📂 [ADMIN-PRODUCTS] Catégories disponibles:', categories?.length || 0)
  console.log('📂 [ADMIN-PRODUCTS] Options de catégories:', categoryOptions)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produits</h1>
          <p className="text-gray-600 mt-2">
            {activeTab === 'local' ? 'Gérez vos produits importés' : 'Recherchez et importez depuis CJ Dropshipping'}
          </p>
        </div>
      </div>

      {/* ✅ Onglets */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'local'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Mes Produits ({products.length})
        </button>
      </div>

      {/* Filters */}
      <Card className="kamri-card">
        <CardContent className="p-6">
          {activeTab === 'local' ? (
            // ✅ Filtres pour les produits locaux
            <div className="flex flex-col lg:flex-row gap-6 items-end">
              {/* Search */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher un produit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex flex-col w-full lg:w-auto lg:min-w-[180px]">
                <label className="text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    console.log('📂 [ADMIN-PRODUCTS] Catégorie sélectionnée:', e.target.value)
                    setSelectedCategory(e.target.value)
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 h-10"
                >
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>
                      {category} {category !== 'Toutes' && `(${products.filter(p => p.category?.name === category).length})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div className="flex flex-col w-full lg:w-auto lg:min-w-[180px]">
                <label className="text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 h-10"
                >
                  {supplierOptions.map(supplier => (
                    <option key={supplier} value={supplier}>
                      {supplier} {supplier !== 'Tous' && `(${products.filter(p => p.supplier?.name === supplier).length})`}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtres
              </Button>
            </div>
          ) : (
            // ✅ Filtres pour la recherche CJ Dropshipping
            <div className="flex flex-col lg:flex-row gap-6 items-end">
              {/* Search CJ */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Recherche CJ</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher dans le catalogue CJ... (recherche en temps réel)"
                    value={cjSearchQuery}
                    onChange={(e) => setCJSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {cjSearchQuery.length > 0 && cjSearchQuery.length <= 2 && (
                    <p className="text-xs text-gray-500 mt-1">Tapez au moins 3 caractères pour rechercher</p>
                  )}
                </div>
              </div>

              {/* CJ Category Filter */}
              <div className="flex flex-col w-full lg:w-auto lg:min-w-[180px]">
                <label className="text-sm font-medium text-gray-700 mb-2">Catégorie CJ</label>
                <select
                  value={cjSelectedCategory}
                  onChange={(e) => setCJSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 h-10"
                >
                  <option value="Toutes">Toutes les catégories</option>
                  {cjCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="flex flex-col w-full lg:w-auto lg:min-w-[120px]">
                <label className="text-sm font-medium text-gray-700 mb-2">Prix min</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cjMinPrice}
                  onChange={(e) => setCJMinPrice(Number(e.target.value))}
                  className="h-10"
                />
              </div>

              <div className="flex flex-col w-full lg:w-auto lg:min-w-[120px]">
                <label className="text-sm font-medium text-gray-700 mb-2">Prix max</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={cjMaxPrice}
                  onChange={(e) => setCJMaxPrice(Number(e.target.value))}
                  className="h-10"
                />
              </div>

              {/* Country */}
              <div className="flex flex-col w-full lg:w-auto lg:min-w-[120px]">
                <label className="text-sm font-medium text-gray-700 mb-2">Pays</label>
                <select
                  value={cjCountryCode}
                  onChange={(e) => setCJCountryCode(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 h-10"
                >
                  <option value="US">🇺🇸 États-Unis</option>
                  <option value="FR">🇫🇷 France</option>
                  <option value="DE">🇩🇪 Allemagne</option>
                  <option value="GB">🇬🇧 Royaume-Uni</option>
                </select>
              </div>

              {/* Search Button */}
              <Button
                onClick={searchCJProducts}
                disabled={isCJLoading}
                className="kamri-button"
              >
                {isCJLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {isCJLoading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          {activeTab === 'local' ? (
            <>
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
              {selectedCategory !== 'Toutes' && ` dans la catégorie "${selectedCategory}"`}
              {selectedSupplier !== 'Tous' && ` du fournisseur "${selectedSupplier}"`}
            </>
          ) : (
            <>
              {cjProducts.length} produit{cjProducts.length > 1 ? 's' : ''} CJ trouvé{cjProducts.length > 1 ? 's' : ''}
              {cjSearchQuery && ` pour "${cjSearchQuery}"`}
            </>
          )}
        </div>
        <div>
          {activeTab === 'local' ? (
            <>Total: {products.length} produit{products.length > 1 ? 's' : ''}</>
          ) : (
            <>Total CJ: {cjTotal} produit{cjTotal > 1 ? 's' : ''}</>
          )}
        </div>
      </div>

      {/* Loading State for CJ */}
      {activeTab === 'cj' && isCJLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Recherche dans le catalogue CJ Dropshipping...</p>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {!isCJLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeTab === 'local' ? (
            // ✅ Affichage des produits locaux
            filteredProducts.map((product) => (
              <Card key={product.id} className="kamri-card group">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="h-48 bg-gray-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    {(() => {
                      const imageUrl = getCleanImageUrl(product.image);
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('❌ Erreur de chargement d\'image:', e.currentTarget.src);
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null;
                    })()}
                    <Package className={`h-12 w-12 text-gray-400 ${getCleanImageUrl(product.image) ? 'hidden' : ''}`} />

                    {/* Badge */}
                    {product.badge && (
                      <div className={`absolute top-3 left-3 ${getBadgeStyle(product.badge)}`}>
                        {getBadgeText(product.badge)}
                      </div>
                    )}

                    {/* Status Toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 bg-white/90 hover:bg-white"
                      onClick={() => toast.showToast({ type: 'info', title: 'Statut produit', description: `Statut ${product.status === 'active' ? 'désactivé' : 'activé'}` })}
                    >
                      {product.status === 'active' ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Fournisseur:</span>
                        <span className="text-sm font-medium">{product.supplier?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Stock:</span>
                        <span className="text-sm font-medium">{product.stock}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Ventes:</span>
                        <span className="text-sm font-medium">{product.sales}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-lg font-bold text-primary-600">{product.price}$</span>
                        {product.originalPrice && (
                          <span className="text-sm text-gray-400 line-through ml-2">{product.originalPrice}$</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedProductId(product.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Voir détails
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/admin/products/${product.id}/edit`}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Modifier
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            cjProducts.map((cjProduct) => (
                <Card key={cjProduct.pid} className="kamri-card group">
                  <CardContent className="p-0">
                    {/* CJ Product Image */}
                    <div className="h-48 bg-gray-100 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      {(() => {
                        const imageUrl = getCleanImageUrl(cjProduct.productImage);
                        return imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={cjProduct.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('❌ Erreur de chargement d\'image CJ:', e.currentTarget.src);
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null;
                      })()}
                      <Package className={`h-12 w-12 text-gray-400 ${getCleanImageUrl(cjProduct.productImage) ? 'hidden' : ''}`} />

                      {/* CJ Badge */}
                      <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                        CJ DROPSHIPPING
                      </div>
                    </div>

                    {/* CJ Product Info */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{cjProduct.productNameEn || cjProduct.productName}</h3>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Catégorie:</span>
                          <span className="text-sm font-medium">{cjProduct.categoryName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Stock:</span>
                          <span className="text-sm font-medium">{cjProduct.stock}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Livraison:</span>
                          <span className="text-sm font-medium">{cjProduct.deliveryTime}</span>
                        </div>
                        {cjProduct.freeShipping && (
                          <div className="flex items-center justify-center">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              🚚 Livraison gratuite
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CJ Price */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-lg font-bold text-primary-600">{cjProduct.sellPrice}$</span>
                          {cjProduct.originalPrice && cjProduct.originalPrice !== cjProduct.sellPrice && (
                            <span className="text-sm text-gray-400 line-through ml-2">{cjProduct.originalPrice}$</span>
                          )}
                        </div>
                      </div>

                      {/* CJ Variants */}
                      {cjProduct.variants && cjProduct.variants.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">{cjProduct.variants.length} variante{cjProduct.variants.length > 1 ? 's' : ''}</p>
                          <div className="max-h-20 overflow-y-auto">
                            {cjProduct.variants.slice(0, 3).map((variant) => (
                              <div key={variant.variantId} className="text-xs text-gray-600 mb-1">
                                {variant.variantName}: {variant.sellPrice}$
                              </div>
                            ))}
                            {cjProduct.variants.length > 3 && (
                              <div className="text-xs text-gray-400">+{cjProduct.variants.length - 3} autres...</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* CJ Actions */}
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            if (cjProduct.variants && cjProduct.variants.length > 0) {
                              // Si plusieurs variantes, importer la première
                              importCJProduct(cjProduct, cjProduct.variants[0])
                            } else {
                              toast.showToast({ type: 'warning', title: 'Import', description: 'Aucune variante disponible pour ce produit' })
                            }
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Importer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.showToast({ type: 'info', title: 'À venir', description: 'Détails du produit - Fonctionnalité à venir' })}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
        </div>
      )}

      {/* Empty State */}
      {activeTab === 'local' && filteredProducts.length === 0 && (
        <Card className="kamri-card">
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun produit trouvé</h3>
            <p className="text-gray-500 mb-4">Essayez de modifier vos critères de recherche</p>
            <Button
              className="kamri-button"
              onClick={() => setActiveTab('cj')}
            >
              <Globe className="w-4 h-4 mr-2" />
              Rechercher sur CJ
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'cj' && cjProducts.length === 0 && !isCJLoading && (
        <Card className="kamri-card">
          <CardContent className="text-center py-12">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recherchez des produits CJ</h3>
            <p className="text-gray-500 mb-4">Utilisez les filtres ci-dessus pour rechercher dans le catalogue CJ Dropshipping</p>
            <Button
              className="kamri-button"
              onClick={searchCJProducts}
            >
              <Search className="w-4 h-4 mr-2" />
              Rechercher maintenant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de détails produit */}
      <ProductDetailsModal
        productId={selectedProductId}
        isOpen={selectedProductId !== null}
        onClose={() => setSelectedProductId(null)}
      />
    </div>
  )
}
