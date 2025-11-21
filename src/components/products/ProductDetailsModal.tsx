'use client'

import { useEffect, useState } from 'react'
import { X, Package, DollarSign, ShoppingCart, Tag, Calendar, User, Box, Weight, Ruler, Star, Image as ImageIcon, Info, Truck, Globe } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ShippingOptions, ShippingOption } from './ShippingOptions'

interface ProductDetails {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  image?: string
  images?: Array<{ id: string; url: string; alt?: string }>
  stock: number
  sales: number
  status: string
  badge?: string
  source?: string
  categoryId?: string
  supplierId?: string
  externalCategory?: string
  cjProductId?: string
  productSku?: string
  productWeight?: string
  packingWeight?: string
  productType?: string
  productUnit?: string
  productKeyEn?: string
  materialNameEn?: string
  packingNameEn?: string
  suggestSellPrice?: string
  listedNum?: number
  supplierName?: string
  createrTime?: string
  variants?: string
  cjReviews?: string
  dimensions?: string
  brand?: string
  tags?: string
  importStatus?: string
  lastImportAt?: string
  deliveryCycle?: string
  isFreeShipping?: boolean
  freeShippingCountries?: string
  defaultShippingMethod?: string
  margin?: number
  isEdited?: boolean
  editedAt?: string
  editedBy?: string
  createdAt?: string
  updatedAt?: string
  category?: {
    id: string
    name: string
  }
  supplier?: {
    id: string
    name: string
  }
  reviews?: Array<{
    id: string
    rating: number
    comment?: string
    createdAt: string
    user?: {
      id: string
      name: string
    }
  }>
  productVariants?: Array<{
    id: string
    productId: string
    cjVariantId: string | null
    name: string | null
    sku: string | null
    price: number | null
    weight: number | null
    dimensions: string | null
    image: string | null
    status: string | null
    properties: string | null
    stock: number | null
    isActive: boolean
    lastSyncAt: string | null
    createdAt: string
    updatedAt: string
  }>
}

