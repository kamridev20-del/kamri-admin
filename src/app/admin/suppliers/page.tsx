'use client'

import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api'
import {
    CheckCircle,
    Download,
    Edit,
    Globe,
    Plus,
    TestTube,
    Trash2,
    Truck,
    XCircle,
    Loader2
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface Supplier {
  id: string
  name: string
  apiUrl: string
  apiKey: string
  status: string
  description?: string
  lastSync?: string
  products?: any[]
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    description: '',
    apiUrl: '',
    apiKey: ''
  })
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [importingProducts, setImportingProducts] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const { isAuthenticated } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (isAuthenticated) {
      loadSuppliers()
    } else {
      setShowLogin(true)
    }
  }, [isAuthenticated])

  // Écouter les événements d'import CJ
  useEffect(() => {
    const handleCJProductImported = () => {
      console.log('🔄 Produit CJ importé, mise à jour des fournisseurs...')
      loadSuppliers() // Recharger les fournisseurs pour mettre à jour les statistiques
    }

    window.addEventListener('cjProductImported', handleCJProductImported)
    
    return () => {
      window.removeEventListener('cjProductImported', handleCJProductImported)
    }
  }, [])

  const loadSuppliers = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getSuppliers()
      if (response.data) {
        // L'API retourne { data: [...], message: "..." }, on doit extraire data
        const suppliersData = response.data.data || response.data;
        // S'assurer que suppliersData est un tableau
        const suppliersArray = Array.isArray(suppliersData) ? suppliersData : [];
        setSuppliers(suppliersArray);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fournisseurs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSupplier = async () => {
    try {
      if (editingSupplier) {
        // Mode édition
        const response = await apiClient.updateSupplier(editingSupplier.id, newSupplier)
        if (response.data) {
          setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? response.data : s))
          setShowAddModal(false)
          setEditingSupplier(null)
          setNewSupplier({ name: '', description: '', apiUrl: '', apiKey: '' })
        }
      } else {
        // Mode ajout
        const supplierData = {
          ...newSupplier,
          apiKey: newSupplier.apiKey || '', // S'assurer que apiKey n'est pas undefined
        }
        const response = await apiClient.createSupplier(supplierData)
        if (response.data) {
          setSuppliers([...suppliers, response.data])
          setShowAddModal(false)
          setNewSupplier({ name: '', description: '', apiUrl: '', apiKey: '' })
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout/modification du fournisseur:', error)
    }
  }

  const handleTestConnection = async (supplierId: string) => {
    try {
      setTestingConnection(supplierId)
      const response = await apiClient.testSupplierConnection(supplierId)
      
      if (response.data?.success) {
        toast.showToast({ type: 'success', title: 'Connexion', description: 'Connexion réussie !' })
        loadSuppliers() // Recharger pour mettre à jour le statut
      } else {
        toast.showToast({ type: 'error', title: 'Connexion', description: 'Échec de la connexion' })
      }
    } catch (error) {
  console.error('Erreur lors du test de connexion:', error)
  toast.showToast({ type: 'error', title: 'Connexion', description: 'Erreur lors du test de connexion' })
    } finally {
      setTestingConnection(null)
    }
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setNewSupplier({
      name: supplier.name,
      description: supplier.description || '',
      apiUrl: supplier.apiUrl,
      apiKey: supplier.apiKey || ''
    })
    setEditingSupplier(supplier)
    setShowAddModal(true)
  }

  const handleDeleteSupplier = async (supplierId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      try {
        await apiClient.deleteSupplier(supplierId)
        setSuppliers(suppliers.filter(s => s.id !== supplierId))
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  const handleImportProducts = async (supplierId: string) => {
    setImportingProducts(supplierId)
    try {
      console.log('🔄 Début de l\'import pour le fournisseur:', supplierId)
      const response = await apiClient.importProducts(supplierId)
      console.log('📦 Réponse de l\'import:', response)
      
      if (response.data) {
        // Gestion spéciale pour CJ Dropshipping
        if (response.data.cjDetected) {
          toast.showToast({ type: 'info', title: 'Import', description: `${response.data.message}\n\nRedirection vers la page CJ Dropshipping...` })
          // Rediriger vers la page CJ
          window.location.href = response.data.redirect
          return
        }
        
        const productsCount = response.data.products?.length || 0
        toast.showToast({ 
          type: 'success', 
          title: 'Import terminé', 
          description: `${response.data.message}\n\n${productsCount} produit(s) importé(s) et en attente de catégorisation.` 
        })
        // Recharger la liste des fournisseurs
        await loadSuppliers()
      } else if (response.error) {
        toast.showToast({ type: 'error', title: 'Import', description: `Erreur: ${response.error}` })
      } else {
        toast.showToast({ type: 'error', title: 'Import', description: 'Réponse inattendue du serveur' })
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'import:', error)
      toast.showToast({ 
        type: 'error', 
        title: 'Import', 
        description: `Erreur lors de l'import des produits: ${error?.message || error}` 
      })
    } finally {
      setImportingProducts(null)
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
                Veuillez vous connecter pour accéder aux fournisseurs
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
          <p className="mt-4 text-gray-600">Chargement des fournisseurs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-600 mt-2">Gérez vos connexions API</p>
        </div>
        <Button 
          className="kamri-button"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un fournisseur
        </Button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="kamri-card group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    {supplier.name === 'CJ Dropshipping' ? (
                      <Globe className="w-5 h-5 text-primary-600" />
                    ) : (
                      <Truck className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    <p className="text-sm text-gray-500">{supplier.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {supplier.status === 'connected' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Statut:</span>
                  <span className={`text-sm font-medium ${
                    supplier.status === 'connected' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {supplier.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Produits:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{supplier.products?.length || 0}</span>
                    {supplier.products && supplier.products.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSupplier(supplier)}
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Voir produits
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Dernière sync:</span>
                  <span className="text-sm font-medium">
                    {supplier.lastSync ? new Date(supplier.lastSync).toLocaleDateString() : 'Jamais'}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(supplier.id)}
                  disabled={testingConnection === supplier.id}
                  className="flex-1"
                >
                  <TestTube className="w-3 h-3 mr-1" />
                  {testingConnection === supplier.id ? 'Test...' : 'Tester'}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleImportProducts(supplier.id)}
                  disabled={importingProducts === supplier.id}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {importingProducts === supplier.id ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Import...
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 mr-1" />
                      Importer
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSupplier(supplier)}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteSupplier(supplier.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingSupplier ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom</label>
                <Input
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  placeholder="Temu, AliExpress, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  value={newSupplier.description}
                  onChange={(e) => setNewSupplier({...newSupplier, description: e.target.value})}
                  placeholder="Description du fournisseur"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">URL API</label>
                <Input
                  value={newSupplier.apiUrl}
                  onChange={(e) => setNewSupplier({...newSupplier, apiUrl: e.target.value})}
                  placeholder="https://api.example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Clé API</label>
                <Input
                  value={newSupplier.apiKey}
                  onChange={(e) => setNewSupplier({...newSupplier, apiKey: e.target.value})}
                  placeholder="votre_cle_api"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingSupplier(null)
                    setNewSupplier({ name: '', description: '', apiUrl: '', apiKey: '' })
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddSupplier}
                  className="flex-1"
                >
                  {editingSupplier ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {suppliers.length === 0 && (
        <Card className="kamri-card">
          <CardContent className="text-center py-12">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun fournisseur</h3>
            <p className="text-gray-500 mb-4">Commencez par ajouter votre premier fournisseur</p>
            <Button 
              className="kamri-button"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un fournisseur
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal liste produits fournisseur */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">
                Produits de {selectedSupplier.name} ({selectedSupplier.products?.length || 0})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSupplier(null)}
              >
                ✕
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {selectedSupplier.products && selectedSupplier.products.length > 0 ? (
                <div className="space-y-4">
                  {selectedSupplier.products.map((product: any) => (
                    <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                         onClick={() => setSelectedProduct(product)}>
                      <div className="flex gap-4">
                        {(() => {
                          let imageUrl = null;
                          if (product.image) {
                            try {
                              // Si c'est un tableau JSON, prendre la première image
                              const images = JSON.parse(product.image);
                              imageUrl = Array.isArray(images) ? images[0] : product.image;
                            } catch {
                              // Si ce n'est pas du JSON, utiliser tel quel
                              imageUrl = product.image;
                            }
                          }
                          
                          return imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg' }}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">Pas d'image</span>
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 truncate">{product.name}</h4>
                          <div className="flex items-center gap-4 text-sm mb-2">
                            <span className="text-green-600 font-semibold">${product.price}</span>
                            {product.originalPrice && product.originalPrice !== product.price && (
                              <span className="text-gray-500 line-through">${product.originalPrice}</span>
                            )}
                            {product.suggestSellPrice && (
                              <span className="text-blue-600">Suggéré: ${product.suggestSellPrice}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Status: {product.status}</span>
                            <span>Source: {product.source}</span>
                            {product.source === 'cj-dropshipping' && product.variants && (
                              <span>
                                {(() => {
                                  try {
                                    const variants = JSON.parse(product.variants);
                                    return `${variants.length} variants`;
                                  } catch {
                                    return 'Variants indisponibles';
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                            }}
                          >
                            Voir détails
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucun produit trouvé pour ce fournisseur
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de progression d'importation */}
      {importingProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                Importation en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  Importation des produits pour <strong>{suppliers.find(s => s.id === importingProducts)?.name || 'le fournisseur'}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Veuillez patienter, cette opération peut prendre quelques instants...
                </p>
              </div>
              
              {/* Barre de progression animée */}
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-green-400 to-green-500 rounded-full"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s ease-in-out infinite'
                  }}
                />
                {/* Effet de brillance qui se déplace */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"
                  style={{
                    width: '50%',
                    animation: 'slide 1.5s ease-in-out infinite',
                    transform: 'translateX(-100%)'
                  }}
                />
              </div>
              
              {/* Indicateur de chargement avec points animés */}
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>💡 Astuce:</strong> Vous pouvez suivre la progression dans la console du serveur backend.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal détails produit */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">
                Détails du produit
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedImageIndex(0);
                  setSelectedSize('');
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
              {(() => {
                // Parse des images pour la galerie
                const getAllImages = () => {
                  let images = [];
                  if (selectedProduct.image) {
                    try {
                      const parsed = JSON.parse(selectedProduct.image);
                      images = Array.isArray(parsed) ? parsed : [selectedProduct.image];
                    } catch {
                      images = [selectedProduct.image];
                    }
                  }
                  return images.filter(Boolean);
                };

                // Fonction pour nettoyer le HTML de la description
                const cleanDescription = (html: string) => {
                  if (!html) return '';
                  // Supprimer les balises HTML et nettoyer le texte
                  return html
                    .replace(/<br\s*\/?>/gi, '\n') // Remplacer <br> par des retours à la ligne
                    .replace(/<\/p>/gi, '\n\n') // Remplacer </p> par double retour à la ligne
                    .replace(/<p[^>]*>/gi, '\n') // Remplacer <p> par retour à la ligne
                    .replace(/<b[^>]*>(.*?)<\/b>/gi, '\n**$1**\n') // Remplacer <b> par markdown bold avec retours à la ligne
                    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\n**$1**\n') // Remplacer <strong> par markdown bold avec retours à la ligne
                    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n**$1**\n') // Remplacer les titres par bold
                    .replace(/<[^>]*>/g, '') // Supprimer toutes les autres balises HTML
                    .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par des espaces
                    .replace(/&amp;/g, '&') // Remplacer &amp; par &
                    .replace(/&lt;/g, '<') // Remplacer &lt; par <
                    .replace(/&gt;/g, '>') // Remplacer &gt; par >
                    .replace(/&quot;/g, '"') // Remplacer &quot; par "
                    .replace(/\n\s+/g, '\n') // Nettoyer les espaces en début de ligne
                    .replace(/\n{3,}/g, '\n\n') // Limiter les retours à la ligne multiples
                    .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul (après nettoyage des lignes)
                    .replace(/\n /g, '\n') // Supprimer les espaces en début de ligne
                    .trim();
                };

                const allImages = getAllImages();
                const currentImage = allImages[selectedImageIndex] || '/placeholder-product.jpg';

                return (
                  <>
                    {/* Header avec galerie d'images et infos principales */}
                    <div className="flex gap-6">
                      {/* Galerie d'images */}
                      <div className="flex-shrink-0">
                        <div className="flex gap-4">
                          {/* Thumbnails à gauche */}
                          {allImages.length > 1 && (
                            <div className="flex flex-col gap-2 w-16">
                              {allImages.map((image, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSelectedImageIndex(index)}
                                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                                    selectedImageIndex === index 
                                      ? 'border-orange-500' 
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <img
                                    src={image}
                                    alt={`Image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg' }}
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* Image principale */}
                          <div className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={currentImage}
                              alt={selectedProduct.name}
                              className="w-full h-full object-cover cursor-pointer"
                              onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg' }}
                              onClick={() => window.open(currentImage, '_blank')}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Infos principales */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h4>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-green-600">${selectedProduct.price}</span>
                            {selectedProduct.originalPrice && selectedProduct.originalPrice !== selectedProduct.price && (
                              <span className="text-gray-500 line-through">${selectedProduct.originalPrice}</span>
                            )}
                            {selectedProduct.suggestSellPrice && (
                              <span className="text-blue-600 font-medium">(Suggéré: ${selectedProduct.suggestSellPrice})</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">{selectedProduct.status}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{selectedProduct.source}</span>
                          {selectedProduct.productSku && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-mono text-xs">
                              {selectedProduct.productSku}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedProduct.description && (
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 mb-2">📝 Description</h5>
                        <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                          {(() => {
                            const cleanedDescription = cleanDescription(selectedProduct.description);
                            // Rendu avec support markdown-like
                            return cleanedDescription.split('\n').map((line, index) => {
                              const trimmedLine = line.trim();
                              if (!trimmedLine) return <br key={index} />;
                              
                              // Si la ligne contient **text**, la rendre en gras
                              if (trimmedLine.includes('**')) {
                                const parts = trimmedLine.split('**');
                                return (
                                  <div key={index} className="mb-2">
                                    {parts.map((part, partIndex) => 
                                      partIndex % 2 === 1 ? 
                                        <strong key={partIndex} className="font-semibold text-gray-900">{part}</strong> : 
                                        <span key={partIndex}>{part}</span>
                                    )}
                                  </div>
                                );
                              }
                              
                              // Ligne normale
                              return <div key={index} className="mb-1">{trimmedLine}</div>;
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Variants - Tableau complet comme CJ */}
                    {selectedProduct.source === 'cj-dropshipping' && selectedProduct.variants && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          🎨 Variants Disponibles ({(() => {
                            try {
                              const variants = JSON.parse(selectedProduct.variants);
                              return variants.length;
                            } catch {
                              return 0;
                            }
                          })()})
                        </h5>
                        
                        {(() => {
                          try {
                            // ✅ Priorité: productVariants (relation Prisma) > variants (JSON)
                            let variants = [];
                            
                            if (selectedProduct.productVariants && selectedProduct.productVariants.length > 0) {
                              // Utiliser les variants de la relation Prisma
                              variants = selectedProduct.productVariants;
                            } else if (selectedProduct.variants) {
                              // Fallback: parser le JSON
                              variants = JSON.parse(selectedProduct.variants);
                            }
                            
                            // Résumé des variants - gérer les deux formats
                            const extractVariantKey = (v: any) => {
                              // Format productVariants: utiliser properties
                              if (v.properties) {
                                try {
                                  const props = typeof v.properties === 'string' ? JSON.parse(v.properties) : v.properties;
                                  if (typeof props === 'string') {
                                    return props; // "Brown-S", etc.
                                  } else if (props.key) {
                                    return props.key;
                                  }
                                } catch {
                                  return v.properties;
                                }
                              }
                              // Format JSON: utiliser variantKey
                              return v.variantKey;
                            };
                            
                            const colors = Array.from(new Set(variants.map((v: any) => {
                              const key = extractVariantKey(v);
                              return key?.split('-')[0];
                            }).filter(Boolean)));
                            
                            const sizes = Array.from(new Set(variants.map((v: any) => {
                              const key = extractVariantKey(v);
                              return key?.split('-')[1];
                            }).filter(Boolean)));
                            
                            return (
                              <>
                                {/* Résumé */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                  <div className="bg-white rounded-lg p-3 border">
                                    <label className="text-sm font-medium text-gray-700">Total Variants</label>
                                    <p className="text-lg font-bold text-blue-600 mt-1">{variants.length}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border">
                                    <label className="text-sm font-medium text-gray-700">Couleurs</label>
                                    <p className="text-sm text-gray-900 mt-1 font-medium">{colors.join(', ') || 'N/A'}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border">
                                    <label className="text-sm font-medium text-gray-700">Tailles</label>
                                    <p className="text-sm text-gray-900 mt-1 font-medium">{sizes.join(', ') || 'N/A'}</p>
                                  </div>
                                </div>
                                
                                {/* Sélection de tailles interactives */}
                                {sizes.length > 0 && (
                                  <div className="mb-6">
                                    <h4 className="text-lg font-semibold mb-3 text-gray-900">Sizes disponibles</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {sizes.map((size, index) => {
                                        const sizeStr = String(size);
                                        return (
                                          <button
                                            key={index}
                                            onClick={() => setSelectedSize(selectedSize === sizeStr ? '' : sizeStr)}
                                            className={`px-4 py-2 border rounded-lg text-sm transition-colors ${
                                              selectedSize === sizeStr
                                                ? 'bg-orange-500 border-orange-500 text-white'
                                                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                                            }`}
                                          >
                                            {sizeStr}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {selectedSize && (
                                      <p className="text-sm text-gray-600 mt-2">
                                        Taille sélectionnée: <span className="font-medium text-orange-600">{selectedSize}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Tableau des variants */}
                                <div className="bg-white rounded-lg border overflow-hidden">
                                  <div className="overflow-x-auto max-h-96">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50 border-b">
                                        <tr>
                                          <th className="text-left p-3 font-medium text-gray-700">Variant</th>
                                          <th className="text-left p-3 font-medium text-gray-700">VID</th>
                                          <th className="text-left p-3 font-medium text-gray-700">SKU</th>
                                          <th className="text-left p-3 font-medium text-gray-700">Prix</th>
                                          <th className="text-left p-3 font-medium text-gray-700">Stock</th>
                                          <th className="text-left p-3 font-medium text-gray-700">Poids</th>
                                          <th className="text-left p-3 font-medium text-gray-700">Dimensions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {variants.map((variant: any, index: number) => {
                                          // ✅ Extraire les données selon le format (productVariants ou JSON)
                                          const isProductVariant = variant.id && variant.productId; // Format Prisma
                                          
                                          const variantImage = isProductVariant ? variant.image : variant.variantImage;
                                          const variantName = isProductVariant ? variant.name : (variant.variantNameEn || variant.variantName);
                                          const variantKey = isProductVariant ? (
                                            typeof variant.properties === 'string' ? variant.properties : JSON.stringify(variant.properties)
                                          ) : variant.variantKey;
                                          const variantId = isProductVariant ? variant.cjVariantId : variant.vid;
                                          const variantSku = isProductVariant ? variant.sku : variant.variantSku;
                                          const variantPrice = isProductVariant ? variant.price : variant.variantSellPrice;
                                          const variantStock = isProductVariant ? variant.stock : (variant.variantStock ?? variant.stock);
                                          const variantWeight = isProductVariant ? variant.weight : variant.variantWeight;
                                          
                                          // Dimensions
                                          let dimensionsDisplay = 'N/A';
                                          if (isProductVariant) {
                                            if (variant.dimensions) {
                                              try {
                                                const dims = typeof variant.dimensions === 'string' ? JSON.parse(variant.dimensions) : variant.dimensions;
                                                if (dims.length && dims.width && dims.height) {
                                                  dimensionsDisplay = `${dims.length}×${dims.width}×${dims.height}`;
                                                }
                                              } catch {}
                                            }
                                          } else {
                                            if (variant.variantLength && variant.variantWidth && variant.variantHeight) {
                                              dimensionsDisplay = `${variant.variantLength}×${variant.variantWidth}×${variant.variantHeight}`;
                                            } else if (variant.variantStandard) {
                                              dimensionsDisplay = variant.variantStandard;
                                            }
                                          }
                                          
                                          return (
                                            <tr key={variantId || variant.id || index} className="border-b hover:bg-gray-50">
                                              <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                  {variantImage && (
                                                    <img 
                                                      src={variantImage} 
                                                      alt={variantName || `Variant ${index + 1}`}
                                                      className="w-8 h-8 rounded object-cover"
                                                      onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg' }}
                                                    />
                                                  )}
                                                  <div>
                                                    <p className="font-medium text-gray-900">
                                                      {variantName || `Variant ${index + 1}`}
                                                    </p>
                                                    {variantKey && (
                                                      <p className="text-xs text-gray-500">{variantKey}</p>
                                                    )}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="p-3">
                                                <span className="text-xs font-mono text-gray-600">
                                                  {variantId ? String(variantId).slice(-8) : 'N/A'}
                                                </span>
                                              </td>
                                              <td className="p-3">
                                                <span className="text-xs font-mono text-blue-600">
                                                  {variantSku || 'N/A'}
                                                </span>
                                              </td>
                                              <td className="p-3">
                                                {variantPrice !== null && variantPrice !== undefined ? (
                                                  <span className="font-semibold text-green-600">
                                                    ${typeof variantPrice === 'string' ? variantPrice : variantPrice.toFixed(2)}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">N/A</span>
                                                )}
                                              </td>
                                              <td className="p-3">
                                                {variantStock !== undefined && variantStock !== null ? (
                                                  <span className={`font-semibold ${
                                                    variantStock > 0 ? 'text-green-600' : 'text-red-600'
                                                  }`}>
                                                    {variantStock}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">N/A</span>
                                                )}
                                              </td>
                                              <td className="p-3">
                                                <span className="text-gray-700">
                                                  {variantWeight ? `${Math.round(variantWeight)}g` : 'N/A'}
                                                </span>
                                              </td>
                                              <td className="p-3">
                                                <span className="text-xs text-gray-600">{dimensionsDisplay}</span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </>
                            );
                          } catch {
                            return <div className="text-sm text-red-500">Erreur lors du parsing des variants</div>;
                          }
                        })()}
                      </div>
                    )}

                    {/* Informations Techniques */}
                    {selectedProduct.source === 'cj-dropshipping' && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="text-lg font-semibold text-gray-900 mb-4">🔧 Informations Techniques</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedProduct.productSku && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">SKU Produit:</span>
                              <p className="text-sm text-gray-900 mt-1 font-mono">{selectedProduct.productSku}</p>
                            </div>
                          )}
                          {selectedProduct.productWeight && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Poids:</span>
                              <p className="text-sm text-gray-900 mt-1">{selectedProduct.productWeight}</p>
                            </div>
                          )}
                          {selectedProduct.packingWeight && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Poids d'emballage:</span>
                              <p className="text-sm text-gray-900 mt-1">{selectedProduct.packingWeight}</p>
                            </div>
                          )}
                          {selectedProduct.materialNameEn && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Matériau:</span>
                              <p className="text-sm text-gray-900 mt-1">{(() => {
                                try {
                                  const materials = JSON.parse(selectedProduct.materialNameEn);
                                  return Array.isArray(materials) ? materials.join(', ') : selectedProduct.materialNameEn;
                                } catch {
                                  return selectedProduct.materialNameEn;
                                }
                              })()}</p>
                            </div>
                          )}
                          {selectedProduct.packingNameEn && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Emballage:</span>
                              <p className="text-sm text-gray-900 mt-1">{(() => {
                                try {
                                  const packings = JSON.parse(selectedProduct.packingNameEn);
                                  return Array.isArray(packings) ? packings.join(', ') : selectedProduct.packingNameEn;
                                } catch {
                                  return selectedProduct.packingNameEn;
                                }
                              })()}</p>
                            </div>
                          )}
                          {selectedProduct.productType && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Type:</span>
                              <p className="text-sm text-gray-900 mt-1">{selectedProduct.productType}</p>
                            </div>
                          )}
                          {selectedProduct.productUnit && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Unité:</span>
                              <p className="text-sm text-gray-900 mt-1">{selectedProduct.productUnit}</p>
                            </div>
                          )}
                          {selectedProduct.externalCategory && (
                            <div className="col-span-2">
                              <span className="text-sm font-medium text-gray-700">Catégorie CJ:</span>
                              <p className="text-sm text-gray-900 mt-1">{selectedProduct.externalCategory}</p>
                            </div>
                          )}
                          {selectedProduct.productKeyEn && (
                            <div className="col-span-2">
                              <span className="text-sm font-medium text-gray-700">Attributs:</span>
                              <p className="text-sm text-gray-900 mt-1">{selectedProduct.productKeyEn}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Informations Prix */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h5 className="text-lg font-semibold text-gray-900 mb-4">💰 Informations Prix</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Prix Actuel:</span>
                          <p className="text-lg font-bold text-green-600 mt-1">${selectedProduct.price}</p>
                        </div>
                        {selectedProduct.originalPrice && selectedProduct.originalPrice !== selectedProduct.price && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Prix Original:</span>
                            <p className="text-sm text-gray-500 line-through mt-1">${selectedProduct.originalPrice}</p>
                          </div>
                        )}
                        {selectedProduct.suggestSellPrice && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Prix Suggéré:</span>
                            <p className="text-lg font-bold text-blue-600 mt-1">${selectedProduct.suggestSellPrice}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-700">Source:</span>
                          <p className="text-sm text-gray-900 mt-1">{selectedProduct.source}</p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}