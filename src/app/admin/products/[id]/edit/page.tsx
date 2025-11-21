"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import { ArrowLeft, Image as ImageIcon, Package, Save, RefreshCw } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProductVariant {
  id: string
  name?: string
  sku?: string
  price?: number
  weight?: number
  dimensions?: string
  image?: string
  status?: string
  properties?: string
  stock?: number
  isActive: boolean
  cjVariantId?: string
}

interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number
  description?: string
  supplier?: { id: string; name: string }
  category?: { id: string; name: string }
  status: string
  badge?: string | null
  image?: string
  images?: string[]
  stock: number
  sales: number
  type?: string
  productVariants?: ProductVariant[]
  variants?: string // JSON des variants CJ
}

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
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

// Fonction pour obtenir la couleur CSS à partir du nom
const getColorValue = (colorName: string): string => {
  const colorMap: { [key: string]: string } = {
    'black': '#000000',
    'white': '#FFFFFF',
    'gray': '#808080',
    'grey': '#808080',
    'red': '#FF0000',
    'blue': '#0000FF',
    'navy': '#000080',
    'navy blue': '#000080',
    'green': '#008000',
    'pink': '#FFC0CB',
    'purple': '#800080',
    'light blue': '#ADD8E6',
    'beige': '#F5F5DC',
    'light grey': '#D3D3D3',
    'burgundy': '#800020',
    'wine': '#800020',
    'brown': '#8B4513',
    'khaki': '#F0E68C',
    'orange': '#FFA500',
    'yellow': '#FFFF00',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
  }
  
  const normalized = colorName.toLowerCase().trim()
  return colorMap[normalized] || '#CCCCCC'
}