interface Props {
  productId: string | null
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailsModal({ productId, isOpen, onClose }: Props) {
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // États pour le calcul de fret
  const [selectedCountry, setSelectedCountry] = useState<string>('FR')
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption | null>(null)
  
  // États pour les avis CJ
  const [cjReviews, setCjReviews] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  useEffect(() => {
    if (isOpen && productId) {
      loadProductDetails()
    } else {
      setProduct(null)
      setError(null)
      setShippingOptions([])
      setSelectedShippingOption(null)
      setShippingError(null)
      setCjReviews([])
    }
  }, [isOpen, productId])
  
  // Récupérer les avis CJ quand le produit est chargé
  useEffect(() => {
    if (product && (product.source === 'cj-dropshipping' || product.cjProductId)) {
      loadCJReviews()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, product?.cjProductId])

  // Calculer le fret quand le pays change ou quand le produit est chargé
  useEffect(() => {
    if (product && (product.source === 'cj-dropshipping' || product.cjProductId) && product.productVariants && product.productVariants.length > 0 && selectedCountry) {
      calculateFreight()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry])
  
  // Calculer le fret quand le produit est chargé
  useEffect(() => {
    if (product && (product.source === 'cj-dropshipping' || product.cjProductId) && product.productVariants && product.productVariants.length > 0 && selectedCountry) {
      calculateFreight()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  const loadProductDetails = async () => {
    if (!productId) return

    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getProduct(productId)
      
      if (response?.error) {
        setError(response.error)
        return
      }
      
      if (response?.data) {
        setProduct(response.data)
      } else {
        setError('Produit introuvable')
      }
    } catch (err: any) {
      console.error('Erreur chargement détails produit:', err)
      setError(err.message || 'Erreur lors du chargement des détails')
    } finally {
      setLoading(false)
    }
  }

  const loadCJReviews = async () => {
    if (!product) return
    
    // ✅ Récupérer le PID depuis plusieurs emplacements possibles
    const pid = product.cjProductId || 
                (product as any).pid || 
                (product as any).cjMapping?.cjProductId
    if (!pid) {
      console.warn('⚠️ Pas de PID CJ trouvé pour récupérer les avis')
      return
    }

    try {
      setLoadingReviews(true)
      const response = await apiClient.getCJProductReviews(pid)
      
      if (response?.error) {
        console.warn('Erreur récupération avis CJ:', response.error)
        setCjReviews([])
        return
      }
      
      if (response?.data?.reviews && Array.isArray(response.data.reviews)) {
        setCjReviews(response.data.reviews)
      } else {
        setCjReviews([])
      }
    } catch (err: any) {
      console.error('Erreur récupération avis CJ:', err)
      setCjReviews([])
    } finally {
      setLoadingReviews(false)
    }
  }

  const calculateFreight = async () => {
    if (!product || !product.productVariants || product.productVariants.length === 0) return

    try {
      setLoadingShipping(true)
      setShippingError(null)
      setShippingOptions([])

      // Récupérer le premier variant avec un cjVariantId valide
      const variant = product.productVariants.find(v => v.cjVariantId)
      if (!variant || !variant.cjVariantId) {
        setShippingError('Aucun variant CJ trouvé pour ce produit')
        return
      }

      const response = await apiClient.calculateCJFreight({
        startCountryCode: 'CN', // Chine (pays d'origine CJ)
        endCountryCode: selectedCountry,
        products: [{
          vid: variant.cjVariantId,
          quantity: 1
        }]
      })

      if (response.error) {
        setShippingError(response.error)
        return
      }

      if (response.data?.freightOptions) {
        setShippingOptions(response.data.freightOptions)
        if (response.data.freightOptions.length > 0) {
          setSelectedShippingOption(response.data.freightOptions[0])
        }
      } else {
        setShippingError('Aucune option de livraison disponible')
      }
    } catch (err: any) {
      console.error('Erreur calcul fret:', err)
      setShippingError(err.message || 'Erreur lors du calcul des frais de livraison')
    } finally {
      setLoadingShipping(false)
    }
  }

  if (!isOpen) return null

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getBadgeColor = (badge: string) => {
    const colors: Record<string, string> = {
      promo: 'bg-red-100 text-red-800',
      'top-ventes': 'bg-blue-100 text-blue-800',
      tendances: 'bg-purple-100 text-purple-800',
      nouveau: 'bg-green-100 text-green-800',
    }
    return colors[badge] || 'bg-gray-100 text-gray-800'
  }

  const parseJsonField = (field: string | undefined | null) => {
    if (!field) return null
    try {
      return JSON.parse(field)
    } catch {
      return field
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Détails du Produit
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {product && !loading && (
            <div className="space-y-6">
              {/* Image et informations principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Images
                  </h3>
                  <div className="space-y-2">
                    {product.images && product.images.length > 0 ? (
                      product.images.map((img, idx) => (
                        <img
                          key={img.id || idx}
                          src={typeof img === 'string' ? img : img.url}
                          alt={`${product.name} - Image ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      ))
                    ) : product.image ? (() => {
                      const imageUrl = typeof product.image === 'string' 
                        ? (() => {
                            try {
                              const parsed = JSON.parse(product.image);
                              return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : product.image;
                            } catch {
                              return product.image;
                            }
                          })()
                        : null;
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null;
                    })() : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations principales */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-gray-600 text-sm">{product.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                    {product.badge && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor(product.badge)}`}>
                        {product.badge}
                      </span>
                    )}
                    {product.source && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        Source: {product.source}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-3xl font-bold text-primary-600">{product.price}$</span>
                      {product.originalPrice && (
                        <span className="text-lg text-gray-400 line-through ml-2">{product.originalPrice}$</span>
                      )}
                    </div>
                    {product.margin && (
                      <div className="text-sm text-gray-600">
                        Marge: <span className="font-semibold">{product.margin}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations générales */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Informations Générales
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="font-mono text-xs mt-1">{product.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Stock:</span>
                    <p className="font-semibold mt-1">{product.stock}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Ventes:</span>
                    <p className="font-semibold mt-1">{product.sales}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Catégorie:</span>
                    <p className="font-semibold mt-1">{product.category?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Fournisseur:</span>
                    <p className="font-semibold mt-1">{product.supplier?.name || 'N/A'}</p>
                  </div>
                  {product.brand && (
                    <div>
                      <span className="text-gray-500">Marque:</span>
                      <p className="font-semibold mt-1">{product.brand}</p>
                    </div>
                  )}
                  {product.productSku && (
                    <div>
                      <span className="text-gray-500">SKU:</span>
                      <p className="font-mono text-xs mt-1">{product.productSku}</p>
                    </div>
                  )}
                  {product.cjProductId && (
                    <div>
                      <span className="text-gray-500">ID CJ:</span>
                      <p className="font-mono text-xs mt-1">{product.cjProductId}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Informations CJ Dropshipping */}
              {(product.source === 'cj-dropshipping' || product.cjProductId) && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Informations CJ Dropshipping
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {product.productType && (
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <p className="font-semibold mt-1">{product.productType}</p>
                      </div>
                    )}
                    {product.productWeight && (
                      <div>
                        <span className="text-gray-500">Poids produit:</span>
                        <p className="font-semibold mt-1">{product.productWeight}</p>
                      </div>
                    )}
                    {product.packingWeight && (
                      <div>
                        <span className="text-gray-500">Poids emballage:</span>
                        <p className="font-semibold mt-1">{product.packingWeight}</p>
                      </div>
                    )}
                    {product.productUnit && (
                      <div>
                        <span className="text-gray-500">Unité:</span>
                        <p className="font-semibold mt-1">{product.productUnit}</p>
                      </div>
                    )}
                    {product.materialNameEn && (
                      <div>
                        <span className="text-gray-500">Matériau:</span>
                        <p className="font-semibold mt-1">{product.materialNameEn}</p>
                      </div>
                    )}
                    {product.packingNameEn && (
                      <div>
                        <span className="text-gray-500">Emballage:</span>
                        <p className="font-semibold mt-1">{product.packingNameEn}</p>
                      </div>
                    )}
                    {product.suggestSellPrice && (
                      <div>
                        <span className="text-gray-500">Prix suggéré CJ:</span>
                        <p className="font-semibold mt-1">{product.suggestSellPrice}</p>
                      </div>
                    )}
                    {product.listedNum !== undefined && (
                      <div>
                        <span className="text-gray-500">Listings:</span>
                        <p className="font-semibold mt-1">{product.listedNum}</p>
                      </div>
                    )}
                    {product.supplierName && (
                      <div>
                        <span className="text-gray-500">Fournisseur CJ:</span>
                        <p className="font-semibold mt-1">{product.supplierName}</p>
                      </div>
                    )}
                    {product.dimensions && (
                      <div>
                        <span className="text-gray-500">Dimensions:</span>
                        <p className="font-semibold mt-1">{product.dimensions}</p>
                      </div>
                    )}
                    {product.productKeyEn && (
                      <div className="col-span-2 md:col-span-3">
                        <span className="text-gray-500">Attributs:</span>
                        <p className="font-semibold mt-1">{product.productKeyEn}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Informations de livraison */}
              {(product.source === 'cj-dropshipping' || product.cjProductId) && (
                <Card className="p-4 bg-blue-50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Informations de Livraison
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {product.isFreeShipping !== undefined && (
                      <div>
                        <span className="text-gray-500 flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Livraison gratuite:
                        </span>
                        <p className={`font-semibold mt-1 ${product.isFreeShipping ? 'text-green-600' : 'text-gray-600'}`}>
                          {product.isFreeShipping ? '✅ Disponible' : '❌ Non disponible'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">(Champ: addMarkStatus de l'API CJ)</p>
                      </div>
                    )}
                    {product.deliveryCycle && (
                      <div>
                        <span className="text-gray-500 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Délai de livraison:
                        </span>
                        <p className="font-semibold mt-1 text-blue-700">{product.deliveryCycle}</p>
                        <p className="text-xs text-gray-400 mt-1">(Peut ne pas être disponible pour tous les produits)</p>
                      </div>
                    )}
                    <div className="col-span-1 md:col-span-2 mt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <label className="text-sm font-medium text-gray-700">
                          Pays de destination:
                        </label>
                        <select
                          value={selectedCountry}
                          onChange={(e) => setSelectedCountry(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="FR">🇫🇷 France</option>
                          <option value="US">🇺🇸 États-Unis</option>
                          <option value="GB">🇬🇧 Royaume-Uni</option>
                          <option value="DE">🇩🇪 Allemagne</option>
                          <option value="ES">🇪🇸 Espagne</option>
                          <option value="IT">🇮🇹 Italie</option>
                          <option value="CA">🇨🇦 Canada</option>
                          <option value="BE">🇧🇪 Belgique</option>
                          <option value="CH">🇨🇭 Suisse</option>
                          <option value="NL">🇳🇱 Pays-Bas</option>
                          <option value="AU">🇦🇺 Australie</option>
                        </select>
                      </div>
                      
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Options de livraison:</h4>
                        <ShippingOptions
                          options={shippingOptions}
                          loading={loadingShipping}
                          error={shippingError}
                          selectedOption={selectedShippingOption}
                          onSelect={setSelectedShippingOption}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Variants - Section complète avec tous les détails */}
              {(() => {
                // Priorité : productVariants (relation Prisma) > variants (JSON)
                let variantsToDisplay: any[] = []
                
                if (product.productVariants && product.productVariants.length > 0) {
                  // Utiliser productVariants si disponible
                  variantsToDisplay = product.productVariants.map((pv: any) => ({
                    id: pv.id,
                    productId: pv.productId,
                    cjVariantId: pv.cjVariantId,
                    name: pv.name,
                    sku: pv.sku,
                    price: pv.price,
                    weight: pv.weight,
                    dimensions: pv.dimensions,
                    image: pv.image,
                    status: pv.status,
                    properties: pv.properties,
                    stock: pv.stock,
                    isActive: pv.isActive !== false,
                    lastSyncAt: pv.lastSyncAt,
                    createdAt: pv.createdAt,
                    updatedAt: pv.updatedAt
                  }))
                } else if (product.variants) {
                  // Fallback : parser le champ JSON variants
                  try {
                    const parsedVariants = typeof product.variants === 'string' 
                      ? JSON.parse(product.variants) 
                      : product.variants
                    
                    if (Array.isArray(parsedVariants)) {
                      // Transformer les variants JSON en format compatible
                      variantsToDisplay = parsedVariants.map((v: any, idx: number) => ({
                        id: `variant-${idx}-${v.vid || v.variantId || idx}`,
                        productId: product.id,
                        cjVariantId: String(v.vid || v.variantId || ''),
                        name: v.variantNameEn || v.variantName || v.name || `Variant ${idx + 1}`,
                        sku: v.variantSku || v.sku || '',
                        price: parseFloat(v.variantSellPrice || v.variantPrice || v.price || v.sellPrice || 0),
                        stock: parseInt(v.variantStock || v.stock || 0, 10),
                        weight: parseFloat(v.variantWeight || v.weight || 0),
                        dimensions: typeof v.variantDimensions === 'string' ? v.variantDimensions : JSON.stringify(v.variantDimensions || {}),
                        image: v.variantImage || v.image || '',
                        status: v.status || 'active',
                        properties: typeof v.variantProperties === 'string' ? v.variantProperties : JSON.stringify(v.variantProperties || v.variantKey || {}),
                        isActive: v.isActive !== false,
                        lastSyncAt: null,
                        createdAt: product.createdAt || new Date().toISOString(),
                        updatedAt: product.updatedAt || new Date().toISOString()
                      }))
                    }
                  } catch (error) {
                    console.error('Erreur parsing variants JSON:', error)
                  }
                }
                
                if (variantsToDisplay.length === 0) {
                  return null
                }
                
                return (
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Box className="w-5 h-5" />
                      Variants ({variantsToDisplay.length})
                    </h3>
                    <div className="space-y-6">
                      {variantsToDisplay.map((variant, idx) => (
                      <div key={variant.id} className="border rounded-lg p-4 space-y-4">
                        {/* En-tête du variant */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-md font-semibold text-gray-900 mb-2">
                              Variant #{idx + 1} {variant.name ? `- ${variant.name}` : ''}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                variant.isActive === false ? 'bg-red-100 text-red-800' : 
                                variant.status === 'active' ? 'bg-green-100 text-green-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {variant.isActive === false ? 'Inactif' : variant.status || 'N/A'}
                              </span>
                              {variant.cjVariantId && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  CJ ID: {variant.cjVariantId}
                                </span>
                              )}
                            </div>
                          </div>
                          {variant.image && (
                            <img
                              src={variant.image}
                              alt={variant.name || `Variant ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded border"
                            />
                          )}
                        </div>

                        {/* Informations principales */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">ID:</span>
                            <p className="font-mono text-xs mt-1">{variant.id}</p>
                          </div>
                          {variant.sku && (
                            <div>
                              <span className="text-gray-500">SKU:</span>
                              <p className="font-mono text-xs mt-1">{variant.sku}</p>
                            </div>
                          )}
                          {variant.price !== null && variant.price !== undefined && (
                            <div>
                              <span className="text-gray-500">Prix:</span>
                              <p className="font-semibold mt-1">{variant.price}$</p>
                            </div>
                          )}
                          {variant.stock !== null && variant.stock !== undefined && (
                            <div>
                              <span className="text-gray-500">Stock:</span>
                              <p className="font-semibold mt-1">{variant.stock}</p>
                            </div>
                          )}
                          {variant.weight !== null && variant.weight !== undefined && (
                            <div>
                              <span className="text-gray-500">Poids:</span>
                              <p className="font-semibold mt-1">
                                {variant.weight >= 1000 
                                  ? `${(variant.weight / 1000).toFixed(2)} kg` 
                                  : `${variant.weight} g`}
                              </p>
                            </div>
                          )}
                          {variant.dimensions && (
                            <div className="col-span-2 md:col-span-4">
                              <span className="text-gray-500">Dimensions:</span>
                              <p className="font-semibold mt-1">
                                {(() => {
                                  try {
                                    const dims = JSON.parse(variant.dimensions)
                                    if (typeof dims === 'object' && dims !== null) {
                                      // Convertir mm → cm (diviser par 10)
                                      const lengthCm = dims.length ? (dims.length / 10).toFixed(1) : 'N/A'
                                      const widthCm = dims.width ? (dims.width / 10).toFixed(1) : 'N/A'
                                      const heightCm = dims.height ? (dims.height / 10).toFixed(1) : 'N/A'
                                      return `${lengthCm} x ${widthCm} x ${heightCm} cm`
                                    }
                                    return variant.dimensions
                                  } catch {
                                    return variant.dimensions
                                  }
                                })()}
                              </p>
                            </div>
                          )}
                          {variant.properties && (
                            <div className="col-span-2 md:col-span-4">
                              <span className="text-gray-500">Propriétés:</span>
                              <div className="mt-1">
                                {(() => {
                                  try {
                                    const props = JSON.parse(variant.properties)
                                    if (typeof props === 'object' && props !== null) {
                                      return (
                                        <div className="space-y-1">
                                          {props.key && (
                                            <p className="text-sm"><span className="font-semibold">Clé:</span> {props.key}</p>
                                          )}
                                          {props.value1 && (
                                            <p className="text-sm"><span className="font-semibold">Valeur 1:</span> {props.value1}</p>
                                          )}
                                          {props.value2 && (
                                            <p className="text-sm"><span className="font-semibold">Valeur 2:</span> {props.value2}</p>
                                          )}
                                          {props.value3 && (
                                            <p className="text-sm"><span className="font-semibold">Valeur 3:</span> {props.value3}</p>
                                          )}
                                        </div>
                                      )
                                    }
                                    return <p className="text-sm">{variant.properties}</p>
                                  } catch {
                                    return <p className="text-sm">{variant.properties}</p>
                                  }
                                })()}
                              </div>
                            </div>
                          )}
                          {variant.lastSyncAt && (
                            <div>
                              <span className="text-gray-500">Dernière sync:</span>
                              <p className="font-semibold mt-1 text-xs">{formatDate(variant.lastSyncAt)}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Créé le:</span>
                            <p className="font-semibold mt-1 text-xs">{formatDate(variant.createdAt)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Modifié le:</span>
                            <p className="font-semibold mt-1 text-xs">{formatDate(variant.updatedAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                )
              })()}

              {/* Tags */}
              {product.tags && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const tags = parseJsonField(product.tags)
                      if (Array.isArray(tags)) {
                        return tags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                            {tag}
                          </span>
                        ))
                      } else if (typeof tags === 'string') {
                        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">{tags}</span>
                      }
                      return null
                    })()}
                  </div>
                </Card>
              )}

              {/* Informations de tracking */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Informations de Tracking
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {product.importStatus && (
                    <div>
                      <span className="text-gray-500">Statut import:</span>
                      <p className="font-semibold mt-1">{product.importStatus}</p>
                    </div>
                  )}
                  {product.lastImportAt && (
                    <div>
                      <span className="text-gray-500">Dernier import:</span>
                      <p className="font-semibold mt-1">{formatDate(product.lastImportAt)}</p>
                    </div>
                  )}
                  {product.isEdited && (
                    <div>
                      <span className="text-gray-500">Édité:</span>
                      <p className="font-semibold mt-1">Oui</p>
                    </div>
                  )}
                  {product.editedAt && (
                    <div>
                      <span className="text-gray-500">Date édition:</span>
                      <p className="font-semibold mt-1">{formatDate(product.editedAt)}</p>
                    </div>
                  )}
                  {product.createdAt && (
                    <div>
                      <span className="text-gray-500">Créé le:</span>
                      <p className="font-semibold mt-1">{formatDate(product.createdAt)}</p>
                    </div>
                  )}
                  {product.updatedAt && (
                    <div>
                      <span className="text-gray-500">Modifié le:</span>
                      <p className="font-semibold mt-1">{formatDate(product.updatedAt)}</p>
                    </div>
                  )}
                  {product.createrTime && (
                    <div>
                      <span className="text-gray-500">Créé CJ:</span>
                      <p className="font-semibold mt-1">{product.createrTime}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Avis KAMRI (Reviews) */}
              {product.reviews && product.reviews.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Avis KAMRI ({product.reviews.length})
                  </h3>
                  <div className="space-y-3">
                    {product.reviews.map((review) => (
                      <div key={review.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm font-semibold">{review.rating}/5</span>
                          </div>
                          {review.user && (
                            <span className="text-xs text-gray-500">Par {review.user.name}</span>
                          )}
                        </div>
                        {review.comment && <p className="text-gray-700 text-sm mb-1">{review.comment}</p>}
                        <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Avis CJ (récupérés dynamiquement) */}
              {(product.source === 'cj-dropshipping' || product.cjProductId) && (
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Avis CJ Dropshipping
                    {loadingReviews && <span className="text-sm text-gray-500 ml-2">(Chargement...)</span>}
                  </h3>
                  <div className="text-sm">
                    {loadingReviews ? (
                      <p className="text-gray-500">Chargement des avis...</p>
                    ) : cjReviews.length > 0 ? (
                      <div className="space-y-3">
                        {(() => {
                          // ✅ Filtrer les doublons et créer des clés uniques
                          const uniqueReviews = cjReviews.filter((review: any, index: number, self: any[]) => {
                            const commentId = review.commentId || review.id;
                            if (!commentId) return true; // Garder si pas d'ID
                            // Garder seulement le premier avis avec cet ID
                            return index === self.findIndex((r: any) => (r.commentId || r.id) === commentId);
                          });
                          
                          return uniqueReviews.slice(0, 10).map((review: any, idx: number) => {
                            // ✅ Créer une clé unique en combinant commentId, pid et index
                            const commentId = review.commentId || review.id;
                            const pid = review.pid || '';
                            const uniqueKey = commentId 
                              ? `review-${commentId}-${pid}-${idx}` 
                              : `review-${idx}-${Date.now()}`;
                            
                            return (
                          <div key={uniqueKey} className="border-l-4 border-blue-500 pl-4 py-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < (review.rating || parseInt(review.score || '0', 10) || 0) 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="ml-2 text-sm font-semibold">
                                  {review.rating || parseInt(review.score || '0', 10) || 0}/5
                                </span>
                              </div>
                              {review.commentUser && (
                                <span className="text-xs text-gray-500">Par {review.commentUser}</span>
                              )}
                            </div>
                            {review.comment && (
                              <p className="text-gray-700 text-sm mb-1">{review.comment}</p>
                            )}
                            {(review.commentDate || review.createdAt) && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(review.commentDate || review.createdAt)}
                              </p>
                            )}
                            {review.commentUrls && review.commentUrls.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {review.commentUrls.slice(0, 3).map((url: string, imgIdx: number) => (
                                  <img
                                    key={`${uniqueKey}-img-${imgIdx}-${url.substring(url.length - 20)}`}
                                    src={url}
                                    alt={`Avis ${idx + 1} - Image ${imgIdx + 1}`}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                            );
                          });
                        })()}
                        {cjReviews.length > 10 && (
                          <p className="text-xs text-gray-500 mt-2">
                            ... et {cjReviews.length - 10} autres avis
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">Aucun avis disponible</p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}

