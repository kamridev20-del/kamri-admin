'use client'

import { ProductDetailsModal } from '@/components/cj/ProductDetailsModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import { Check, Eye, Package, X, Edit } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  image?: string
  category?: { name: string }
  supplier?: { name: string }
  status: string
  badge?: string
  stock: number
  sales: number
  source?: string
  // Champs CJ spécifiques
  variants?: string
  productSku?: string
  productWeight?: string
  materialNameEn?: string
  packingNameEn?: string
  suggestSellPrice?: string
  cjReviews?: string
  packingWeight?: string
  productType?: string
  productUnit?: string
  productImage?: string
  images?: string
}

export default function ProductValidationPage() {
  const [pendingProducts, setPendingProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [productImageIndices, setProductImageIndices] = useState<{[key: string]: number}>({})
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      loadPendingProducts()
    }
  }, [selectedCategoryId, isAuthenticated])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Charger les catégories
      const categoriesResponse = await apiClient.getCategories()
      if (categoriesResponse.data) {
        const categoriesData = categoriesResponse.data.data || categoriesResponse.data
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      }
      
      // Charger les produits
      await loadPendingProducts()
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPendingProducts = async () => {
    try {
      const response = await apiClient.getProductsReadyForValidation(selectedCategoryId || undefined)
      if (response.data) {
        // L'API retourne { data: [...], message: "..." }, on doit extraire data
        const productsData = response.data.data || response.data;
        // S'assurer que productsData est un tableau
        const productsArray = Array.isArray(productsData) ? productsData : [];

        setPendingProducts(productsArray);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits prêts pour validation:', error)
    }
  }

  const approveProduct = async (id: string) => {
    try {
      await apiClient.approveProduct(id)
      setPendingProducts(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error)
    }
  }

  const rejectProduct = async (id: string) => {
    try {
      await apiClient.rejectProduct(id)
      setPendingProducts(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Erreur lors du rejet:', error)
    }
  }

  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  // Fonction pour obtenir le vrai prix du produit (pas le prix suggéré)
  const getDisplayPrice = (product: Product) => {
    // Priorité : prix original > prix de base (le vrai prix récupéré)
    if (product.originalPrice && product.originalPrice > 0) {
      return product.originalPrice
    }
    
    if (product.price && product.price > 0) {
      return product.price
    }
    
    return 0
  }

  // Fonction pour récupérer toutes les images d'un produit
  const getAllProductImages = (product: Product): string[] => {
    let images: string[] = [];
    
    // Essayer productImage en premier
    if (product.productImage) {
      try {
        if (typeof product.productImage === 'string' && product.productImage.startsWith('[')) {
          const parsed = JSON.parse(product.productImage);
          if (Array.isArray(parsed)) {
            images = parsed.filter(img => img && typeof img === 'string');
          }
        } else if (typeof product.productImage === 'string' && product.productImage.startsWith('http')) {
          images = [product.productImage];
        }
      } catch (e) {
        console.error('Erreur parsing productImage:', e);
      }
    }
    
    // Si pas d'images via productImage, essayer image
    if (images.length === 0 && product.image) {
      try {
        if (typeof product.image === 'string' && product.image.startsWith('[')) {
          const parsed = JSON.parse(product.image);
          if (Array.isArray(parsed)) {
            images = parsed.filter(img => img && typeof img === 'string');
          }
        } else if (typeof product.image === 'string' && product.image.startsWith('http')) {
          images = [product.image];
        }
      } catch (e) {
        console.error('Erreur parsing image:', e);
      }
    }
    
    return images.length > 0 ? images : ['https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Image+produit'];
  }

  // Fonction pour obtenir l'image du produit (modifiée pour utiliser l'index)
  const getProductImage = (product: Product) => {
    const allImages = getAllProductImages(product);
    const currentIndex = productImageIndices[product.id] || 0;
    return allImages[currentIndex] || allImages[0];
  }

  // Fonction pour naviguer entre les images
  const nextImage = (product: Product) => {
    const allImages = getAllProductImages(product);
    if (allImages.length > 1) {
      const currentIndex = productImageIndices[product.id] || 0;
      const nextIndex = (currentIndex + 1) % allImages.length;
      setProductImageIndices(prev => ({
        ...prev,
        [product.id]: nextIndex
      }));
    }
  }

  const previousImage = (product: Product) => {
    const allImages = getAllProductImages(product);
    if (allImages.length > 1) {
      const currentIndex = productImageIndices[product.id] || 0;
      const prevIndex = currentIndex === 0 ? allImages.length - 1 : currentIndex - 1;
      setProductImageIndices(prev => ({
        ...prev,
        [product.id]: prevIndex
      }));
    }
  }

  // Fonction pour nettoyer la description HTML
  const cleanDescription = (description: string) => {
    if (!description) return ''
    
    return description
      .replace(/<[^>]*>/g, '') // Supprimer toutes les balises HTML
      .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par des espaces
      .replace(/&amp;/g, '&') // Remplacer &amp; par &
      .replace(/&lt;/g, '<') // Remplacer &lt; par <
      .replace(/&gt;/g, '>') // Remplacer &gt; par >
      .replace(/&quot;/g, '"') // Remplacer &quot; par "
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
      .trim()
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h1>
          <p className="text-gray-600 mb-6">Veuillez vous connecter pour accéder à cette page.</p>
          <Button onClick={() => setShowLogin(true)}>Se connecter</Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des produits en attente...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Validation des Produits</h1>
          <p className="text-gray-600 mt-2">
            {pendingProducts.length} produit(s) en draft prêts pour validation
          </p>
          <p className="text-sm text-gray-500 mt-1">
            💡 Tous les produits passent par le statut "draft" avant publication. 
            Vous pouvez les éditer dans la page <a href="/admin/products/draft" className="text-primary-600 hover:underline">Draft</a>.
          </p>
        </div>
      </div>

      {/* Filtre par catégorie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtrer par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId('')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedCategoryId === ''
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Toutes ({pendingProducts.length})
            </button>
            {categories && Array.isArray(categories) && categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedCategoryId === category.id
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {pendingProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun produit en attente</h3>
            <p className="text-gray-600">Tous les produits ont été validés.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold line-clamp-1">
                    {product.name}
                  </CardTitle>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    Draft
                  </span>
                </div>
              </CardHeader>
              
              {/* Image du produit avec navigation */}
              <div className="px-6 pb-4 relative">
                <div className="relative group">
                  <img 
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Image+produit';
                    }}
                  />
                  
                  {/* Navigation des images */}
                  {getAllProductImages(product).length > 1 && (
                    <>
                      {/* Boutons de navigation */}
                      <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => previousImage(product)}
                          className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => nextImage(product)}
                          className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                        >
                          ›
                        </button>
                      </div>
                      
                      {/* Indicateur du nombre d'images */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        {(productImageIndices[product.id] || 0) + 1} / {getAllProductImages(product).length}
                      </div>
                      
                      {/* Points indicateurs */}
                      <div className="absolute bottom-2 left-2 flex space-x-1">
                        {getAllProductImages(product).map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setProductImageIndices(prev => ({
                              ...prev,
                              [product.id]: index
                            }))}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === (productImageIndices[product.id] || 0)
                                ? 'bg-white'
                                : 'bg-white bg-opacity-50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <CardContent className="space-y-4">
                {/* Product Info */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prix:</span>
                    <span className="font-semibold text-green-600">
                      {getDisplayPrice(product).toFixed(2)}$
                    </span>
                  </div>
                  
                  {product.suggestSellPrice && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Prix suggéré CJ:</span>
                      <span className="text-sm text-blue-600 font-medium">
                        {product.suggestSellPrice}$
                      </span>
                    </div>
                  )}
                  
                  {product.originalPrice && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Prix original:</span>
                      <span className="text-sm text-gray-500 line-through">
                        {product.originalPrice.toFixed(2)}$
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <span className="text-sm font-medium">{product.stock}</span>
                  </div>
                  
                  {product.category && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Catégorie:</span>
                      <span className="text-sm">{product.category.name}</span>
                    </div>
                  )}
                  
                  {product.supplier && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Fournisseur:</span>
                      <span className="text-sm">{product.supplier.name}</span>
                    </div>
                  )}
                  
                  {product.productSku && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">SKU CJ:</span>
                      <span className="text-sm font-mono text-gray-800">{product.productSku}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {cleanDescription(product.description)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 flex-wrap">
                  <Button
                    onClick={() => handleShowDetails(product)}
                    variant="outline"
                    className="flex-1 min-w-[100px]"
                    title="Voir les détails du produit"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Détails
                  </Button>
                  
                  <Button
                    onClick={() => window.location.href = `/admin/products/draft`}
                    variant="outline"
                    className="flex-1 min-w-[100px]"
                    title="Éditer le produit dans la page Draft"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Éditer
                  </Button>
                  
                  <Button
                    onClick={() => approveProduct(product.id)}
                    className="flex-1 min-w-[100px] bg-green-600 hover:bg-green-700"
                    title="Publier le produit (draft → active)"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Publier
                  </Button>
                  
                  <Button
                    onClick={() => rejectProduct(product.id)}
                    variant="destructive"
                    className="flex-1 min-w-[100px]"
                    title="Rejeter le produit (draft → rejected)"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de détails du produit */}
      {isModalOpen && selectedProduct && (
        <ProductDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedProduct(null)
          }}
          product={selectedProduct as any}
          onImport={() => {
            // Pas d'importation depuis la validation
            console.log('Import non disponible depuis la validation')
          }}
        />
      )}
    </div>
  )
}