// Fonction pour extraire les couleurs et tailles des variants
const extractVariantInfo = (product: Product) => {
  const colors: Array<{ name: string; image: string }> = []
  const sizes: string[] = []
  const colorImageMap = new Map<string, string>()
  const sizeSet = new Set<string>()

  // Extraire depuis productVariants (relation Prisma)
  if (product.productVariants && product.productVariants.length > 0) {
    product.productVariants.forEach((variant) => {
      if (!variant.properties) return

      try {
        const properties = typeof variant.properties === 'string' 
          ? JSON.parse(variant.properties) 
          : variant.properties

        // Extraire couleur
        let color = ''
        if (typeof properties === 'string') {
          // Format : "Black Zone2-S" ou "Purple-M"
          const zoneMatch = properties.match(/^([A-Za-z]+)\s*Zone\d+/i)
          if (zoneMatch) {
            color = zoneMatch[1].trim()
          } else {
            color = properties.split(/[-\s]/)[0]
          }
        } else if (properties.value1) {
          color = properties.value1
        }

        if (color) {
          const colorLower = color.toLowerCase()
          const knownColors = ['black', 'white', 'brown', 'gray', 'grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'orange', 'khaki', 'beige', 'navy', 'wine', 'burgundy']
          
          if (knownColors.includes(colorLower) && !colorImageMap.has(colorLower)) {
            colorImageMap.set(colorLower, variant.image || '')
          }
        }

        // Extraire taille
        let size = ''
        if (typeof properties === 'string') {
          const sizeMatch = properties.match(/[-\s]([A-Z0-9]+)$/i)
          if (sizeMatch) {
            size = sizeMatch[1]
          }
        } else if (properties.value2) {
          size = properties.value2
        }

        if (size) {
          sizeSet.add(size.toUpperCase())
        }
      } catch (e) {
        console.warn('Erreur parsing properties:', e)
      }
    })
  }

  // Extraire depuis le champ variants JSON (pour les produits CJ)
  if (colorImageMap.size === 0 && product.variants && typeof product.variants === 'string') {
    try {
      const variantsArray = JSON.parse(product.variants)
      if (Array.isArray(variantsArray)) {
        variantsArray.forEach((v: any) => {
          if (!v.variantKey) return
          
          // Extraire couleur
          let extractedColor = ''
          const zoneMatch = v.variantKey.match(/^([A-Za-z]+)\s*Zone\d+/i)
          if (zoneMatch) {
            extractedColor = zoneMatch[1].trim()
          } else {
            const firstWord = v.variantKey.split(/[-\s]/)[0]
            if (firstWord && /^[A-Za-z]+$/.test(firstWord)) {
              extractedColor = firstWord.trim()
            }
          }
          
          if (extractedColor) {
            const colorLower = extractedColor.toLowerCase()
            const knownColors = ['black', 'white', 'brown', 'gray', 'grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'orange', 'khaki', 'beige', 'navy', 'wine', 'burgundy']
            
            if (knownColors.includes(colorLower) && !colorImageMap.has(colorLower)) {
              colorImageMap.set(colorLower, v.variantImage || '')
            }
          }

          // Extraire taille
          const sizeMatch = v.variantKey.match(/[-\s]([A-Z0-9]+)$/i)
          if (sizeMatch) {
            sizeSet.add(sizeMatch[1].toUpperCase())
          }
        })
      }
    } catch (e) {
      console.error('Erreur parsing variants JSON:', e)
    }
  }

  // Convertir en tableaux
  colorImageMap.forEach((image, colorLower) => {
    const colorName = colorLower.charAt(0).toUpperCase() + colorLower.slice(1)
    colors.push({ name: colorName, image })
  })

  const sortedSizes = Array.from(sizeSet).sort((a, b) => {
    const sizeOrder: { [key: string]: number } = {
      'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7
    }
    
    const aOrder = sizeOrder[a.toUpperCase()] || 999
    const bOrder = sizeOrder[b.toUpperCase()] || 999
    
    if (aOrder !== 999 && bOrder !== 999) {
      return aOrder - bOrder
    }
    
    return a.localeCompare(b)
  })

  return { colors, sizes: sortedSizes }
};

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isSyncingStock, setIsSyncingStock] = useState(false)

  // États du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    stock: 0,
    categoryId: '',
    supplierId: '',
    status: 'active',
    badge: 'none',
    type: 'fashion',
    image: '',
    images: [] as string[]
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/admin/products')
      return
    }
    loadData()
  }, [isAuthenticated, productId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 [EDIT] Chargement du produit:', productId)

      // Charger le produit
      const productResponse = await apiClient.getProduct(productId)
      console.log('📦 [EDIT] Réponse API complète:', productResponse)
      
      // Vérifier si on a une erreur
      if (productResponse.error) {
        throw new Error(productResponse.error)
      }
      
      if (productResponse.data) {
        const prod = productResponse.data
        console.log('✅ [EDIT] Produit chargé:', prod)
        console.log('🎨 [EDIT] Variants:', prod.productVariants || 'Aucun variant')
        setProduct(prod)
        
        // Nettoyer l'image principale
        let cleanImage = getCleanImageUrl(prod.image) || ''
        
        // Extraire toutes les images
        let allImages: string[] = []
        if (prod.images) {
          if (typeof prod.images === 'string') {
            try {
              const parsed = JSON.parse(prod.images)
              if (Array.isArray(parsed)) {
                allImages = parsed
              }
            } catch {
              if (prod.images) allImages = [prod.images]
            }
          } else if (Array.isArray(prod.images)) {
            allImages = prod.images
          }
        }
        
        // Si pas d'images dans le tableau mais une image principale, l'ajouter
        if (allImages.length === 0 && cleanImage) {
          allImages = [cleanImage]
        }

        // Remplir le formulaire
        setFormData({
          name: prod.name || '',
          description: prod.description || '',
          price: prod.price || 0,
          originalPrice: prod.originalPrice || 0,
          stock: prod.stock || 0,
          categoryId: prod.category?.id || '',
          supplierId: prod.supplier?.id || '', // Sera converti en 'none' dans le Select si vide
          status: prod.status || 'active',
          badge: prod.badge || 'none',
          type: prod.type || 'fashion',
          image: cleanImage,
          images: allImages
        })
      } else {
        throw new Error('Aucune donnée de produit reçue de l\'API')
      }

      // Charger les catégories
      const categoriesResponse = await apiClient.getCategories()
      if (categoriesResponse.data) {
        const categoriesData = categoriesResponse.data.data || categoriesResponse.data
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      }

      // Charger les fournisseurs
      const suppliersResponse = await apiClient.getSuppliers()
      if (suppliersResponse.data) {
        const suppliersData = suppliersResponse.data.data || suppliersResponse.data
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      }
    } catch (error: any) {
      console.error('❌ [EDIT] Erreur lors du chargement:', error)
      console.error('❌ [EDIT] Message:', error?.message)
      console.error('❌ [EDIT] Response:', error?.response)
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Impossible de charger le produit'
      
      toast.showToast({ 
        type: 'error', 
        title: 'Erreur de chargement', 
        description: errorMessage
      })
      
      // Ne pas rediriger immédiatement pour laisser le temps de voir l'erreur
      setTimeout(() => {
        router.push('/admin/products')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.price || !formData.categoryId) {
      toast.showToast({ 
        type: 'warning', 
        title: 'Validation', 
        description: 'Veuillez remplir tous les champs obligatoires' 
      })
      return
    }

    try {
      setIsSaving(true)

      const updateData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
        stock: Number(formData.stock),
        categoryId: formData.categoryId,
        supplierId: formData.supplierId || undefined,
        status: formData.status,
        badge: formData.badge === 'none' ? null : formData.badge,
        // Note: Le champ 'type' n'existe pas dans le modèle Prisma Product
        // Si vous voulez stocker le type, utilisez 'productType' à la place
        // productType: formData.type,
        image: formData.image
      }

      const response = await apiClient.updateProduct(productId, updateData)

      if (response.data) {
        toast.showToast({ 
          type: 'success', 
          title: 'Succès', 
          description: 'Produit modifié avec succès' 
        })
        router.push('/admin/products')
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error)
      toast.showToast({ 
        type: 'error', 
        title: 'Erreur', 
        description: error.response?.data?.message || 'Impossible de mettre à jour le produit' 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSyncStock = async () => {
    try {
      setIsSyncingStock(true)
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${API_URL}/cj-dropshipping/products/${productId}/sync-variants-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        toast.showToast({ 
          type: 'success', 
          title: 'Succès', 
          description: `${result.data.updated} variants mis à jour avec leur stock` 
        })
        
        // Recharger le produit pour voir les nouveaux stocks
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('Erreur sync stock:', error)
      toast.showToast({ 
        type: 'error', 
        title: 'Erreur', 
        description: error.message || 'Impossible de synchroniser les stocks' 
      })
    } finally {
      setIsSyncingStock(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du produit...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="kamri-card">
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Produit introuvable</p>
            <Button onClick={() => router.push('/admin/products')} className="kamri-button">
              Retour aux produits
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/products')}
            className="kamri-button-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Édition du produit</h1>
            <p className="text-gray-600 mt-1">{product.name}</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="kamri-button"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit}>
        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colonne gauche */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom du produit"
                    required
                    className="mt-2"
                  />
                </div>

                {/* ✅ Affichage des variants (couleurs et tailles) */}
                {(() => {
                  const variantInfo = extractVariantInfo(product)
                  
                  if (variantInfo.colors.length === 0 && variantInfo.sizes.length === 0) {
                    return null
                  }

                  return (
                    <div className="space-y-4 pb-4 border-b">
                      {/* Couleurs */}
                      {variantInfo.colors.length > 0 && (
                        <div>
                          <Label className="mb-3 block text-sm font-semibold text-gray-700">
                            🎨 Couleurs disponibles ({variantInfo.colors.length})
                          </Label>
                          <div className="flex flex-wrap gap-3">
                            {variantInfo.colors.map((color, idx) => (
                              <div
                                key={idx}
                                className="relative group cursor-pointer"
                              >
                                {/* Carré avec image du variant */}
                                <div className="relative w-20 h-20 border-2 border-gray-300 rounded-lg overflow-hidden bg-white hover:border-orange-500 transition-all shadow-sm hover:shadow-md">
                                  {color.image ? (
                                    <>
                                      {/* Image du variant */}
                                      <img
                                        src={color.image}
                                        alt={`${color.name} variant`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none'
                                          const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                          if (fallback) {
                                            fallback.style.display = 'flex'
                                          }
                                        }}
                                      />
                                      {/* Fallback si image ne charge pas */}
                                      <div
                                        className="hidden w-full h-full items-center justify-center"
                                        style={{ backgroundColor: getColorValue(color.name) }}
                                      >
                                        <span className="text-xs font-medium text-white capitalize drop-shadow-lg">
                                          {color.name}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    /* Pas d'image : afficher cercle de couleur */
                                    <div
                                      className="w-full h-full flex items-center justify-center"
                                      style={{ backgroundColor: getColorValue(color.name) }}
                                    >
                                      <span className="text-xs font-medium text-white capitalize drop-shadow-lg">
                                        {color.name}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Overlay semi-transparent avec nom de couleur */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-1">
                                    <span className="text-xs font-semibold text-white capitalize drop-shadow-lg px-2 py-0.5 bg-black/50 rounded">
                                      {color.name}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Nom de la couleur en dessous (toujours visible) */}
                                <p className="text-xs text-center mt-1 font-medium text-gray-700 capitalize truncate max-w-[80px]">
                                  {color.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tailles */}
                      {variantInfo.sizes.length > 0 && (
                        <div>
                          <Label className="mb-3 block text-sm font-semibold text-gray-700">
                            📏 Tailles disponibles ({variantInfo.sizes.length})
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {variantInfo.sizes.map((size, idx) => (
                              <div
                                key={idx}
                                className="min-w-[48px] h-12 px-3 border-2 border-gray-300 rounded-lg bg-white hover:border-orange-500 hover:bg-orange-50 transition-all font-semibold text-sm flex items-center justify-center cursor-pointer"
                              >
                                {size}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du produit"
                    rows={6}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Prix de vente ($) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      placeholder="0.00"
                      required
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="originalPrice">Prix original ($)</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                      placeholder="0.00"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="categoryId">Catégorie *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="supplierId">Fournisseur</Label>
                  <Select
                    value={formData.supplierId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, supplierId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Aucun fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun fournisseur</SelectItem>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Colonne droite */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="draft">Brouillon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="badge">Badge</Label>
                    <Select
                      value={formData.badge}
                      onValueChange={(value) => setFormData({ ...formData, badge: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="promo">Promo</SelectItem>
                        <SelectItem value="top-ventes">Top Ventes</SelectItem>
                        <SelectItem value="tendances">Tendances</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fashion">Mode</SelectItem>
                        <SelectItem value="tech">Tech</SelectItem>
                        <SelectItem value="home">Maison</SelectItem>
                        <SelectItem value="beauty">Beauté</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Galerie d'images */}
                {formData.images.length > 0 ? (
                  <div>
                    <Label>Galerie d'images ({formData.images.length} image{formData.images.length > 1 ? 's' : ''})</Label>
                    
                    <div className="mt-2 border rounded-lg p-2 bg-gray-50 relative">
                      <div className="flex items-center justify-center min-h-[300px] relative">
                        <img
                          src={formData.images[currentImageIndex]}
                          alt={`Aperçu ${currentImageIndex + 1}/${formData.images.length}`}
                          className="max-w-full max-h-[400px] object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Image+non+disponible'
                          }}
                        />
                        
                        {formData.images.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setCurrentImageIndex(currentImageIndex > 0 ? currentImageIndex - 1 : formData.images.length - 1)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              onClick={() => setCurrentImageIndex(currentImageIndex < formData.images.length - 1 ? currentImageIndex + 1 : 0)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
                            >
                              ›
                            </button>
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                              {currentImageIndex + 1} / {formData.images.length}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {formData.images.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                          {formData.images.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`flex-shrink-0 w-16 h-16 border-2 rounded overflow-hidden ${
                                idx === currentImageIndex ? 'border-blue-500' : 'border-gray-300'
                              }`}
                            >
                              <img
                                src={img}
                                alt={`Miniature ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/64/f3f4f6/9ca3af?text=+'
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="image">Image principale</Label>
                    <Input
                      id="image"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="URL de l'image"
                      className="mt-2"
                    />
                    {formData.image && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Aperçu :</p>
                        <img 
                          src={formData.image} 
                          alt="Aperçu" 
                          className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ✅ Liste des variants avec prix */}
                {product.productVariants && product.productVariants.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      🎯 Variants ({product.productVariants.length})
                    </h4>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {product.productVariants.map((variant, idx) => {
                        // Parser les propriétés pour afficher le nom du variant
                        let variantDisplay = variant.name || `Variant ${idx + 1}`
                        try {
                          if (variant.properties) {
                            const props = typeof variant.properties === 'string' 
                              ? JSON.parse(variant.properties) 
                              : variant.properties
                            if (typeof props === 'string') {
                              variantDisplay = props
                            }
                          }
                        } catch (e) {
                          // Ignorer les erreurs
                        }

                        return (
                          <div 
                            key={variant.id} 
                            className="flex justify-between items-center p-2 bg-white rounded border text-sm"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{variantDisplay}</span>
                              {variant.sku && (
                                <span className="text-xs text-gray-500 ml-2">({variant.sku})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {variant.stock !== undefined && (
                                <span className="text-xs text-gray-600">
                                  Stock: <strong>{variant.stock}</strong>
                                </span>
                              )}
                              {variant.price !== undefined && (
                                <span className="text-sm font-bold text-primary-600">
                                  {variant.price}$
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Statistiques */}
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 Statistiques</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ventes totales:</span>
                      <span className="font-semibold">{product.sales}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Stock actuel:</span>
                      <span className="font-semibold">{product.stock}</span>
                    </div>
                    {product.productVariants && product.productVariants.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Nombre de variants:</span>
                        <span className="font-semibold">{product.productVariants.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-between items-center pt-6 mt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncStock}
                disabled={isSyncingStock || isSaving}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {isSyncingStock ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Synchroniser les stocks
                  </>
                )}
              </Button>
              
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/products')}
                  disabled={isSaving}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="kamri-button"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
