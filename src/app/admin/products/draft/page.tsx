'use client'

import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import {
  CheckCircle,
  Edit,
  Image as ImageIcon,
  Package,
  Save,
  Send,
  Tag,
  X
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

interface DraftProduct {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  margin?: number
  image?: string
  images?: Array<{ id: string; url: string }> | string[] // ✅ Supporte les deux formats
  productVariants?: ProductVariant[] // ✅ Variants du produit
  categoryId?: string
  category?: { id: string; name: string }
  supplierId?: string
  supplier?: { id: string; name: string }
  badge?: string
  stock: number
  status: string
  isEdited: boolean
  editedAt?: string
  editedBy?: string
  createdAt: string
  updatedAt: string
  // ✅ Toutes les données CJ
  source?: string
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
  variants?: string // JSON des variants CJ
  cjReviews?: string // JSON des avis CJ
  dimensions?: string
  brand?: string
  tags?: string // JSON des tags
  externalCategory?: string
  cjMapping?: {
    cjProductId: string
    cjSku: string
  }
}

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

export default function DraftProductsPage() {
  const [drafts, setDrafts] = useState<DraftProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<DraftProduct>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({}) // ✅ Index de l'image actuelle par produit
  const [editingVariants, setEditingVariants] = useState<{ [key: string]: ProductVariant[] }>({}) // ✅ Variants en cours d'édition
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const router = useRouter()

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

      // Charger les produits draft
      console.log('🔄 Chargement des produits draft...')
      const draftsResponse = await apiClient.getDraftProducts()
      console.log('📦 Réponse API getDraftProducts complète:', JSON.stringify(draftsResponse, null, 2))
      
      let draftsList: DraftProduct[] = []
      
      if (draftsResponse && draftsResponse.data) {
        // Structure: { data: [...] }
        const draftsData = draftsResponse.data
        if (Array.isArray(draftsData)) {
          draftsList = draftsData
        } else if (draftsData && typeof draftsData === 'object' && 'data' in draftsData) {
          // Structure imbriquée: { data: { data: [...] } }
          draftsList = Array.isArray(draftsData.data) ? draftsData.data : []
        } else {
          draftsList = []
        }
      } else if (Array.isArray(draftsResponse)) {
        // Réponse directe: [...]
        draftsList = draftsResponse
      } else if (draftsResponse && typeof draftsResponse === 'object' && !draftsResponse.error) {
        // Autre structure
        console.warn('⚠️ [DRAFT-PRODUCTS] Structure inattendue:', draftsResponse)
        draftsList = []
      } else {
        console.warn('⚠️ [DRAFT-PRODUCTS] Pas de données ou erreur:', draftsResponse)
        draftsList = []
      }
      
      console.log('📝 [DRAFT-PRODUCTS] Produits draft chargés:', draftsList.length)
      console.log('📝 [DRAFT-PRODUCTS] Produits:', draftsList)
      
      // ✅ Log des variants pour chaque produit
      draftsList.forEach((product, idx) => {
        console.log(`📦 [DRAFT-PRODUCTS] Produit ${idx + 1} (${product.id}):`, {
          name: product.name,
          variantsCount: product.productVariants?.length || 0,
          variants: product.productVariants?.map(v => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            cjVariantId: v.cjVariantId,
            stock: v.stock,
            price: v.price
          })) || []
        })
      })
      
      setDrafts(draftsList)

      // Charger les catégories
      const categoriesResponse = await apiClient.getCategories()
      if (categoriesResponse.data) {
        const categoriesData = categoriesResponse.data.data || categoriesResponse.data
        const categoriesList = Array.isArray(categoriesData) ? categoriesData : []
        setCategories(categoriesList)
      }

      // Charger les fournisseurs
      const suppliersResponse = await apiClient.getSuppliers()
      if (suppliersResponse.data) {
        const suppliersData = suppliersResponse.data.data || suppliersResponse.data
        const suppliersList = Array.isArray(suppliersData) ? suppliersData : []
        setSuppliers(suppliersList)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.showToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de charger les produits draft'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (product: DraftProduct) => {
    setEditingId(product.id)
    
    // ✅ Nettoyer l'image si c'est un tableau JSON stringifié
    const cleanImage = getCleanImageUrl(product.image) || ''
    
    // ✅ Récupérer toutes les images (depuis la relation images ou depuis le champ image)
    const allImages: string[] = []
    if (product.images && product.images.length > 0) {
      // Vérifier si c'est un tableau d'objets ou de strings
      if (typeof product.images[0] === 'string') {
        allImages.push(...(product.images as string[]))
      } else {
        allImages.push(...(product.images as Array<{ id: string; url: string }>).map(img => img.url))
      }
    } else if (product.image) {
      try {
        const parsed = JSON.parse(product.image)
        if (Array.isArray(parsed)) {
          allImages.push(...parsed)
        } else {
          allImages.push(product.image)
        }
      } catch {
        allImages.push(product.image)
      }
    }
    
    // ✅ Initialiser l'index de l'image actuelle
    setCurrentImageIndex(prev => ({ ...prev, [product.id]: 0 }))
    
    // ✅ Initialiser les variants en cours d'édition
    // Priorité : productVariants (relation Prisma) > variants (JSON)
    let variantsToUse: ProductVariant[] = []
    
    if (product.productVariants && product.productVariants.length > 0) {
      // Utiliser productVariants si disponible
      variantsToUse = product.productVariants
    } else if (product.variants) {
      // Fallback : parser le champ JSON variants
      try {
        const parsedVariants = typeof product.variants === 'string' 
          ? JSON.parse(product.variants) 
          : product.variants
        
        if (Array.isArray(parsedVariants)) {
          // Transformer les variants JSON en format ProductVariant
          variantsToUse = parsedVariants.map((v: any, idx: number) => ({
            id: `variant-${idx}-${v.vid || v.variantId || idx}`,
            cjVariantId: String(v.vid || v.variantId || ''),
            name: v.variantNameEn || v.variantName || v.name || `Variant ${idx + 1}`,
            sku: v.variantSku || v.sku || '',
            price: parseFloat(v.variantSellPrice || v.variantPrice || v.price || v.sellPrice || 0),
            stock: parseInt(v.variantStock || v.stock || 0, 10),
            weight: parseFloat(v.variantWeight || v.weight || 0),
            dimensions: typeof v.variantDimensions === 'string' ? v.variantDimensions : JSON.stringify(v.variantDimensions || {}),
            image: v.variantImage || v.image || '',
            status: v.status || 'active',
            properties: typeof v.variantProperties === 'string' ? v.variantProperties : JSON.stringify(v.variantProperties || {}),
            isActive: v.isActive !== false
          }))
          console.log(`✅ [DRAFT-EDIT] Variants parsés depuis JSON: ${variantsToUse.length} variants`)
        }
      } catch (error) {
        console.error('❌ [DRAFT-EDIT] Erreur parsing variants JSON:', error)
      }
    }
    
    setEditingVariants(prev => ({
      ...prev,
      [product.id]: variantsToUse
    }))
    
    setFormData({
      name: product.name,
      description: product.description || '',
      margin: product.margin || 30,
      categoryId: product.categoryId || '',
      image: cleanImage || allImages[0] || '',
      images: allImages, // ✅ Stocker toutes les images
      badge: product.badge || 'none',
      stock: product.stock || 0,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({})
    setCurrentImageIndex({})
    setEditingVariants({})
  }

  const handleSave = async (id: string) => {
    try {
      setIsSaving(true)

      // ✅ Préparer les images (utiliser toutes les images si disponibles)
      const imagesToSave: string[] = []
      if (formData.images && formData.images.length > 0) {
        if (typeof formData.images[0] === 'string') {
          imagesToSave.push(...(formData.images as string[]))
        } else {
          imagesToSave.push(...(formData.images as Array<{ id: string; url: string }>).map(img => img.url))
        }
      } else if (formData.image) {
        imagesToSave.push(formData.image)
      }

      const response = await apiClient.editDraftProduct(id, {
        name: formData.name,
        description: formData.description,
        margin: formData.margin,
        categoryId: formData.categoryId,
        image: formData.image,
        images: imagesToSave.length > 0 ? imagesToSave : undefined, // ✅ Envoyer toutes les images
        badge: formData.badge === 'none' ? undefined : formData.badge,
        stock: formData.stock,
      })

      if (response.data) {
        toast.showToast({
          type: 'success',
          title: 'Succès',
          description: 'Produit édité avec succès'
        })
        setEditingId(null)
        setFormData({})
        loadData()
      } else {
        toast.showToast({
          type: 'error',
          title: 'Erreur',
          description: response.error || 'Impossible d\'éditer le produit'
        })
      }
    } catch (error) {
      console.error('Erreur lors de l\'édition:', error)
      toast.showToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible d\'éditer le produit'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir publier ce produit ? Il sera visible dans le catalogue.')) {
      return
    }

    try {
      setIsPublishing(true)

      const response = await apiClient.publishProduct(id)

      if (response.data) {
        toast.showToast({
          type: 'success',
          title: 'Succès',
          description: 'Produit publié avec succès'
        })
        loadData()
      } else {
        toast.showToast({
          type: 'error',
          title: 'Erreur',
          description: response.error || 'Impossible de publier le produit'
        })
      }
    } catch (error) {
      console.error('Erreur lors de la publication:', error)
      toast.showToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de publier le produit'
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUpdateMappings = async () => {
    if (!confirm('Mettre à jour automatiquement les produits draft sans catégorie qui ont un mapping ?')) {
      return
    }

    try {
      setIsLoading(true)
      const response = await apiClient.updateDraftProductsWithMapping()

      if (response.data) {
        const { total, updated } = response.data
        toast.showToast({
          type: 'success',
          title: 'Succès',
          description: `${updated} produit(s) mis à jour sur ${total} trouvé(s)`
        })
        loadData() // Recharger les produits
      } else {
        toast.showToast({
          type: 'error',
          title: 'Erreur',
          description: response.error || 'Impossible de mettre à jour les produits'
        })
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des mappings:', error)
      toast.showToast({
        type: 'error',
        title: 'Erreur',
        description: 'Impossible de mettre à jour les produits'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePrice = (originalPrice?: number, margin?: number) => {
    if (!originalPrice || !margin) return 0
    return originalPrice * (1 + margin / 100)
  }

  const getCleanImageUrl = (image: string | string[] | undefined): string | null => {
    if (!image) return null
    if (typeof image === 'string') {
      try {
        const parsed = JSON.parse(image)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0]
        }
        return image
      } catch {
        return image
      }
    } else if (Array.isArray(image) && image.length > 0) {
      return image[0]
    }
    return null
  }

  // ✅ Extraire les informations structurées de la description ET des variants
  const extractProductInfo = (description: string, product?: DraftProduct) => {
    const info = {
      colors: [] as Array<{ name: string; image?: string }>,
      sizes: [] as string[],
      materials: [] as { label: string; value: string }[],
      otherInfo: [] as { label: string; value: string }[]
    }

    // ==================== EXTRACTION DES COULEURS ====================
    
    // ✅ PRIORITÉ 1 : Extraire depuis la description markdown
    if (description) {
      // Pattern 1 : Format markdown avec ### 🎨 Couleurs disponibles
      let colorMatch = description.match(/### 🎨 Couleurs disponibles\n([\s\S]*?)(?=\n\n|###|$)/i)
      
      // Pattern 2 : Format "Color:" ou "Couleur:" (format simple)
      // Chercher aussi après "Color:" même s'il y a d'autres mots avant (ex: "Lining material: PU Color: ...")
      if (!colorMatch) {
        // Chercher "Color:" suivi de tout jusqu'à la fin de la ligne ou jusqu'au prochain label (ex: "Heel height:")
        colorMatch = description.match(/Color:\s*([^\n]+?)(?=\s+[A-Z][a-z]+:|$)/i) || 
                     description.match(/Couleur:\s*([^\n]+?)(?=\s+[A-Z][a-z]+:|$)/i) ||
                     description.match(/Colour:\s*([^\n]+?)(?=\s+[A-Z][a-z]+:|$)/i) ||
                     description.match(/[^a-z]Color:\s*([^\n]+?)(?=\s+[A-Z][a-z]+:|$)/i) // Chercher "Color:" même après d'autres mots
      }
      
      if (colorMatch && colorMatch[1]) {
        const colorsText = colorMatch[1]
        
        // Déterminer si c'est le format markdown (avec lignes) ou format simple (avec virgules)
        const isMarkdownFormat = colorsText.includes('\n')
        
        let colorNames: string[] = []
        
        if (isMarkdownFormat) {
          // Format markdown : lignes séparées par \n
          colorNames = colorsText
            .split('\n')
            .map(line => {
              let color = line.trim().replace(/^-\s*/, '') // Enlever le "- " au début
              
              // ❌ EXCLURE les lignes qui ne sont pas des couleurs
              // Exclure les lignes qui contiennent "**" (markdown bold)
              if (color.includes('**')) return null
              // Exclure les lignes qui contiennent ":" (labels)
              if (color.includes(':')) return null
              // Exclure les lignes trop longues (probablement pas des couleurs)
              if (color.length > 30) return null
              
              // Nettoyer les codes (ex: "8808 leather red" → "leather red")
              color = color.replace(/^[0-9]+[-_\s]*/i, '')
              color = color.replace(/[-_\s]*[0-9]+$/i, '')
              color = color.replace(/[-_\s]+/g, ' ').trim()
              
              // Vérifier que c'est bien une couleur (contient des lettres, pas seulement des symboles)
              if (!/^[a-zA-Z\s]+$/.test(color)) return null
              
              // ❌ EXCLURE les tailles qui sont extraites comme couleurs
              const sizePatterns = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xi', 'xii', 'xiii']
              const colorLower = color.toLowerCase().trim()
              
              // Si c'est une taille pure (ex: "M", "L", "XL", "XI")
              if (sizePatterns.includes(colorLower)) {
                return null
              }
              
              // Si c'est une taille avec un préfixe/suffixe (ex: "Size M", "M Size")
              if (colorLower.match(/^(size|taille)\s*[xslm]+$/i) || 
                  colorLower.match(/^[xslm]+\s*(size|taille)$/i)) {
                return null
              }
              
              // Capitaliser la première lettre
              if (color) {
                color = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
              }
              return color
            })
            .filter((c): c is string => c !== null && c !== undefined && c.length > 0 && c.length < 30)
        } else {
          // Format simple : séparé par virgules (ex: "white gold Q911, yellow gold Q912")
          // OU format avec détails : "Gold White Diamond (width 6mm), Platinum White Diamond (width 6mm)"
          // OU format simple : "Black, Brown, Khaki"
          // OU format avec détails : "Brown single lining, Black single lining, Black fur lining, Brown fur lining"
          colorNames = colorsText
            .split(',')
            .map(color => {
              let cleanColor = color.trim()
              
              // Si la couleur contient "lining", "material", "fur", etc., extraire seulement la partie couleur
              // Ex: "Brown single lining" → "Brown"
              // Ex: "Black fur lining" → "Black"
              // Ex: "Brown single" → "Brown"
              // Ex: "Black fur" → "Black"
              const lowerColor = cleanColor.toLowerCase()
              if (lowerColor.includes('lining') || 
                  lowerColor.includes('material') ||
                  lowerColor.includes('fur') ||
                  lowerColor.includes('single') ||
                  lowerColor.includes('double') ||
                  lowerColor.includes('triple')) {
                // Extraire le premier mot (la couleur) avant "single", "double", "triple", "fur", "lining", "material", etc.
                // Pattern: "Brown single lining" → "Brown"
                // Pattern: "Black fur" → "Black"
                // Pattern: "Brown single" → "Brown"
                const colorMatch = cleanColor.match(/^([a-zA-Z]+)\s+(?:single|double|triple|fur|lining|material)/i)
                if (colorMatch && colorMatch[1]) {
                  cleanColor = colorMatch[1].trim()
                } else {
                  // Si pas de match, prendre le premier mot seulement
                  cleanColor = cleanColor.split(/\s+/)[0]
                }
              }
              
              // Enlever les détails entre parenthèses (ex: "(width 6mm)", "(length cm)", etc.)
              cleanColor = cleanColor.replace(/\s*\([^)]*\)/g, '') // Enlever tout ce qui est entre parenthèses
              
              // Nettoyer les codes (ex: "white gold Q911" → "white gold")
              // Enlever les codes comme Q911, Q912, etc.
              cleanColor = cleanColor.replace(/\s*[A-Z]\d+\s*/gi, '') // Enlever "Q911", "Q912", etc.
              cleanColor = cleanColor.replace(/^[0-9]+[-_\s]*/i, '')
              cleanColor = cleanColor.replace(/[-_\s]*[0-9]+$/i, '')
              
              // Enlever les unités de mesure (mm, cm, inches, etc.)
              cleanColor = cleanColor.replace(/\s*\d+\s*(mm|cm|inches?)\s*/gi, '')
              
              cleanColor = cleanColor.replace(/[-_\s]+/g, ' ').trim()
              
              // Vérifier que c'est bien une couleur (contient des lettres)
              if (!/^[a-zA-Z\s]+$/.test(cleanColor) || cleanColor.length === 0) return null
              
              const cleanColorLower = cleanColor.toLowerCase().trim()
              
              // ❌ EXCLURE les tailles qui sont extraites comme couleurs
              const sizePatterns = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xi', 'xii', 'xiii']
              
              // Si c'est une taille pure (ex: "M", "L", "XL", "XI")
              if (sizePatterns.includes(cleanColorLower)) {
                return null
              }
              
              // Si c'est une taille avec un préfixe/suffixe (ex: "Size M", "M Size")
              if (cleanColorLower.match(/^(size|taille)\s*[xslm]+$/i) || 
                  cleanColorLower.match(/^[xslm]+\s*(size|taille)$/i)) {
                return null
              }
              
              // ❌ EXCLURE les mots qui ne sont pas des couleurs
              const nonColorWords = [
                'warm', 'cold', 'hot', 'cool', 'single', 'double', 'triple',
                'lining', 'material', 'inner', 'outer', 'upper', 'lower',
                'height', 'width', 'length', 'depth', 'size', 'sizes',
                'style', 'type', 'method', 'process', 'applicable', 'popular',
                'element', 'shape', 'form', 'heel', 'shaft', 'sole', 'toe',
                'sports', 'craft', 'mouth', 'shoe', 'packing', 'list'
              ]
              
              // Si c'est un mot non-couleur pur (ex: "Warm", "Single")
              if (nonColorWords.includes(cleanColorLower)) {
                return null
              }
              
              // Si c'est un mot non-couleur avec d'autres mots (ex: "Warm Lining")
              const words = cleanColorLower.split(/\s+/)
              if (words.length === 1 && nonColorWords.some(word => cleanColorLower.includes(word))) {
                return null
              }
              
              // Si tous les mots sont des mots non-couleur, exclure
              if (words.every(word => nonColorWords.includes(word))) {
                return null
              }
              
              // Capitaliser chaque mot (sauf les mots courts comme "and", "or", etc.)
              const shortWords = ['and', 'or', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with']
              cleanColor = cleanColor
                .split(' ')
                .map(word => {
                  const lowerWord = word.toLowerCase()
                  if (shortWords.includes(lowerWord)) {
                    return lowerWord
                  }
                  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                })
                .join(' ')
              
              return cleanColor
            })
            .filter((c): c is string => c !== null && c !== undefined && c.length > 0 && c.length < 50) // Augmenter la limite à 50 pour les couleurs complexes
        }
        
        // ✅ PRIORITÉ 0 : Extraire depuis le champ variants JSON (pour les produits CJ sans ProductVariant)
        // Ex: variantKey "Black Zone2-S", "Blue Zone4-M", "Red Zone8-XL"
        if (product?.variants && typeof product.variants === 'string' && product.variants.length > 0) {
          try {
            const variantsArray = JSON.parse(product.variants)
            if (Array.isArray(variantsArray) && variantsArray.length > 0) {
              console.log('🔍 [DEBUG] Parsing variants JSON:', variantsArray.length)
              
              // Map pour éviter les doublons
              const colorImageMap = new Map<string, string>()
              
              variantsArray.forEach((v: any) => {
                if (!v.variantKey || !v.variantImage) return
                
                let extractedColor = ''
                
                // Pattern : "Black Zone2-S", "Blue Zone4-M", "Red Zone8-XL"
                // Extraction : UNIQUEMENT le mot avant "Zone"
                const zoneMatch = v.variantKey.match(/^([A-Za-z]+)\s*Zone\d+/i)
                if (zoneMatch && zoneMatch[1]) {
                  extractedColor = zoneMatch[1].trim()
                  console.log(`✅ [DEBUG] Zone pattern: "${v.variantKey}" → "${extractedColor}"`)
                } else {
                  // Pattern standard : "Brown-35", "Black Single Liner-35"
                  const firstWord = v.variantKey.split(/[-\s]/)[0]
                  if (firstWord && /^[A-Za-z]+$/.test(firstWord)) {
                    extractedColor = firstWord.trim()
                    console.log(`✅ [DEBUG] Standard pattern: "${v.variantKey}" → "${extractedColor}"`)
                  }
                }
                
                // Vérifier que c'est une couleur connue
                if (extractedColor) {
                  const knownColors = ['black', 'white', 'brown', 'gray', 'grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'orange', 'khaki', 'beige', 'navy', 'tan', 'burgundy', 'wine', 'ivory', 'cream', 'gold', 'silver', 'platinum']
                  const colorLower = extractedColor.toLowerCase()
                  
                  if (knownColors.includes(colorLower) && !colorImageMap.has(colorLower)) {
                    colorImageMap.set(colorLower, v.variantImage)
                    console.log(`✅ [DEBUG] Color added from JSON: "${extractedColor}" → image`)
                  }
                }
              })
              
              // Ajouter les couleurs trouvées
              colorImageMap.forEach((image, colorLower) => {
                const colorName = colorLower.charAt(0).toUpperCase() + colorLower.slice(1)
                info.colors.push({ name: colorName, image })
              })
              
              // Si on a trouvé des couleurs dans le JSON, on peut retourner ici
              if (info.colors.length > 0) {
                console.log(`✅ [DEBUG] ${info.colors.length} couleurs extraites du JSON`)
                return info
              }
            }
          } catch (e) {
            console.error('❌ [DEBUG] Erreur parsing variants JSON:', e)
          }
        }
        
        // Essayer d'associer avec les images des variants si disponibles
        // OU utiliser les images de la galerie du produit comme fallback
        const productImages: string[] = []
        
        // Récupérer les images du produit (galerie)
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
          product.images.forEach(img => {
            if (typeof img === 'string') {
              productImages.push(img)
            } else if (img && typeof img === 'object' && 'url' in img) {
              productImages.push(img.url)
            }
          })
        } else if (product?.image) {
          try {
            const parsed = JSON.parse(product.image)
            if (Array.isArray(parsed)) {
              productImages.push(...parsed)
            } else {
              productImages.push(product.image)
            }
          } catch {
            productImages.push(product.image)
          }
        }
        
        console.log('🔍 [DEBUG] Product images available:', productImages.length)
        
        // ✅ Fonction pour extraire la couleur depuis le nom de fichier d'image
        const extractColorFromImageUrl = (imageUrl: string): string[] => {
          const colors: string[] = []
          const urlLower = imageUrl.toLowerCase()
          
          // Liste des couleurs communes à chercher dans l'URL
          const colorKeywords: { [key: string]: string[] } = {
            'black': ['black', 'noir', 'noire', 'bk'],
            'white': ['white', 'blanc', 'blanche', 'wt', 'wht'],
            'brown': ['brown', 'marron', 'brun', 'brune', 'br'],
            'gray': ['gray', 'grey', 'gris', 'grise', 'gy'],
            'blue': ['blue', 'bleu', 'bleue', 'bl'],
            'red': ['red', 'rouge', 'rd'],
            'green': ['green', 'vert', 'verte', 'gr'],
            'yellow': ['yellow', 'jaune', 'yl'],
            'pink': ['pink', 'rose', 'pk'],
            'purple': ['purple', 'violet', 'violette', 'pp'],
            'orange': ['orange', 'or'],
            'khaki': ['khaki', 'kaki', 'kh'],
            'beige': ['beige', 'bg'],
            'navy': ['navy', 'nv'],
            'tan': ['tan', 'tn'],
            'burgundy': ['burgundy', 'burg', 'bg'],
            'wine': ['wine', 'wn'],
            'ivory': ['ivory', 'iv'],
            'cream': ['cream', 'cr'],
            'gold': ['gold', 'or', 'doré', 'dorée', 'gd'],
            'silver': ['silver', 'argent', 'argenté', 'argentée', 'sl'],
            'platinum': ['platinum', 'platine', 'pt'],
          }
          
          // Chercher chaque couleur dans l'URL
          for (const [colorName, keywords] of Object.entries(colorKeywords)) {
            for (const keyword of keywords) {
              // Chercher le mot-clé dans l'URL (avec séparateurs pour éviter les faux positifs)
              // Pattern 1 : Avec séparateurs (ex: "product_black_001.jpg", "product-black-001.jpg")
              const regex1 = new RegExp(`[_-]${keyword}[_-]|[_-]${keyword}$|^${keyword}[_-]`, 'i')
              // Pattern 2 : Dans le nom de fichier (ex: "blackboots.jpg", "brownshoes.jpg")
              const regex2 = new RegExp(`\\b${keyword}\\b`, 'i')
              // Pattern 3 : Dans le chemin (ex: "/black/", "/brown/")
              const regex3 = new RegExp(`/${keyword}/|/${keyword}$`, 'i')
              
              if (regex1.test(urlLower) || regex2.test(urlLower) || regex3.test(urlLower)) {
                colors.push(colorName)
                break // Une seule fois par couleur
              }
            }
          }
          
          return colors
        }
        
        if (product?.productVariants && product.productVariants.length > 0) {
          console.log('🔍 [DEBUG] Processing variants:', product.productVariants.length)
          
          // Créer une map couleur → image depuis les variants
          const colorMap = new Map<string, string>()
          const variantsWithImages: Array<{ color: string; image: string }> = []
          
          product.productVariants.forEach((variant, idx) => {
            console.log(`🔍 [DEBUG] Variant ${idx}:`, { 
              name: variant.name,
              hasImage: !!variant.image, 
              image: variant.image?.substring(0, 50),
              properties: variant.properties 
            })
            
            if (!variant.image) {
              console.log(`⚠️ [DEBUG] Variant ${idx} n'a pas d'image`)
              return // Ignorer les variants sans image
            }
            
            try {
              let variantColor = ''
              
              // ✅ PRIORITÉ 1 : Extraire la couleur depuis le nom du variant
              // Ex: "Brown Single Liner-35" → "Brown"
              // Ex: "Black Single Liner-35" → "Black"
              // Ex: "Side Zipper ... Black 35" → "Black"
              // Ex: "Black-35" → "Black"
              // Ex: "Brown-35" → "Brown"
              // Ex: "Khaki-35" → "Khaki"
              if (variant.name) {
                const variantName = variant.name.trim()
                
                // Pattern 1 : Format "Couleur-Taille" ou "Couleur Taille" (ex: "Black-35", "Black 35")
                let colorMatch = variantName.match(/^([a-zA-Z]+)[-\s]+(\d+)$/i)
                if (colorMatch && colorMatch[1]) {
                  variantColor = colorMatch[1].trim()
                  console.log(`✅ [DEBUG] Couleur extraite (format Couleur-Taille): "${variant.name}" → "${variantColor}"`)
                } else {
                  // Pattern 2 : Format "Couleur Single/Double/Triple/Fur/Liner/Lining/Material"
                  colorMatch = variantName.match(/^([a-zA-Z]+)\s+(?:single|double|triple|fur|liner|lining|material)/i)
                  if (colorMatch && colorMatch[1]) {
                    variantColor = colorMatch[1].trim()
                    console.log(`✅ [DEBUG] Couleur extraite (format Couleur-Type): "${variant.name}" → "${variantColor}"`)
                  } else {
                    // Pattern 3 : Format "Nom complet ... Couleur Taille" (ex: "Side Zipper ... Black 35")
                    // Chercher la couleur avant la taille (nombre) à la fin
                    colorMatch = variantName.match(/([a-zA-Z]+)\s+(\d+)$/i)
                    if (colorMatch && colorMatch[1]) {
                      const possibleColor = colorMatch[1].trim()
                      // Vérifier que c'est bien une couleur connue (pas un mot générique)
                      const knownColors = ['black', 'white', 'brown', 'gray', 'grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'orange', 'khaki', 'beige', 'navy', 'tan', 'burgundy', 'wine', 'ivory', 'cream', 'gold', 'silver', 'platinum']
                      if (knownColors.includes(possibleColor.toLowerCase())) {
                        variantColor = possibleColor
                        console.log(`✅ [DEBUG] Couleur extraite (format Nom-Couleur-Taille): "${variant.name}" → "${variantColor}"`)
                      }
                    }
                    
                    // Pattern 4 : Si pas de match, prendre le premier mot (probablement la couleur)
                    if (!variantColor) {
                      const firstWord = variantName.split(/\s+/)[0]
                      // Vérifier que c'est bien une couleur (pas un nombre)
                      if (firstWord && !/^[0-9]+$/.test(firstWord)) {
                        variantColor = firstWord
                        console.log(`✅ [DEBUG] Couleur extraite (premier mot): "${variant.name}" → "${variantColor}"`)
                      }
                    }
                  }
                }
              }
              
              // ✅ PRIORITÉ 2 : Essayer d'extraire la couleur depuis properties
              if (!variantColor && variant.properties) {
                const properties = typeof variant.properties === 'string' 
                  ? JSON.parse(variant.properties) 
                  : variant.properties
                
                variantColor = (properties.value1 || '').trim()
                
                // Vérifier que c'est bien une couleur (pas un nombre ou une taille)
                if (variantColor && 
                    !/^[0-9]+(-[0-9]+)?(\.[0-9])?$/.test(variantColor) && // Pas un nombre ou plage
                    !/^(XS|S|M|L|XL|XXL|XXXL)$/i.test(variantColor)) { // Pas une taille texte
                  
                  console.log(`✅ [DEBUG] Couleur extraite depuis properties: "${variantColor}"`)
                } else {
                  variantColor = '' // Réinitialiser si ce n'est pas une couleur valide
                }
              }
              
              // Ajouter à la map si on a trouvé une couleur
              if (variantColor) {
                const colorLower = variantColor.toLowerCase()
                // ✅ IMPORTANT : Si la couleur existe déjà, garder la première image trouvée
                // Mais si on a plusieurs variants de la même couleur, on peut les stocker tous
                if (!colorMap.has(colorLower)) {
                  colorMap.set(colorLower, variant.image)
                  variantsWithImages.push({ color: variantColor, image: variant.image })
                  console.log(`✅ [DEBUG] Variant ajouté à la map: "${variantColor}" → image (variant: "${variant.name}")`)
                } else {
                  // Si la couleur existe déjà, on peut quand même garder l'image pour référence
                  // Mais on garde la première trouvée comme image principale
                  console.log(`ℹ️ [DEBUG] Variant "${variantColor}" déjà dans la map, image principale: ${colorMap.get(colorLower)?.substring(0, 50)}`)
                }
              } else {
                // Si pas de couleur trouvée, garder quand même l'image pour distribution
                if (variant.image) {
                  variantsWithImages.push({ color: '', image: variant.image })
                  console.log(`⚠️ [DEBUG] Variant sans couleur: "${variant.name}"`)
                }
              }
            } catch (e) {
              console.error(`❌ [DEBUG] Erreur traitement variant ${idx}:`, e)
              // Si erreur de parsing, garder quand même l'image
              if (variant.image) {
                variantsWithImages.push({ color: '', image: variant.image })
              }
            }
          })
          
          // Associer les couleurs de la description avec les images des variants
          const colorMapEntries = Array.from(colorMap.entries())
          const allVariantImages = variantsWithImages.map(v => v.image).filter(Boolean)
          
          // ✅ Créer une liste ordonnée des variants avec leurs couleurs et images
          const orderedVariants: Array<{ color: string; image: string; index: number }> = []
          product.productVariants.forEach((variant, variantIdx) => {
            if (!variant.image) return
            
            let variantColor = ''
            
            // ✅ PRIORITÉ 1 : Extraire la couleur depuis le nom du variant
            // Ex: "Black-35" → "black"
            // Ex: "Brown 35" → "brown"
            // Ex: "Side Zipper ... Black 35" → "black"
            // Ex: "Khaki-35" → "khaki"
            if (variant.name) {
              const variantName = variant.name.trim()
              
              // Pattern 1 : Format "Couleur-Taille" ou "Couleur Taille" (ex: "Black-35", "Black 35")
              let colorMatch = variantName.match(/^([a-zA-Z]+)[-\s]+(\d+)$/i)
              if (colorMatch && colorMatch[1]) {
                variantColor = colorMatch[1].trim().toLowerCase()
              } else {
                // Pattern 2 : Format "Couleur Single/Double/Triple/Fur/Liner/Lining/Material"
                colorMatch = variantName.match(/^([a-zA-Z]+)\s+(?:single|double|triple|fur|liner|lining|material)/i)
                if (colorMatch && colorMatch[1]) {
                  variantColor = colorMatch[1].trim().toLowerCase()
                } else {
                  // Pattern 3 : Format "Nom complet ... Couleur Taille" (ex: "Side Zipper ... Black 35")
                  colorMatch = variantName.match(/([a-zA-Z]+)\s+(\d+)$/i)
                  if (colorMatch && colorMatch[1]) {
                    const possibleColor = colorMatch[1].trim().toLowerCase()
                    // Vérifier que c'est bien une couleur connue
                    const knownColors = ['black', 'white', 'brown', 'gray', 'grey', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'orange', 'khaki', 'beige', 'navy', 'tan', 'burgundy', 'wine', 'ivory', 'cream', 'gold', 'silver', 'platinum']
                    if (knownColors.includes(possibleColor)) {
                      variantColor = possibleColor
                    }
                  }
                  
                  // Pattern 4 : Si pas de match, prendre le premier mot
                  if (!variantColor) {
                    const firstWord = variantName.split(/\s+/)[0]
                    if (firstWord && !/^[0-9]+$/.test(firstWord)) {
                      variantColor = firstWord.toLowerCase()
                    }
                  }
                }
              }
            }
            
            // ✅ PRIORITÉ 2 : Essayer d'extraire depuis properties
            if (!variantColor && variant.properties) {
              try {
                const properties = typeof variant.properties === 'string' 
                  ? JSON.parse(variant.properties) 
                  : variant.properties
                const colorFromProps = (properties.value1 || '').trim().toLowerCase()
                // Vérifier que c'est bien une couleur (pas un nombre ou une taille)
                if (colorFromProps && 
                    !/^[0-9]+(-[0-9]+)?(\.[0-9])?$/.test(colorFromProps) &&
                    !/^(xs|s|m|l|xl|xxl|xxxl)$/i.test(colorFromProps)) {
                  variantColor = colorFromProps
                }
              } catch (e) {
                // Ignorer les erreurs
              }
            }
            
            orderedVariants.push({
              color: variantColor,
              image: variant.image,
              index: variantIdx
            })
          })
          
          console.log('🔍 [DEBUG] Color map entries:', colorMapEntries)
          console.log('🔍 [DEBUG] Ordered variants:', orderedVariants.map(v => ({ color: v.color, hasImage: !!v.image })))
          console.log('🔍 [DEBUG] All variant images:', allVariantImages.length, allVariantImages.map(img => img?.substring(0, 50)))
          console.log('🔍 [DEBUG] Color names from description:', colorNames)
          
          // ✅ Créer un Set pour suivre les variants déjà utilisés (partagé entre toutes les couleurs)
          const usedVariantIndices = new Set<number>()
          const usedVariantImages = new Set<string>()
          
          // ✅ Mots-clés de couleur (défini une seule fois)
          const colorKeywords: { [key: string]: string[] } = {
            'white': ['white', 'blanc', 'blanche', 'diamond'],
            'black': ['black', 'noir', 'noire'],
            'gray': ['gray', 'grey', 'gris', 'grise', 'gray blue'],
            'red': ['red', 'rouge'],
            'blue': ['blue', 'bleu', 'bleue'],
            'green': ['green', 'vert', 'verte', 'army green'],
            'yellow': ['yellow', 'jaune', 'gold'],
            'pink': ['pink', 'rose'],
            'purple': ['purple', 'violet', 'violette'],
            'orange': ['orange'],
            'brown': ['brown', 'marron', 'brun', 'brune'],
            'gold': ['gold', 'or', 'doré', 'dorée'],
            'platinum': ['platinum', 'platine'],
            'silver': ['silver', 'argent', 'argenté', 'argentée'],
          }
          
          info.colors = colorNames.map((colorName, idx) => {
            const colorNameLower = colorName.toLowerCase()
            
            // 1. ✅ PRIORITÉ ABSOLUE : Chercher un variant avec cette couleur exacte et utiliser son image
            // Ex: "Black" → chercher un variant avec name="Black-170" ou "Black 175" et utiliser son image
            if (product?.productVariants && product.productVariants.length > 0) {
              for (const variant of product.productVariants) {
                if (!variant.image || !variant.name) continue
                
                // Extraire la couleur depuis le nom du variant
                const variantName = variant.name.trim()
                let variantColorFromName = ''
                
                // Pattern 1 : "Black-170" ou "Black 175"
                const colorMatch = variantName.match(/^([a-zA-Z]+)[-\s]+(\d+)$/i)
                if (colorMatch && colorMatch[1]) {
                  variantColorFromName = colorMatch[1].trim().toLowerCase()
                } else {
                  // Pattern 2 : "Black Single Liner-35"
                  const colorMatch2 = variantName.match(/^([a-zA-Z]+)\s+(?:single|double|triple|fur|liner|lining|material)/i)
                  if (colorMatch2 && colorMatch2[1]) {
                    variantColorFromName = colorMatch2[1].trim().toLowerCase()
                  } else {
                    // Pattern 3 : Premier mot
                    const firstWord = variantName.split(/\s+/)[0]
                    if (firstWord && !/^[0-9]+$/.test(firstWord)) {
                      variantColorFromName = firstWord.toLowerCase()
                    }
                  }
                }
                
                // Si la couleur du variant correspond exactement à la couleur recherchée
                if (variantColorFromName === colorNameLower && !usedVariantImages.has(variant.image)) {
                  usedVariantImages.add(variant.image)
                  console.log(`✅ [DEBUG] Correspondance EXACTE variant: "${colorName}" → variant "${variant.name}" avec image directe`)
                  return { name: colorName, image: variant.image }
                }
              }
            }
            
            // 2. Chercher une correspondance exacte ou partielle dans la map
            for (const [variantColor, variantImage] of colorMapEntries) {
              const variantColorLower = variantColor.toLowerCase()
              
              // Correspondance exacte
              if (variantColorLower === colorNameLower) {
                if (!usedVariantImages.has(variantImage)) {
                  usedVariantImages.add(variantImage)
                  console.log(`✅ [DEBUG] Correspondance exacte: "${colorName}" → variant "${variantColor}"`)
                  return { name: colorName, image: variantImage }
                }
              }
              
              // Correspondance partielle (ex: "leather red" contient "red")
              if (variantColorLower.includes(colorNameLower) || 
                  colorNameLower.includes(variantColorLower)) {
                if (!usedVariantImages.has(variantImage)) {
                  usedVariantImages.add(variantImage)
                  console.log(`✅ [DEBUG] Correspondance partielle: "${colorName}" → variant "${variantColor}"`)
                  return { name: colorName, image: variantImage }
                }
              }
              
              // Correspondance par mots-clés communs (couleurs de base)
              // Extraire les mots-clés de la couleur (ex: "Gold White Diamond" → ["gold", "white", "diamond"])
              const colorNameWords = colorNameLower.split(/\s+/).filter(w => w.length > 2)
              const variantColorWords = variantColorLower.split(/\s+/).filter(w => w.length > 2)
              
              // Vérifier si au moins un mot-clé commun est présent
              const hasCommonKeyword = colorNameWords.some(word => {
                // Chercher dans les mots-clés de couleur
                for (const [key, synonyms] of Object.entries(colorKeywords)) {
                  if (synonyms.some(syn => word.includes(syn) || syn.includes(word))) {
                    // Vérifier si le variant contient aussi ce mot-clé
                    return variantColorWords.some(vWord => 
                      synonyms.some(syn => vWord.includes(syn) || syn.includes(vWord))
                    )
                  }
                }
                // Vérifier correspondance directe de mots
                return variantColorWords.some(vWord => word === vWord || word.includes(vWord) || vWord.includes(word))
              })
              
              if (hasCommonKeyword && !usedVariantImages.has(variantImage)) {
                usedVariantImages.add(variantImage)
                console.log(`✅ [DEBUG] Correspondance par mots-clés: "${colorName}" → variant "${variantColor}"`)
                return { name: colorName, image: variantImage }
              }
              
              // Fallback : correspondance par mots-clés simples
              const colorNameKeywords = colorKeywords[colorNameLower] || []
              const variantColorKeywords = colorKeywords[variantColorLower] || []
              
              if ((colorNameKeywords.some(k => variantColorLower.includes(k)) ||
                  variantColorKeywords.some(k => colorNameLower.includes(k))) &&
                  !usedVariantImages.has(variantImage)) {
                usedVariantImages.add(variantImage)
                console.log(`✅ [DEBUG] Correspondance par mots-clés simples: "${colorName}" → variant "${variantColor}"`)
                return { name: colorName, image: variantImage }
              }
            }
            
            // 2. Chercher dans les variants ordonnés par correspondance de couleur
            for (const variant of orderedVariants) {
              const variantColorLower = variant.color.toLowerCase()
              
              // Correspondance exacte ou partielle avec la couleur du variant
              if (variantColorLower && (
                  variantColorLower === colorNameLower ||
                  variantColorLower.includes(colorNameLower) ||
                  colorNameLower.includes(variantColorLower)
                )) {
                // Vérifier si ce variant n'a pas déjà été utilisé pour une autre couleur
                if (!usedVariantIndices.has(variant.index) && !usedVariantImages.has(variant.image)) {
                  usedVariantIndices.add(variant.index)
                  usedVariantImages.add(variant.image)
                  console.log(`✅ [DEBUG] Correspondance avec variant ordonné: "${colorName}" → variant[${variant.index}] "${variant.color}"`)
                  return { name: colorName, image: variant.image }
                }
              }
            }
            
            // 3. Si pas de correspondance, utiliser l'ordre des variants (par index)
            // Utiliser l'index de la couleur pour sélectionner le variant correspondant
            // Cela garantit que la première couleur de la description correspond au premier variant, etc.
            if (orderedVariants.length > 0) {
              // Trouver le premier variant non utilisé
              let selectedVariant = orderedVariants.find(v => !usedVariantIndices.has(v.index) && !usedVariantImages.has(v.image))
              
              // Si tous les variants sont utilisés, utiliser l'ordre cyclique
              if (!selectedVariant) {
                const variantIndex = idx % orderedVariants.length
                selectedVariant = orderedVariants[variantIndex]
              } else {
                usedVariantIndices.add(selectedVariant.index)
                usedVariantImages.add(selectedVariant.image)
              }
              
              console.log(`✅ [DEBUG] Distribution par ordre pour "${colorName}": variant[${selectedVariant.index}] (couleur: "${selectedVariant.color}")`)
              return { name: colorName, image: selectedVariant.image }
            }
            
            // 3. Chercher dans les images de la galerie par correspondance de couleur dans l'URL
            // ✅ Les images de la galerie sont souvent dans l'ordre des couleurs
            // Ex: [image_brown, image_black, image_khaki] pour couleurs [Brown, Black, Khaki]
            if (productImages.length > 0) {
              const colorNameLower = colorName.toLowerCase()
              
              // ✅ PRIORITÉ 1 : Chercher d'abord une correspondance exacte dans l'URL
              for (const imageUrl of productImages) {
                if (usedVariantImages.has(imageUrl)) continue
                
                const imageColors = extractColorFromImageUrl(imageUrl)
                
                // Correspondance exacte (ex: "black" = "black")
                if (imageColors.some(imgColor => {
                  const imgColorLower = imgColor.toLowerCase()
                  return imgColorLower === colorNameLower
                })) {
                  usedVariantImages.add(imageUrl)
                  console.log(`✅ [DEBUG] Correspondance EXACTE par URL pour "${colorName}": image contient la couleur (${imageColors.join(', ')})`)
                  return { name: colorName, image: imageUrl }
                }
              }
              
              // ✅ PRIORITÉ 2 : Correspondance partielle (ex: "black" contient "bl" ou "noir")
              for (const imageUrl of productImages) {
                if (usedVariantImages.has(imageUrl)) continue
                
                const imageColors = extractColorFromImageUrl(imageUrl)
                
                // Correspondance partielle
                if (imageColors.some(imgColor => {
                  const imgColorLower = imgColor.toLowerCase()
                  return imgColorLower.includes(colorNameLower) ||
                         colorNameLower.includes(imgColorLower)
                })) {
                  usedVariantImages.add(imageUrl)
                  console.log(`✅ [DEBUG] Correspondance PARTIELLE par URL pour "${colorName}": image contient la couleur (${imageColors.join(', ')})`)
                  return { name: colorName, image: imageUrl }
                }
              }
              
              // ✅ PRIORITÉ 3 : Utiliser l'ordre des images de la galerie
              // Si les couleurs sont dans l'ordre [Brown, Black, Khaki] et les images aussi
              // Alors la première couleur = première image, etc.
              // Mais seulement si on n'a pas trouvé de correspondance par URL
              const unusedImages = productImages.filter(img => !usedVariantImages.has(img))
              if (unusedImages.length > 0) {
                // Utiliser l'index de la couleur pour sélectionner l'image correspondante
                const imageIndex = idx % unusedImages.length
                const selectedImage = unusedImages[imageIndex]
                usedVariantImages.add(selectedImage)
                
                // Vérifier si l'image correspond à la couleur
                const selectedImageColors = extractColorFromImageUrl(selectedImage)
                const hasColorMatch = selectedImageColors.some(imgColor => 
                  imgColor.toLowerCase() === colorNameLower
                )
                
                if (!hasColorMatch && selectedImageColors.length > 0) {
                  console.warn(`⚠️ [DEBUG] Image galerie sélectionnée pour "${colorName}" contient "${selectedImageColors.join(', ')}" au lieu de "${colorName}" (ordre: ${imageIndex}/${unusedImages.length})`)
                } else {
                  console.log(`✅ [DEBUG] Image galerie sélectionnée pour "${colorName}": image ${imageIndex}/${unusedImages.length} (couleurs détectées: ${selectedImageColors.join(', ') || 'aucune'})`)
                }
                
                return { name: colorName, image: selectedImage }
              }
            }
            
            // 4. Fallback : distribuer les images de manière cyclique
            if (allVariantImages.length > 0) {
              const imageIndex = idx % allVariantImages.length
              console.log(`✅ [DEBUG] Distribution cyclique pour "${colorName}": image ${imageIndex}/${allVariantImages.length}`)
              return { name: colorName, image: allVariantImages[imageIndex] }
            }
            
            // 5. Fallback : utiliser les images de la galerie du produit (par ordre)
            // ⚠️ ATTENTION : Cette méthode n'est pas fiable car on ne sait pas si l'ordre correspond
            if (productImages.length > 0) {
              // Trouver la première image non utilisée
              let selectedImage = productImages.find(img => !usedVariantImages.has(img))
              
              // Si toutes les images sont utilisées, utiliser l'ordre cyclique
              if (!selectedImage) {
                const imageIndex = idx % productImages.length
                selectedImage = productImages[imageIndex]
              } else {
                usedVariantImages.add(selectedImage)
              }
              
              // 🔍 Analyser l'URL de l'image sélectionnée pour vérifier si elle correspond
              const selectedImageColors = extractColorFromImageUrl(selectedImage)
              const colorNameLower = colorName.toLowerCase()
              const hasColorMatch = selectedImageColors.some(imgColor => 
                imgColor.toLowerCase() === colorNameLower
              )
              
              if (!hasColorMatch && selectedImageColors.length > 0) {
                console.warn(`⚠️ [DEBUG] ATTENTION: Image sélectionnée pour "${colorName}" contient "${selectedImageColors.join(', ')}" au lieu de "${colorName}"`)
                console.warn(`⚠️ [DEBUG] URL de l'image: ${selectedImage.substring(0, 100)}`)
              }
              
              console.log(`✅ [DEBUG] Utilisation image galerie pour "${colorName}": image ${productImages.indexOf(selectedImage)}/${productImages.length} (couleurs détectées: ${selectedImageColors.join(', ') || 'aucune'})`)
              return { name: colorName, image: selectedImage }
            }
            
            // 4. Fallback final : aucune image
            console.log(`⚠️ [DEBUG] Aucune image trouvée pour "${colorName}"`)
            return { name: colorName, image: undefined }
          })
          
          // 🔍 DEBUG : Log final des couleurs avec images
          console.log('🔍 [DEBUG] Couleurs finales avec images:', info.colors.map(c => ({ 
            name: c.name, 
            hasImage: !!c.image, 
            image: c.image?.substring(0, 50) 
          })))
        } else {
          // Pas de variants : utiliser les images de la galerie du produit
          if (productImages.length > 0) {
            console.log('✅ [DEBUG] Pas de variants, utilisation images galerie:', productImages.length)
            info.colors = colorNames.map((name, idx) => ({
              name,
              image: productImages[idx % productImages.length]
            }))
          } else {
            // Pas de variants ni d'images, juste les noms
            console.log('⚠️ [DEBUG] Pas de variants ni d\'images disponibles')
            info.colors = colorNames.map(name => ({ name }))
          }
        }
      }
    }
    
    // ✅ FALLBACK : Si pas de couleurs dans la description, chercher dans les variants
    if (info.colors.length === 0 && product?.productVariants && product.productVariants.length > 0) {
      const colorMap = new Map<string, string>()
      
      product.productVariants.forEach(variant => {
        if (!variant.properties) return
        
        try {
          const properties = typeof variant.properties === 'string' 
            ? JSON.parse(variant.properties) 
            : variant.properties
          
          const colorValue = properties.value1 || ''
          
          if (colorValue && 
              !/^[0-9]+(-[0-9]+)?(\.[0-9]+)?$/.test(colorValue) &&
              !/^(XS|S|M|L|XL|XXL|XXXL)$/i.test(colorValue) &&
              variant.image) {
            
            if (!colorMap.has(colorValue)) {
              colorMap.set(colorValue, variant.image)
            }
          }
        } catch (e) {
          console.warn('Erreur parsing properties:', e)
        }
      })
      
      info.colors = Array.from(colorMap.entries()).map(([name, image]) => ({
        name,
        image
      }))
    }

    // ==================== EXTRACTION DES TAILLES ====================
    
    // ✅ PRIORITÉ 1 : Extraire depuis la description markdown
    if (description) {
      // Pattern 1 : Format markdown avec ### 🎯 Tailles disponibles
      let sizeMatch = description.match(/### 🎯 Tailles disponibles\n([\s\S]*?)(?=\n\n|###|\*\*|$)/i)
      
      // Pattern 2 : Format "Size:" ou "Taille:" (format simple)
      if (!sizeMatch) {
        sizeMatch = description.match(/Size:\s*([^\n]+)/i) || 
                    description.match(/Taille:\s*([^\n]+)/i)
      }
      
      if (sizeMatch && sizeMatch[1]) {
        const sizesText = sizeMatch[1]
        
        // Déterminer si c'est le format markdown (avec lignes) ou format simple (avec virgules)
        const isMarkdownFormat = sizesText.includes('\n')
        
        let rawSizes: string[] = []
        
        if (isMarkdownFormat) {
          // Format markdown : lignes séparées par \n
          rawSizes = sizesText
            .split('\n')
            .map(line => line.trim().replace(/^-\s*/, '')) // Enlever le "- " au début
        } else {
          // Format simple : séparé par virgules (ex: "no.6, no.7, no.8, no.9, no.10")
          rawSizes = sizesText
            .split(',')
            .map(s => s.trim())
        }
        
        info.sizes = rawSizes
          .filter(s => {
            if (!s || s.length === 0) return false
            
            // Nettoyer les tailles (ex: "no.6" → "6", "no.7" → "7")
            let cleanSize = s.replace(/^no\.\s*/i, '') // Enlever "no." au début
            cleanSize = cleanSize.replace(/^#\s*/i, '') // Enlever "#" au début
            cleanSize = cleanSize.replace(/^size\s*/i, '') // Enlever "size" au début
            cleanSize = cleanSize.trim()
            
            // ✅ FILTRES STRICTS
            const isValidSize = (
              // Plages de pointures : 36-37, 38-39, etc.
              /^[0-9]{2}-[0-9]{2}$/.test(cleanSize) ||
              // Pointures simples : 6, 7, 36, 37, 42
              /^[0-9]{1,3}(\.[0-9])?$/.test(cleanSize) ||
              // Tailles texte : XS, S, M, L, XL, XXL
              /^(XS|S|M|L|XL|XXL|XXXL)$/i.test(cleanSize) ||
              // Codes internationaux : EU 42, US 10
              /^(EU|US|UK)\s*[0-9]{1,3}$/i.test(cleanSize) ||
              // Format "no.6", "no.7", etc.
              /^no\.\s*[0-9]{1,3}$/i.test(s)
            )
            
            // ✅ EXCLUSIONS
            const isNotSize = (
              cleanSize.length > 20 || // Trop long
              cleanSize.includes('*') || // Contient des astérisques
              cleanSize.includes(':') || // Contient des deux-points
              /[a-z]{5,}/i.test(cleanSize) || // Contient des mots longs
              cleanSize.toLowerCase().includes('craft') ||
              cleanSize.toLowerCase().includes('sole') ||
              cleanSize.toLowerCase().includes('shoe') ||
              cleanSize.toLowerCase().includes('depth') ||
              cleanSize.toLowerCase().includes('mouth')
            )
            
            if (isValidSize && !isNotSize) {
              // Utiliser la taille nettoyée
              return cleanSize || s
            }
            
            return false
          })
          .map(s => {
            // Nettoyer la taille finale
            let cleanSize = s.replace(/^no\.\s*/i, '')
            cleanSize = cleanSize.replace(/^#\s*/i, '')
            return cleanSize.trim() || s.trim()
          })
        
        // Trier les tailles
        info.sizes.sort((a, b) => {
          // Extraire les nombres
          const aNum = parseFloat(a.split('-')[0]) // Pour "36-37", prendre 36
          const bNum = parseFloat(b.split('-')[0])
          
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum
          }
          
          // Tailles texte
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
      }
    }
    
    // ✅ FALLBACK : Si pas de tailles dans la description, chercher dans les variants
    if (info.sizes.length === 0 && product?.productVariants && product.productVariants.length > 0) {
      const sizeSet = new Set<string>()
      
      product.productVariants.forEach(variant => {
        if (!variant.properties) return
        
        try {
          const properties = typeof variant.properties === 'string' 
            ? JSON.parse(variant.properties) 
            : variant.properties
          
          const possibleSizes = [properties.value2, properties.value3].filter(Boolean)
          
          possibleSizes.forEach(sizeValue => {
            if (!sizeValue) return
            
            const trimmedSize = sizeValue.trim()
            
            const isValidSize = (
              /^[0-9]{2}-[0-9]{2}$/.test(trimmedSize) ||
              /^[0-9]{1,3}(\.[0-9])?$/.test(trimmedSize) ||
              /^(XS|S|M|L|XL|XXL|XXXL)$/i.test(trimmedSize) ||
              /^(EU|US|UK)\s*[0-9]{1,3}$/i.test(trimmedSize)
            )
            
            const isNotSize = (
              trimmedSize.length > 15 ||
              /[a-z]{4,}/i.test(trimmedSize) ||
              trimmedSize.includes(':') ||
              trimmedSize.includes('*')
            )
            
            if (isValidSize && !isNotSize) {
              sizeSet.add(trimmedSize)
            }
          })
        } catch (e) {
          console.warn('Erreur parsing properties pour tailles:', e)
        }
      })
      
      info.sizes = Array.from(sizeSet).sort((a, b) => {
        const aNum = parseFloat(a.split('-')[0])
        const bNum = parseFloat(b.split('-')[0])
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }
        
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
    }

    // ==================== EXTRACTION DES MATÉRIAUX ====================
    
    if (description) {
      const materialPatterns = [
        { pattern: /\*\*Matériau supérieur:\*\*\s*([^\n*]+)/i, label: 'Matériau supérieur' },
        { pattern: /\*\*Matériau semelle:\*\*\s*([^\n*]+)/i, label: 'Matériau semelle' },
        { pattern: /\*\*Lining material:\*\*\s*([^\n*]+)/i, label: 'Matériau intérieur' },
        { pattern: /\*\*Matériau intérieur:\*\*\s*([^\n*]+)/i, label: 'Matériau intérieur' },
        { pattern: /\*\*Composition principale:\*\*\s*([^\n*]+)/i, label: 'Composition principale' },
        { pattern: /\*\*Composition doublure:\*\*\s*([^\n*]+)/i, label: 'Composition doublure' },
      ]

      materialPatterns.forEach(({ pattern, label }) => {
        const match = description.match(pattern)
        if (match && match[1]) {
          const value = match[1].trim()
          // Ne garder que si c'est court et pertinent
          if (value.length > 0 && value.length < 50 && !value.includes('**')) {
            info.materials.push({ label, value })
          }
        }
      })
    }

    // ==================== EXTRACTION DES AUTRES INFORMATIONS ====================
    
    if (description) {
      const otherPatterns = [
        { pattern: /\*\*Sports applicables:\*\*\s*([^\n*]+)/i, label: 'Sports applicables' },
        { pattern: /\*\*Forme du talon:\*\*\s*([^\n*]+)/i, label: 'Forme du talon' },
        { pattern: /\*\*Hauteur du talon:\*\*\s*([^\n*]+)/i, label: 'Hauteur du talon' },
        { pattern: /\*\*Style:\*\*\s*([^\n*]+)/i, label: 'Style' },
        { pattern: /\*\*Upper height:\*\*\s*([^\n*]+)/i, label: 'Hauteur' },
      ]

      otherPatterns.forEach(({ pattern, label }) => {
        const match = description.match(pattern)
        if (match && match[1]) {
          const value = match[1].trim()
          // Ne garder que si c'est court et pertinent
          if (value.length > 0 && value.length < 100 && !value.includes('**')) {
            info.otherInfo.push({ label, value })
          }
        }
      })
    }

    return info
  }

  // ✅ Fonction pour obtenir la couleur CSS à partir du nom
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
      'mint green': '#98FF98',
      'pink': '#FFC0CB',
      'light pink': '#FFB6C1',
      'purple': '#800080',
      'light blue': '#ADD8E6',
      'beige': '#F5F5DC',
      'light grey': '#D3D3D3',
      'light gray': '#D3D3D3',
      'burgundy': '#800020',
      'lavender': '#E6E6FA',
      'olive green': '#556B2F',
      'dark grey': '#A9A9A9',
      'dark gray': '#A9A9A9',
      'sky blue': '#87CEEB',
    }
    
    const normalized = colorName.toLowerCase().trim()
    return colorMap[normalized] || '#CCCCCC' // Couleur par défaut
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
                Veuillez vous connecter pour accéder aux produits draft
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
          <p className="mt-4 text-gray-600">Chargement des produits draft...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produits en Draft</h1>
          <p className="text-gray-600 mt-2">
            Éditez et publiez vos produits avant de les rendre visibles dans le catalogue
          </p>
        </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={loadData}>
              <Package className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button 
              variant="outline" 
              onClick={handleUpdateMappings}
              title="Mettre à jour automatiquement les produits draft sans catégorie qui ont un mapping"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mettre à jour les catégories
            </Button>
            <Link href="/admin/products">
              <Button variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Voir tous les produits
              </Button>
            </Link>
          </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Draft</p>
                <p className="text-2xl font-bold text-gray-900">{drafts.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Édités</p>
                <p className="text-2xl font-bold text-gray-900">
                  {drafts.filter(p => p.isEdited).length}
                </p>
              </div>
              <Edit className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="kamri-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Prêts à publier</p>
                <p className="text-2xl font-bold text-gray-900">
                  {drafts.filter(p => p.categoryId && p.name && p.price > 0).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      {drafts.length === 0 ? (
        <Card className="kamri-card">
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun produit en draft</h3>
            <p className="text-gray-500 mb-4">
              Préparez des produits CJ pour commencer à les éditer
            </p>
            <Link href="/admin/stores">
              <Button className="kamri-button">
                <Package className="w-4 h-4 mr-2" />
                Voir les magasins
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {drafts.map((product) => (
            <Card key={product.id} className="kamri-card">
              <CardContent className="p-6">
                {editingId === product.id ? (
                  // Mode édition
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Édition du produit</h3>
                      <Button variant="ghost" size="icon" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Colonne gauche */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nom du produit *</Label>
                          <Input
                            id="name"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nom du produit"
                          />
                        </div>

                        {/* ✅ Informations visuelles du produit */}
                        {(() => {
                          // 🔍 DEBUG : Log des variants pour déboguer
                          console.log('🔍 [DEBUG] Product variants:', product.productVariants)
                          console.log('🔍 [DEBUG] Product description:', product.description?.substring(0, 200))
                          
                          const productInfo = extractProductInfo(product.description || formData.description || '', product)
                          
                          // 🔍 DEBUG : Log des couleurs extraites
                          console.log('🔍 [DEBUG] Colors extracted:', productInfo.colors)
                          
                          if (productInfo.colors.length === 0 && productInfo.sizes.length === 0 && 
                              productInfo.materials.length === 0 && productInfo.otherInfo.length === 0) {
                            return null
                          }

                          return (
                            <div className="space-y-4 pb-4 border-b">
                              {/* Couleurs */}
                              {productInfo.colors.length > 0 && (
                                <div>
                                  <Label className="mb-3 block text-sm font-semibold text-gray-700">
                                    🎨 Couleurs disponibles
                                  </Label>
                                  <div className="flex flex-wrap gap-3">
                                    {productInfo.colors.map((color, idx) => (
                                      <div
                                        key={idx}
                                        className="relative group cursor-pointer"
                                      >
                                        {/* Carré avec image du variant */}
                                        <div className="relative w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-white hover:border-orange-500 transition-all shadow-sm hover:shadow-md">
                                          {color.image ? (
                                            <>
                                              {/* Image du variant */}
                                              <img
                                                src={color.image}
                                                alt={`${color.name} variant`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                onError={(e) => {
                                                  // Si l'image ne charge pas, afficher un cercle de couleur en fallback
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
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                                            <span className="text-xs font-semibold text-white capitalize drop-shadow-lg px-2 py-1 bg-black/50 rounded">
                                              {color.name}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Nom de la couleur en dessous (toujours visible) */}
                                        <p className="text-xs text-center mt-1 font-medium text-gray-700 capitalize truncate max-w-[96px]">
                                          {color.name}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Tailles */}
                              {productInfo.sizes.length > 0 && (
                                <div>
                                  <Label className="mb-3 block text-sm font-semibold text-gray-700">
                                    🎯 Tailles disponibles
                                  </Label>
                                  <div className="flex flex-wrap gap-2">
                                    {productInfo.sizes.map((size, idx) => (
                                      <div
                                        key={idx}
                                        className="min-w-[48px] h-12 px-3 border-2 border-gray-300 rounded-lg bg-white hover:border-orange-500 hover:bg-orange-50 transition-all font-semibold text-sm flex items-center justify-center cursor-pointer"
                                      >
                                        {size}
                                      </div>
                                    ))}
                                  </div>
                                  {productInfo.sizes.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">
                                      Aucune taille détectée dans les variants
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Matériaux */}
                              {productInfo.materials.length > 0 && (
                                <div>
                                  <Label className="mb-2 block text-sm font-semibold text-gray-700">
                                    🧵 Matériaux
                                  </Label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {productInfo.materials.map((material, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="text-xs text-gray-500 mb-1 font-medium">
                                          {material.label}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {material.value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Autres informations */}
                              {productInfo.otherInfo.length > 0 && (
                                <div>
                                  <Label className="mb-2 block text-sm font-semibold text-gray-700">
                                    ℹ️ Autres informations
                                  </Label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {productInfo.otherInfo.map((info, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="text-xs text-gray-500 mb-1 font-medium">
                                          {info.label}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {info.value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        <div>
                          <Label htmlFor="description">Description complète</Label>
                          <Textarea
                            id="description"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Description du produit"
                            rows={6}
                            className="mt-2"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            ℹ️ Les informations ci-dessus sont extraites automatiquement de la description
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="categoryId">Catégorie *</Label>
                          <Select
                            value={formData.categoryId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                          >
                            <SelectTrigger>
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
                          <Label htmlFor="image">Image principale</Label>
                          <Input
                            id="image"
                            value={formData.image || ''}
                            onChange={(e) => {
                              // ✅ Nettoyer l'URL si c'est un tableau JSON
                              const inputValue = e.target.value
                              const cleanUrl = getCleanImageUrl(inputValue) || inputValue
                              setFormData({ ...formData, image: cleanUrl })
                            }}
                            placeholder="URL de l'image"
                          />
                          {formData.image && formData.image.startsWith('[') && (
                            <p className="text-xs text-gray-500 mt-1">
                              ℹ️ Tableau JSON détecté, première URL extraite automatiquement
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Colonne droite */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="margin">Marge (%) *</Label>
                          <Input
                            id="margin"
                            type="number"
                            min="0"
                            max="500"
                            value={formData.margin || 30}
                            onChange={(e) => {
                              const margin = Number(e.target.value)
                              setFormData({
                                ...formData,
                                margin,
                                // Recalculer le prix si originalPrice existe
                                price: product.originalPrice ? calculatePrice(product.originalPrice, margin) : formData.price
                              })
                            }}
                          />
                          {product.originalPrice && (
                            <p className="text-sm text-gray-500 mt-1">
                              Prix calculé: {calculatePrice(product.originalPrice, formData.margin || 30).toFixed(2)}$
                              (Prix original: {product.originalPrice}$)
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="stock">Stock</Label>
                          <Input
                            id="stock"
                            type="number"
                            min="0"
                            value={formData.stock || 0}
                            onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                          />
                        </div>

                        <div>
                          <Label htmlFor="badge">Badge</Label>
                          <Select
                            value={formData.badge || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, badge: value === 'none' ? '' : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Aucun badge" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun badge</SelectItem>
                              <SelectItem value="nouveau">Nouveau</SelectItem>
                              <SelectItem value="promo">Promo</SelectItem>
                              <SelectItem value="top-ventes">Top ventes</SelectItem>
                              <SelectItem value="tendances">Tendances</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* ✅ Galerie d'images avec navigation */}
                        {(() => {
                          // ✅ Récupérer toutes les images disponibles
                          const allImages: string[] = []
                          if (formData.images && formData.images.length > 0) {
                            if (typeof formData.images[0] === 'string') {
                              allImages.push(...(formData.images as string[]))
                            } else {
                              allImages.push(...(formData.images as Array<{ id: string; url: string }>).map(img => img.url))
                            }
                          } else if (formData.image) {
                            allImages.push(formData.image)
                          }
                          
                          if (allImages.length === 0) return null
                          
                          const currentIndex = currentImageIndex[product.id] || 0
                          const currentImage = allImages[currentIndex]
                          
                          return (
                            <div>
                              <Label>Galerie d'images ({allImages.length} image{allImages.length > 1 ? 's' : ''})</Label>
                              
                              {/* Image principale avec navigation */}
                              <div className="mt-2 border rounded-lg p-2 bg-gray-50 relative">
                                <div className="flex items-center justify-center min-h-[300px] relative">
                                  <img
                                    src={currentImage}
                                    alt={`Aperçu ${currentIndex + 1}/${allImages.length}`}
                                    className="max-w-full max-h-[400px] object-contain rounded"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Image+non+disponible'
                                    }}
                                  />
                                  
                                  {/* Navigation si plusieurs images */}
                                  {allImages.length > 1 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newIndex = currentIndex > 0 ? currentIndex - 1 : allImages.length - 1
                                          setCurrentImageIndex(prev => ({ ...prev, [product.id]: newIndex }))
                                        }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
                                      >
                                        ‹
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : 0
                                          setCurrentImageIndex(prev => ({ ...prev, [product.id]: newIndex }))
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
                                      >
                                        ›
                                      </button>
                                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                        {currentIndex + 1} / {allImages.length}
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {/* Miniatures des images */}
                                {allImages.length > 1 && (
                                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                    {allImages.map((img, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentImageIndex(prev => ({ ...prev, [product.id]: idx }))}
                                        className={`flex-shrink-0 w-16 h-16 border-2 rounded overflow-hidden ${
                                          idx === currentIndex ? 'border-blue-500' : 'border-gray-300'
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
                          )
                        })()}
                        
                        {/* ✅ Gestion des variants */}
                        {(() => {
                          // Priorité : editingVariants > productVariants > variants JSON
                          let variants: ProductVariant[] = editingVariants[product.id] || product.productVariants || []
                          
                          // Si toujours vide, essayer de parser le champ JSON variants
                          if (variants.length === 0 && product.variants) {
                            try {
                              const parsedVariants = typeof product.variants === 'string' 
                                ? JSON.parse(product.variants) 
                                : product.variants
                              
                              if (Array.isArray(parsedVariants)) {
                                variants = parsedVariants.map((v: any, idx: number) => ({
                                  id: `variant-${idx}-${v.vid || v.variantId || idx}`,
                                  cjVariantId: String(v.vid || v.variantId || ''),
                                  name: v.variantNameEn || v.variantName || v.name || `Variant ${idx + 1}`,
                                  sku: v.variantSku || v.sku || '',
                                  price: parseFloat(v.variantSellPrice || v.variantPrice || v.price || v.sellPrice || 0),
                                  stock: parseInt(v.variantStock || v.stock || 0, 10),
                                  weight: parseFloat(v.variantWeight || v.weight || 0),
                                  dimensions: typeof v.variantDimensions === 'string' ? v.variantDimensions : JSON.stringify(v.variantDimensions || {}),
                                  image: v.variantImage || v.image || '',
                                  status: v.status || 'active',
                                  properties: typeof v.variantProperties === 'string' ? v.variantProperties : JSON.stringify(v.variantProperties || {}),
                                  isActive: v.isActive !== false
                                }))
                                console.log(`✅ [DRAFT-EDIT] Variants parsés depuis JSON (fallback): ${variants.length} variants`)
                              }
                            } catch (error) {
                              console.error('❌ [DRAFT-EDIT] Erreur parsing variants JSON:', error)
                            }
                          }
                          
                          console.log(`🔍 [DRAFT-EDIT] Produit ${product.id} - Variants disponibles:`, {
                            editingVariants: editingVariants[product.id]?.length || 0,
                            productVariants: product.productVariants?.length || 0,
                            variantsJson: product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants).length : product.variants.length) : 0,
                            variants: variants.length,
                            variantDetails: variants.map(v => ({
                              id: v.id,
                              name: v.name,
                              sku: v.sku,
                              cjVariantId: v.cjVariantId,
                              stock: v.stock,
                              price: v.price
                            }))
                          })
                          
                          if (variants.length === 0) {
                            return (
                              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                  ⚠️ Aucun variant trouvé pour ce produit. 
                                  {product.cjProductId && (
                                    <span> Synchronisez les variants depuis la page produits.</span>
                                  )}
                                </p>
                              </div>
                            )
                          }
                          
                          return (
                            <div className="mt-4">
                              <Label>Variants du produit ({variants.length} variant{variants.length > 1 ? 's' : ''})</Label>
                              <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
                                {variants.map((variant, idx) => {
                                // Parser les propriétés JSON
                                let properties: any = {}
                                try {
                                  if (variant.properties) {
                                    properties = typeof variant.properties === 'string' 
                                      ? JSON.parse(variant.properties) 
                                      : variant.properties
                                  }
                                } catch (e) {
                                  properties = {}
                                }
                                
                                // Parser les dimensions JSON
                                let dimensions: any = {}
                                try {
                                  if (variant.dimensions) {
                                    dimensions = typeof variant.dimensions === 'string'
                                      ? JSON.parse(variant.dimensions)
                                      : variant.dimensions
                                  }
                                } catch (e) {
                                  dimensions = {}
                                }
                                
                                return (
                                  <div key={variant.id || idx} className="bg-white border rounded-lg p-3">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">
                                          {variant.name || `Variant ${idx + 1}`}
                                        </p>
                                        {variant.sku && (
                                          <p className="text-xs text-gray-500 font-mono">SKU: {variant.sku}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {variant.image && (
                                          <img
                                            src={variant.image}
                                            alt={variant.name || `Variant ${idx + 1}`}
                                            className="w-12 h-12 object-cover rounded border"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        )}
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          variant.isActive 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {variant.isActive ? 'Actif' : 'Inactif'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                      {variant.price !== undefined && variant.price !== null && (
                                        <div>
                                          <span className="text-gray-500">Prix:</span>
                                          <span className="ml-1 font-semibold">{variant.price}$</span>
                                        </div>
                                      )}
                                      {variant.stock !== undefined && variant.stock !== null && (
                                        <div>
                                          <span className="text-gray-500">Stock:</span>
                                          <span className="ml-1">{variant.stock}</span>
                                        </div>
                                      )}
                                      {variant.weight !== undefined && variant.weight !== null && (
                                        <div>
                                          <span className="text-gray-500">Poids:</span>
                                          <span className="ml-1">{variant.weight}g</span>
                                        </div>
                                      )}
                                      {dimensions && Object.keys(dimensions).length > 0 && (
                                        <div>
                                          <span className="text-gray-500">Dimensions:</span>
                                          <span className="ml-1">
                                            {dimensions.length || '-'}×{dimensions.width || '-'}×{dimensions.height || '-'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Propriétés du variant */}
                                    {properties && Object.keys(properties).length > 0 && (
                                      <div className="mt-2 pt-2 border-t text-xs">
                                        <span className="text-gray-500">Propriétés:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {properties.key && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                              {properties.key}
                                            </span>
                                          )}
                                          {properties.value1 && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                              {properties.value1}
                                            </span>
                                          )}
                                          {properties.value2 && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                                              {properties.value2}
                                            </span>
                                          )}
                                          {properties.value3 && (
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                                              {properties.value3}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                ℹ️ Les variants sont en lecture seule. Pour modifier un variant, utilisez la page de gestion des variants.
                              </p>
                            </div>
                          )
                        })()}

                        {/* ✅ Informations CJ Dropshipping supplémentaires */}
                        {(product.source === 'cj-dropshipping' || product.cjProductId) && (
                          <div className="mt-4 border-t pt-4">
                            <Label className="mb-3 block text-sm font-semibold text-gray-700">
                              📦 Informations CJ Dropshipping
                            </Label>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {product.cjProductId && (
                                <div>
                                  <span className="text-gray-500">ID CJ:</span>
                                  <p className="font-mono text-xs mt-1">{product.cjProductId}</p>
                                </div>
                              )}
                              {product.productSku && (
                                <div>
                                  <span className="text-gray-500">SKU:</span>
                                  <p className="font-mono text-xs mt-1">{product.productSku}</p>
                                </div>
                              )}
                              {product.brand && (
                                <div>
                                  <span className="text-gray-500">Marque:</span>
                                  <p className="font-semibold mt-1">{product.brand}</p>
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
                              {product.productType && (
                                <div>
                                  <span className="text-gray-500">Type:</span>
                                  <p className="font-semibold mt-1">{product.productType}</p>
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
                              {product.dimensions && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Dimensions:</span>
                                  <p className="font-semibold mt-1">{product.dimensions}</p>
                                </div>
                              )}
                              {product.supplierName && (
                                <div>
                                  <span className="text-gray-500">Fournisseur CJ:</span>
                                  <p className="font-semibold mt-1">{product.supplierName}</p>
                                </div>
                              )}
                              {product.externalCategory && (
                                <div>
                                  <span className="text-gray-500">Catégorie externe:</span>
                                  <p className="font-semibold mt-1">{product.externalCategory}</p>
                                </div>
                              )}
                              {product.tags && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Tags:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(() => {
                                      try {
                                        const tags = typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags
                                        if (Array.isArray(tags)) {
                                          return tags.map((tag: string, idx: number) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                              {tag}
                                            </span>
                                          ))
                                        }
                                        return null
                                      } catch {
                                        return <span className="text-xs text-gray-500">{product.tags}</span>
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
                              {product.cjMapping && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Mapping CJ:</span>
                                  <p className="font-mono text-xs mt-1">
                                    PID: {product.cjMapping.cjProductId} | SKU: {product.cjMapping.cjSku}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-4 pt-4 border-t">
                      <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                        Annuler
                      </Button>
                      <Button
                        className="kamri-button"
                        onClick={() => handleSave(product.id)}
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
                            Enregistrer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Mode affichage
                  <div className="flex gap-6">
                    {/* Image */}
                    <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getCleanImageUrl(product.image) ? (
                        <img
                          src={getCleanImageUrl(product.image) || ''}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                          {product.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                        {product.isEdited && (
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <Edit className="h-3 w-3" />
                            <span>Édité</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Prix:</span>
                          <span className="font-semibold ml-2">
                            {product.price.toFixed(2)}$
                          </span>
                          {product.originalPrice && (
                            <span className="text-gray-400 line-through ml-2">
                              {product.originalPrice}$
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500">Marge:</span>
                          <span className="font-semibold ml-2">
                            {product.margin || 30}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Catégorie:</span>
                          <span className="font-semibold ml-2">
                            {product.category?.name || 'Non assignée'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Stock:</span>
                          <span className="font-semibold ml-2">{product.stock}</span>
                        </div>
                      </div>

                      {product.badge && (
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                            {product.badge}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Éditer
                        </Button>
                        <Button
                          className="kamri-button"
                          size="sm"
                          onClick={() => handlePublish(product.id)}
                          disabled={isPublishing || !product.categoryId || !product.name || product.price <= 0}
                        >
                          {isPublishing ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Publication...
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3 mr-1" />
                              Publier
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

