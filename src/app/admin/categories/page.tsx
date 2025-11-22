'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/contexts/ToastContext'
import {
  CheckCircle,
  Edit,
  Link,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Search,
  X,
  Package,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { apiClient } from '../../../lib/api'
import { useRouter } from 'next/navigation'

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUrl?: string; // ✅ URL de l'image personnalisée
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  products?: any[];
}

interface MappingStats {
  draftCount: number;
  cjStoreCount: number;
  isLoading: boolean;
}

export default function CategoriesPage() {
  const router = useRouter()
  const toast = useToast()
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [unmappedCategories, setUnmappedCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showBulkMappingModal, setShowBulkMappingModal] = useState(false)
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState(false)
  const [selectedCategoryForMapping, setSelectedCategoryForMapping] = useState<any>(null)
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null)
  const [selectedMappingForDelete, setSelectedMappingForDelete] = useState<any>(null)
  const [selectedMappingForSync, setSelectedMappingForSync] = useState<string | null>(null)
  const [selectedUnmappedCategories, setSelectedUnmappedCategories] = useState<Set<string>>(new Set())
  const [isBulkMapping, setIsBulkMapping] = useState(false)
  const [mappingData, setMappingData] = useState({
    supplierId: '',
    externalCategory: '',
    internalCategory: ''
  })
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    icon: '🛍️',
    color: '#4CAF50',
    imageUrl: '' // ✅ URL de l'image personnalisée
  })
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('')
  const [mappingStats, setMappingStats] = useState<Record<string, MappingStats>>({})
  const [previewData, setPreviewData] = useState<any>(null)
  const { isAuthenticated } = useAuth()

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
      
      // ✅ OPTIMISÉ : Charger toutes les stats en une seule requête au lieu de multiples appels séquentiels
      try {
        const statsResponse = await apiClient.getAllCategoryStats()
        if (statsResponse.data) {
          const statsData = statsResponse.data.data || statsResponse.data
          
          // Définir les catégories et mappings
          if (statsData.categories) {
            setCategories(Array.isArray(statsData.categories) ? statsData.categories : [])
          }
          if (statsData.mappings) {
            setMappings(Array.isArray(statsData.mappings) ? statsData.mappings : [])
          }
          
          // Définir les statistiques directement
          if (statsData.stats) {
            setMappingStats(statsData.stats)
          }
        }
      } catch (statsError) {
        console.warn('⚠️ Erreur lors du chargement des stats groupées, fallback sur méthode séquentielle:', statsError)
        // Fallback sur l'ancienne méthode si le nouvel endpoint n'est pas disponible
        await loadDataSequential()
        return
      }

      // Charger les fournisseurs et catégories non mappées en parallèle
      const [suppliersResponse, unmappedResponse] = await Promise.all([
        apiClient.getSuppliers(),
        apiClient.getUnmappedExternalCategories()
      ])

      if (suppliersResponse.data) {
        const suppliersData = suppliersResponse.data.data || suppliersResponse.data
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      }

      if (unmappedResponse.data) {
        const unmappedData = unmappedResponse.data.data || unmappedResponse.data
        setUnmappedCategories(Array.isArray(unmappedData) ? unmappedData : [])
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.showToast({ type: 'error', title: 'Erreur', description: 'Impossible de charger les données' })
    } finally {
      setIsLoading(false)
    }
  }

  // Méthode de fallback (ancienne méthode séquentielle)
  const loadDataSequential = async () => {
    // Charger les catégories
    const categoriesResponse = await apiClient.getCategories()
    if (categoriesResponse.data) {
      const backendData = categoriesResponse.data.data || categoriesResponse.data
      const categoriesData = Array.isArray(backendData) ? backendData : []
      setCategories(categoriesData)
      
      // Charger les statistiques pour chaque catégorie
      await loadCategoryStats(categoriesData)
    }

    // Charger les mappings
    const mappingsResponse = await apiClient.getCategoryMappings()
    if (mappingsResponse.data) {
      const mappingsData = mappingsResponse.data.data || mappingsResponse.data
      setMappings(Array.isArray(mappingsData) ? mappingsData : [])
      
      // Charger les statistiques pour chaque mapping
      await loadMappingStats(Array.isArray(mappingsData) ? mappingsData : [])
    }
  }

  // ✅ OPTIMISÉ : Paralléliser les appels API au lieu de les faire séquentiellement
  const loadCategoryStats = async (categoriesData: Category[]) => {
    const stats: Record<string, MappingStats> = {}
    
    // Utiliser Promise.all pour paralléliser tous les appels
    const promises = categoriesData.map(async (category) => {
      try {
        const draftResponse = await apiClient.getDraftProductsCountByCategory(category.id)
        return {
          categoryId: category.id,
          draftCount: draftResponse.count || 0,
          cjStoreCount: 0
        }
      } catch (error) {
        return {
          categoryId: category.id,
          draftCount: 0,
          cjStoreCount: 0
        }
      }
    })
    
    const results = await Promise.all(promises)
    results.forEach(result => {
      stats[result.categoryId] = {
        draftCount: result.draftCount,
        cjStoreCount: result.cjStoreCount,
        isLoading: false
      }
    })
    
    setMappingStats(stats)
  }

  // ✅ OPTIMISÉ : Paralléliser les appels API au lieu de les faire séquentiellement
  const loadMappingStats = async (mappingsData: any[]) => {
    const stats = { ...mappingStats }
    
    // Utiliser Promise.all pour paralléliser tous les appels
    const promises = mappingsData.map(async (mapping) => {
      try {
        const cjCountResponse = await apiClient.getCJStoreProductsCount(mapping.id)
        return {
          mappingId: mapping.id,
          cjStoreCount: cjCountResponse.data?.count || 0
        }
      } catch (error) {
        return {
          mappingId: mapping.id,
          cjStoreCount: 0
        }
      }
    })
    
    const results = await Promise.all(promises)
    results.forEach(result => {
      stats[result.mappingId] = {
        ...stats[result.mappingId],
        cjStoreCount: result.cjStoreCount,
        isLoading: false
      }
    })
    
    setMappingStats(stats)
  }

  const handleImageUpload = async (file: File, categoryId?: string) => {
    if (!file) return
    
    setIsUploadingImage(true)
    try {
      // Si on est en mode édition et qu'on a un categoryId, uploader directement
      if (categoryId) {
        const uploadResponse = await apiClient.uploadCategoryImage(categoryId, file)
        if (uploadResponse.data?.imageUrl) {
          // Mettre à jour la catégorie avec la nouvelle image
          await apiClient.updateCategory(categoryId, { imageUrl: uploadResponse.data.imageUrl })
          toast.showToast({ type: 'success', title: 'Succès', description: 'Image uploadée avec succès' })
          await loadData()
          return uploadResponse.data.imageUrl
        }
      } else {
        // En mode création, on stocke temporairement le fichier
        // L'upload se fera après la création de la catégorie
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          setNewCategoryData({ ...newCategoryData, imageUrl: result })
        }
        reader.readAsDataURL(file)
        toast.showToast({ type: 'info', title: 'Info', description: 'Image sélectionnée. Elle sera uploadée lors de la création de la catégorie.' })
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de l\'image:', error)
      toast.showToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible d\'uploader l\'image' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleAddCategory = async () => {
    try {
      const response = await apiClient.createCategory(newCategoryData)
      if (response.data) {
        const categoryId = response.data.id
        
        // Si on a une image en base64, l'uploader maintenant
        if (newCategoryData.imageUrl && newCategoryData.imageUrl.startsWith('data:')) {
          // Convertir base64 en File
          const base64Response = await fetch(newCategoryData.imageUrl)
          const blob = await base64Response.blob()
          const file = new File([blob], 'category-image.jpg', { type: blob.type })
          await handleImageUpload(file, categoryId)
        }
        
        toast.showToast({ type: 'success', title: 'Succès', description: 'Catégorie créée avec succès' })
        await loadData()
        setShowAddCategoryModal(false)
        setNewCategoryData({ name: '', description: '', icon: '🛍️', color: '#4CAF50', imageUrl: '' })
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de la catégorie:', error)
      toast.showToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible de créer la catégorie' })
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategoryForEdit) return
    
    try {
      // Si on a une nouvelle image en base64, l'uploader d'abord
      let imageUrl = selectedCategoryForEdit.imageUrl
      if (imageUrl && imageUrl.startsWith('data:')) {
        try {
          const base64Response = await fetch(imageUrl)
          const blob = await base64Response.blob()
          const file = new File([blob], 'category-image.jpg', { type: blob.type })
          setIsUploadingImage(true)
          const uploadResponse = await apiClient.uploadCategoryImage(selectedCategoryForEdit.id, file)
          if (uploadResponse.data?.imageUrl) {
            imageUrl = uploadResponse.data.imageUrl
          }
        } catch (uploadError) {
          console.error('Erreur upload image:', uploadError)
          toast.showToast({ type: 'warning', title: 'Attention', description: 'Erreur lors de l\'upload de l\'image, mais la catégorie sera mise à jour' })
        } finally {
          setIsUploadingImage(false)
        }
      }
      
      const response = await apiClient.updateCategory(selectedCategoryForEdit.id, {
        name: selectedCategoryForEdit.name,
        description: selectedCategoryForEdit.description,
        icon: selectedCategoryForEdit.icon,
        color: selectedCategoryForEdit.color,
        imageUrl: imageUrl
      })
      if (response.data) {
        toast.showToast({ type: 'success', title: 'Succès', description: 'Catégorie modifiée avec succès' })
        await loadData()
        setShowEditCategoryModal(false)
        setSelectedCategoryForEdit(null)
      }
    } catch (error: any) {
      console.error('Erreur lors de la modification de la catégorie:', error)
      toast.showToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible de modifier la catégorie' })
    }
  }

  const handleDeleteCategory = async (categoryId: string, isDefault: boolean) => {
    if (isDefault) {
      toast.showToast({ type: 'warning', title: 'Suppression', description: 'Impossible de supprimer une catégorie par défaut' })
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return
    }

    try {
      await apiClient.deleteCategory(categoryId)
      toast.showToast({ type: 'success', title: 'Succès', description: 'Catégorie supprimée avec succès' })
      await loadData()
    } catch (error: any) {
      console.error('Erreur lors de la suppression de la catégorie:', error)
      toast.showToast({ type: 'error', title: 'Suppression', description: error.message || 'Erreur lors de la suppression de la catégorie' })
    }
  }

  const handleCreateMapping = async () => {
    try {
      const response = await apiClient.createCategoryMapping(mappingData)
      if (response.data) {
        const result = response.data
        toast.showToast({ 
          type: 'success', 
          title: 'Mapping créé', 
          description: `${result.createdProducts || 0} produits créés, ${result.updatedProducts || 0} produits mis à jour` 
        })
        await loadData()
        setShowMappingModal(false)
        setMappingData({ supplierId: '', externalCategory: '', internalCategory: '' })
        setSelectedCategoryForMapping(null)
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du mapping:', error)
      toast.showToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible de créer le mapping' })
    }
  }

  const handleBulkMapping = async () => {
    if (selectedUnmappedCategories.size === 0 || !mappingData.supplierId || !mappingData.internalCategory) {
      toast.showToast({ type: 'warning', title: 'Attention', description: 'Veuillez sélectionner au moins une catégorie externe' })
      return
    }

    setIsBulkMapping(true)
    let successCount = 0
    let errorCount = 0

    // Récupérer les catégories externes correspondantes
    const selectedUnmapped = filteredUnmappedCategories.filter(u => 
      selectedUnmappedCategories.has(u.id) && u.supplierId === mappingData.supplierId
    )

    for (const unmapped of selectedUnmapped) {
      try {
        const response = await apiClient.createCategoryMapping({
          supplierId: mappingData.supplierId,
          externalCategory: unmapped.externalCategory,
          internalCategory: mappingData.internalCategory
        })
        if (response.data) {
          successCount++
        }
      } catch (error) {
        console.error(`Erreur lors de la création du mapping pour ${unmapped.externalCategory}:`, error)
        errorCount++
      }
    }

    setIsBulkMapping(false)
    toast.showToast({ 
      type: successCount > 0 ? 'success' : 'error', 
      title: 'Mapping en masse', 
      description: `${successCount} mapping(s) créé(s), ${errorCount} erreur(s)` 
    })
    await loadData()
    setShowBulkMappingModal(false)
    setSelectedUnmappedCategories(new Set())
    setMappingData({ supplierId: '', externalCategory: '', internalCategory: '' })
  }

  const toggleUnmappedSelection = (unmappedId: string) => {
    const newSelection = new Set(selectedUnmappedCategories)
    if (newSelection.has(unmappedId)) {
      newSelection.delete(unmappedId)
    } else {
      newSelection.add(unmappedId)
    }
    setSelectedUnmappedCategories(newSelection)
  }

  const selectAllUnmapped = () => {
    const allIds = filteredUnmappedCategories
      .filter(u => u.supplierId === mappingData.supplierId)
      .map(u => u.id)
    setSelectedUnmappedCategories(new Set(allIds))
  }

  const deselectAllUnmapped = () => {
    setSelectedUnmappedCategories(new Set())
  }

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce mapping ?')) {
      return
    }

    try {
      await apiClient.deleteCategoryMapping(mappingId)
      toast.showToast({ type: 'success', title: 'Succès', description: 'Mapping supprimé avec succès' })
      await loadData()
      setSelectedMappingForDelete(null)
    } catch (error: any) {
      console.error('Erreur lors de la suppression du mapping:', error)
      toast.showToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible de supprimer le mapping' })
    }
  }

  const handleSyncMapping = async (mappingId: string) => {
    setSelectedMappingForSync(mappingId)
    try {
      const response = await apiClient.syncDraftProductsForMapping(mappingId)
      if (response.data) {
        const result = response.data
        toast.showToast({ 
          type: 'success', 
          title: 'Synchronisation terminée', 
          description: `${result.created || 0} produits créés, ${result.updated || 0} produits mis à jour` 
        })
        await loadData()
      }
    } catch (error: any) {
      console.error('Erreur lors de la synchronisation:', error)
      toast.showToast({ type: 'error', title: 'Erreur', description: error.message || 'Impossible de synchroniser' })
    } finally {
      setSelectedMappingForSync(null)
    }
  }

  const handlePreviewMapping = async (externalCategory: string, supplierId: string) => {
    try {
      // Récupérer les produits CJ disponibles
      const unmapped = unmappedCategories.find(u => u.externalCategory === externalCategory && u.supplierId === supplierId)
      if (unmapped) {
        setPreviewData({
          externalCategory,
          supplierId,
          productCount: unmapped.productCount,
          supplier: suppliers.find(s => s.id === supplierId)
        })
        setShowPreviewModal(true)
      }
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error)
    }
  }

  const getCategoryMappings = (categoryId: string) => {
    return mappings.filter(mapping => mapping.internalCategory === categoryId)
  }

  const getUnmappedForCategory = (categoryId: string) => {
    return unmappedCategories.filter(unmapped => 
      !mappings.some(mapping => 
        mapping.supplierId === unmapped.supplierId && 
        mapping.externalCategory === unmapped.externalCategory
      )
    )
  }

  // Filtrage des catégories non mappées
  const filteredUnmappedCategories = useMemo(() => {
    let filtered = unmappedCategories

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.externalCategory.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtre par fournisseur
    if (selectedSupplierFilter) {
      filtered = filtered.filter(u => u.supplierId === selectedSupplierFilter)
    }

    return filtered
  }, [unmappedCategories, searchTerm, selectedSupplierFilter])

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
                Veuillez vous connecter pour accéder aux catégories
              </p>
              <Button onClick={() => setShowLogin(true)}>
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des catégories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catégories</h1>
          <p className="text-gray-600 mt-2">Gérez les catégories et leurs mappings</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="kamri-button"
            onClick={() => {
              console.log('🔄 [FRONTEND] Clic sur Synchroniser tout')
              if (mappings.length === 0) {
                toast.showToast({ type: 'warning', title: 'Attention', description: 'Aucun mapping à synchroniser' })
                return
              }
              setShowSyncConfirmModal(true)
            }}
            disabled={selectedMappingForSync === 'global' || mappings.length === 0}
          >
            {selectedMappingForSync === 'global' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Synchronisation...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Synchroniser tout
              </>
            )}
          </Button>
          <Button 
            className="kamri-button"
            onClick={() => setShowAddCategoryModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une catégorie
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(categories) && categories.map((category) => {
          const categoryMappings = getCategoryMappings(category.id)
          const unmappedForCategory = getUnmappedForCategory(category.id)
          const stats = mappingStats[category.id] || { draftCount: 0, cjStoreCount: 0, isLoading: false }
          
          return (
            <Card key={category.id} className="kamri-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: category.color + '20', color: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {category.name}
                        {category.isDefault && (
                          <Lock className="w-4 h-4 text-blue-500" aria-label="Catégorie par défaut" role="img" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Package className="w-3 h-3" />
                        <span>{stats.draftCount} produits en draft</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {category.description || 'Aucune description'}
                </p>
                
                {/* Mappings Section */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Mappings externes</h4>
                  
                  {/* Mappings existants - Dropdown compact avec actions */}
                  {categoryMappings.length > 0 && (
                    <div className="mb-2">
                      <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer text-xs bg-green-50 p-2 rounded hover:bg-green-100 transition-colors">
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-green-700 font-medium">
                              {categoryMappings.length} mapping{categoryMappings.length > 1 ? 's' : ''} configuré{categoryMappings.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-green-600 text-xs">▼</span>
                        </summary>
                        <div className="mt-2 space-y-2 pl-4">
                          {categoryMappings.map((mapping) => {
                            const mappingStat = mappingStats[mapping.id] || { draftCount: 0, cjStoreCount: 0, isLoading: false }
                            const hasPendingProducts = mappingStat.cjStoreCount > 0
                            
                            return (
                              <div key={mapping.id} className="bg-green-25 p-2 rounded text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-green-600 font-medium">
                                    {mapping.supplier?.name}: {mapping.externalCategory}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {hasPendingProducts && (
                                      <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-medium">
                                        {mappingStat.cjStoreCount} en attente
                                      </span>
                                    )}
                                    <span className="text-green-500 text-xs">✓</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleSyncMapping(mapping.id)}
                                    disabled={selectedMappingForSync === mapping.id}
                                  >
                                    {selectedMappingForSync === mapping.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-3 h-3" />
                                    )}
                                    Sync
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteMapping(mapping.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => router.push(`/admin/products/draft?categoryId=${category.id}`)}
                                  >
                                    <Eye className="w-3 h-3" />
                                    Voir
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    </div>
                  )}
                  
                  {/* Boutons pour mapper */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setSelectedCategoryForMapping(category)
                        setMappingData({
                          ...mappingData,
                          internalCategory: category.id
                        })
                        setShowMappingModal(true)
                      }}
                    >
                      <Link className="w-3 h-3 mr-1" />
                      Gérer
                    </Button>
                    {unmappedForCategory.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          setSelectedCategoryForMapping(category)
                          setMappingData({
                            supplierId: '',
                            externalCategory: '',
                            internalCategory: category.id
                          })
                          setShowBulkMappingModal(true)
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Mapping en masse
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategoryForEdit(category)
                        setShowEditCategoryModal(true)
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Modifier
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={category.isDefault ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:text-red-700"}
                      onClick={() => handleDeleteCategory(category.id, category.isDefault || false)}
                      disabled={category.isDefault}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {category.isDefault && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      Par défaut
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Ajouter une catégorie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  type="text"
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData({...newCategoryData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nom de la catégorie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Description de la catégorie"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Icône</label>
                  <input
                    type="text"
                    value={newCategoryData.icon}
                    onChange={(e) => setNewCategoryData({...newCategoryData, icon: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="🛍️"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Couleur</label>
                  <input
                    type="color"
                    value={newCategoryData.color}
                    onChange={(e) => setNewCategoryData({...newCategoryData, color: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image de la catégorie (optionnel)</label>
                <div className="space-y-2">
                  {/* Upload de fichier */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Uploader une image</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // En mode création, on stocke temporairement
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const result = event.target?.result as string
                            setNewCategoryData({ ...newCategoryData, imageUrl: result })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      disabled={isUploadingImage}
                    />
                    <p className="text-xs text-gray-500 mt-1">Formats acceptés: JPEG, PNG, WebP, GIF (max 5MB)</p>
                  </div>
                  
                  {/* OU URL */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-gray-500">OU</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">URL de l'image</label>
                    <input
                      type="url"
                      value={newCategoryData.imageUrl && !newCategoryData.imageUrl.startsWith('data:') ? newCategoryData.imageUrl : ''}
                      onChange={(e) => setNewCategoryData({...newCategoryData, imageUrl: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">L'image remplacera l'icône sur la page catégories du web</p>
                {newCategoryData.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={newCategoryData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleAddCategory}
                  className="flex-1"
                  disabled={!newCategoryData.name}
                >
                  Ajouter
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddCategoryModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && selectedCategoryForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Modifier la catégorie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  type="text"
                  value={selectedCategoryForEdit.name}
                  onChange={(e) => setSelectedCategoryForEdit({...selectedCategoryForEdit, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={selectedCategoryForEdit.description || ''}
                  onChange={(e) => setSelectedCategoryForEdit({...selectedCategoryForEdit, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Icône</label>
                  <input
                    type="text"
                    value={selectedCategoryForEdit.icon || ''}
                    onChange={(e) => setSelectedCategoryForEdit({...selectedCategoryForEdit, icon: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Couleur</label>
                  <input
                    type="color"
                    value={selectedCategoryForEdit.color || '#4CAF50'}
                    onChange={(e) => setSelectedCategoryForEdit({...selectedCategoryForEdit, color: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL (optionnel)</label>
                <input
                  type="url"
                  value={selectedCategoryForEdit.imageUrl || ''}
                  onChange={(e) => setSelectedCategoryForEdit({...selectedCategoryForEdit, imageUrl: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-2">L'image remplacera l'icône sur la page catégories du web</p>
                {selectedCategoryForEdit.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={selectedCategoryForEdit.imageUrl} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleEditCategory}
                  className="flex-1"
                  disabled={!selectedCategoryForEdit.name || isUploadingImage}
                >
                  {isUploadingImage ? 'Upload en cours...' : 'Sauvegarder'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditCategoryModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mapping Modal avec recherche et prévisualisation */}
      {showMappingModal && selectedCategoryForMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gérer les mappings pour {selectedCategoryForMapping.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowMappingModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recherche et filtres */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg"
                    placeholder="Rechercher une catégorie externe..."
                  />
                </div>
                <select
                  value={selectedSupplierFilter}
                  onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Tous les fournisseurs</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fournisseur</label>
                <select
                  value={mappingData.supplierId}
                  onChange={(e) => setMappingData({...mappingData, supplierId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie externe</label>
                <div className="space-y-2">
                  <select
                    value={mappingData.externalCategory}
                    onChange={(e) => setMappingData({...mappingData, externalCategory: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Sélectionner une catégorie externe</option>
                    {filteredUnmappedCategories
                      .filter(unmapped => unmapped.supplierId === mappingData.supplierId)
                      .map(unmapped => {
                        const isAlreadyMapped = mappings.some(mapping => 
                          mapping.supplierId === unmapped.supplierId && 
                          mapping.externalCategory === unmapped.externalCategory
                        );
                        
                        return (
                          <option 
                            key={unmapped.id} 
                            value={unmapped.externalCategory}
                            disabled={isAlreadyMapped}
                            style={{ 
                              color: isAlreadyMapped ? '#9CA3AF' : 'inherit',
                              backgroundColor: isAlreadyMapped ? '#F3F4F6' : 'inherit'
                            }}
                          >
                            {unmapped.externalCategory} ({unmapped.productCount} produits)
                            {isAlreadyMapped && ' - Déjà mappé'}
                          </option>
                        );
                      })}
                  </select>
                  
                  {/* Prévisualisation */}
                  {mappingData.externalCategory && mappingData.supplierId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {mappingData.externalCategory}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            {filteredUnmappedCategories.find(u => 
                              u.externalCategory === mappingData.externalCategory && 
                              u.supplierId === mappingData.supplierId
                            )?.productCount || 0} produits disponibles dans CJProductStore
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewMapping(mappingData.externalCategory, mappingData.supplierId)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Prévisualiser
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleCreateMapping}
                  className="flex-1"
                  disabled={!mappingData.supplierId || !mappingData.externalCategory}
                >
                  Créer le mapping
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowMappingModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Mapping Modal */}
      {showBulkMappingModal && selectedCategoryForMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mapping en masse pour {selectedCategoryForMapping.name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowBulkMappingModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fournisseur</label>
                <select
                  value={mappingData.supplierId}
                  onChange={(e) => {
                    setMappingData({...mappingData, supplierId: e.target.value})
                    setSelectedUnmappedCategories(new Set())
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {mappingData.supplierId && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Sélectionner les catégories externes</label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllUnmapped}>
                        Tout sélectionner
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllUnmapped}>
                        Tout désélectionner
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {filteredUnmappedCategories
                      .filter(u => u.supplierId === mappingData.supplierId)
                      .map(unmapped => {
                        const isSelected = selectedUnmappedCategories.has(unmapped.id)
                        const isAlreadyMapped = mappings.some(m => 
                          m.supplierId === unmapped.supplierId && 
                          m.externalCategory === unmapped.externalCategory
                        )
                        
                        return (
                          <div
                            key={unmapped.id}
                            className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                              isSelected ? 'bg-blue-50 border-blue-200' : ''
                            } ${isAlreadyMapped ? 'opacity-50' : ''}`}
                            onClick={() => !isAlreadyMapped && toggleUnmappedSelection(unmapped.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => !isAlreadyMapped && toggleUnmappedSelection(unmapped.id)}
                                  disabled={isAlreadyMapped}
                                  className="w-4 h-4"
                                />
                                <span className={`text-sm ${isAlreadyMapped ? 'text-gray-400' : 'text-gray-900'}`}>
                                  {unmapped.externalCategory}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {unmapped.productCount} produits
                                </span>
                                {isAlreadyMapped && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    Déjà mappé
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>{selectedUnmappedCategories.size}</strong> catégorie(s) sélectionnée(s)
                    </p>
                  </div>
                </>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={handleBulkMapping}
                  className="flex-1"
                  disabled={!mappingData.supplierId || selectedUnmappedCategories.size === 0 || isBulkMapping}
                >
                  {isBulkMapping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      Créer {selectedUnmappedCategories.size} mapping(s)
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBulkMappingModal(false)
                    setSelectedUnmappedCategories(new Set())
                  }}
                  className="flex-1"
                  disabled={isBulkMapping}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Confirm Modal */}
      {showSyncConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Synchroniser tous les mappings</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSyncConfirmModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Synchronisation globale
                    </p>
                    <p className="text-sm text-blue-800">
                      Cette action va synchroniser <strong>{mappings.length} mapping(s)</strong> et peut prendre quelques instants.
                    </p>
                    <p className="text-sm text-blue-800 mt-2">
                      Tous les produits disponibles dans CJProductStore seront créés ou mis à jour dans le draft.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={async () => {
                    setShowSyncConfirmModal(false)
                    console.log('✅ [FRONTEND] Confirmation OK, démarrage synchronisation...')
                    setSelectedMappingForSync('global')
                    
                    try {
                      console.log('📡 [FRONTEND] Appel API syncAllMappings...')
                      const response = await apiClient.syncAllMappings()
                      console.log('📡 [FRONTEND] Réponse API:', response)
                      
                      if (response.data) {
                        const result = response.data
                        console.log('✅ [FRONTEND] Résultat:', result)
                        toast.showToast({ 
                          type: 'success', 
                          title: 'Synchronisation globale terminée', 
                          description: `${result.totalCreated || 0} produits créés, ${result.totalUpdated || 0} produits mis à jour sur ${result.processed || 0} mapping(s)` 
                        })
                        await loadData()
                      } else {
                        console.warn('⚠️ [FRONTEND] Pas de données dans la réponse')
                        toast.showToast({ type: 'warning', title: 'Attention', description: 'Réponse vide du serveur' })
                      }
                    } catch (error: any) {
                      console.error('❌ [FRONTEND] Erreur lors de la synchronisation globale:', error)
                      const errorMessage = error?.message || error?.error || 'Impossible de synchroniser'
                      toast.showToast({ 
                        type: 'error', 
                        title: 'Erreur', 
                        description: errorMessage 
                      })
                    } finally {
                      console.log('🏁 [FRONTEND] Fin synchronisation, reset état')
                      setSelectedMappingForSync(null)
                    }
                  }}
                  className="flex-1"
                  disabled={selectedMappingForSync === 'global'}
                >
                  {selectedMappingForSync === 'global' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Synchronisation en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Confirmer la synchronisation
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('❌ [FRONTEND] Synchronisation annulée par l\'utilisateur')
                    setShowSyncConfirmModal(false)
                  }}
                  className="flex-1"
                  disabled={selectedMappingForSync === 'global'}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prévisualisation</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Catégorie externe</p>
                  <p className="text-sm text-gray-900">{previewData.externalCategory}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Fournisseur</p>
                  <p className="text-sm text-gray-900">{previewData.supplier?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Produits disponibles</p>
                  <p className="text-sm text-gray-900">{previewData.productCount} produits</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
                    <p className="text-xs text-yellow-800">
                      Ces produits seront automatiquement créés dans le draft après la création du mapping.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
