'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/apiClient';
import { apiClient as apiClientAuth } from '@/lib/api';
import { CheckCircle, Clock, Package, Store as StoreIcon, TrendingUp, XCircle, Edit, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Store {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  stats: {
    total: number;
    available: number;
    imported: number;
    selected: number;
    pending: number;
  };
  lastSync: string | null;
  config: {
    email: string;
    tier: string;
    enabled: boolean;
  };
}

interface StoreProduct {
  id: string;
  cjProductId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image?: string | string[];
  category?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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

export default function StoresPage() {
  const toast = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [kamriCategories, setKamriCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [preparingProductId, setPreparingProductId] = useState<string | null>(null);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [selectedProductForPrepare, setSelectedProductForPrepare] = useState<StoreProduct | null>(null);
  const [prepareFormData, setPrepareFormData] = useState({ categoryId: '', margin: 30 });

  // Récupérer les magasins
  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<Store[]>('/stores');
      console.log('📦 Données reçues du serveur (Magasins):', data);

      let stores: Store[] = [];
      if (Array.isArray(data)) {
        stores = data;
      } else {
        console.error('❌ Les données des magasins ne sont pas un tableau:', data);
        stores = [];
      }

       // Vérifier si CJ est connecté et ajouter les magasins CJ automatiquement
       try {
         const cjStatus = await apiClient<any>('/cj-dropshipping/config/status');
         if (cjStatus.connected) {
           // Récupérer les statistiques CJ
           const cjStats = await apiClient('/cj-dropshipping/stats');
           const cjProducts = await apiClient<any[]>('/cj-dropshipping/products/imported');
           const cjFavorites = await apiClient<any>('/cj-dropshipping/favorites/status');
           
           // Créer le magasin CJ principal
           const cjStore: Store = {
             id: 'cj-dropshipping',
             name: 'CJ Dropshipping',
             description: 'Magasin CJ Dropshipping - Produits importés et disponibles',
             type: 'cj-dropshipping',
             status: 'active',
             stats: {
               total: cjProducts.length || 0,
               available: cjProducts.filter((p: any) => p.status === 'available').length || 0,
               imported: cjProducts.filter((p: any) => p.status === 'imported').length || 0,
               selected: cjProducts.filter((p: any) => p.status === 'selected').length || 0,
               pending: cjProducts.filter((p: any) => p.status === 'pending').length || 0,
             },
             lastSync: new Date().toISOString(),
             config: {
               email: cjStatus.email || '',
               tier: cjStatus.tier || 'free',
               enabled: cjStatus.connected || false,
             }
           };
           
           // Créer le magasin Favoris CJ
           const cjFavoritesStore: Store = {
             id: 'cj-favorites',
             name: 'Favoris CJ Dropshipping',
             description: 'Produits favoris CJ Dropshipping - Synchronisés depuis votre compte',
             type: 'cj-favorites',
             status: 'active',
             stats: {
               total: cjFavorites.count || 0,
               available: cjFavorites.favorites?.filter((p: any) => p.status === 'available').length || 0,
               imported: cjFavorites.favorites?.filter((p: any) => p.status === 'imported').length || 0,
               selected: cjFavorites.favorites?.filter((p: any) => p.status === 'selected').length || 0,
               pending: cjFavorites.favorites?.filter((p: any) => p.status === 'pending').length || 0,
             },
             lastSync: new Date().toISOString(),
             config: {
               email: cjStatus.email || '',
               tier: cjStatus.tier || 'free',
               enabled: cjStatus.connected || false,
             }
           };
           
           // Ajouter les magasins CJ en premier
           stores.unshift(cjFavoritesStore); // Favoris en premier
           stores.unshift(cjStore); // Principal en second
           console.log('✅ Magasins CJ ajoutés automatiquement:', { cjStore, cjFavoritesStore });
         }
       } catch (cjError) {
         console.log('ℹ️ CJ non connecté ou erreur:', cjError);
       }

      setStores(stores);
    } catch (error) {
      console.error('Erreur lors du chargement des magasins:', error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Récupérer les produits d'un magasin
  const fetchStoreProducts = useCallback(async (storeId: string) => {
    try {
       if (storeId === 'cj-dropshipping' || storeId === 'cj-favorites') {
         // 🔄 UTILISER L'ENDPOINT CJ QUI RÉCUPÈRE DEPUIS LA BASE DE DONNÉES
         const params = new URLSearchParams();
         if (searchTerm) params.append('search', searchTerm);
         if (statusFilter !== 'all') params.append('status', statusFilter);
         if (categoryFilter !== 'all') params.append('category', categoryFilter);
         
         // Utiliser l'endpoint CJ qui lit depuis la base de données (pas d'appel API CJ)
         const data = await apiClient<{ products: StoreProduct[], categories: string[] }>(`/cj-dropshipping/stores/${storeId}/products?${params}`);
         console.log(`📦 Données reçues depuis la base de données (${storeId}):`, data);
         setProducts(data.products || []);
         setCategories(data.categories || []);
       } else {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (categoryFilter !== 'all') params.append('category', categoryFilter);

        const data = await apiClient<{ products: StoreProduct[], categories: string[] }>(`/stores/${storeId}/products?${params}`);
        console.log('📦 Données reçues du serveur (Produits):', data);
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setProducts([]);
      setCategories([]);
    }
  }, [searchTerm, statusFilter, categoryFilter]);

  // Sélectionner/désélectionner un produit
  const toggleProductSelection = useCallback(async (storeId: string, productId: string) => {
    try {
      await apiClient(`/stores/${storeId}/products/${productId}/toggle`, {
        method: 'POST',
      });
      fetchStoreProducts(storeId);
    } catch (error) {
      console.error('Erreur lors de la sélection:', error);
    }
  }, [fetchStoreProducts]);

  // Importer les produits sélectionnés
  const importSelectedProducts = useCallback(async (storeId: string) => {
    setSyncingStatus(true);
    try {
      const data = await apiClient<{ message: string }>(`/stores/${storeId}/import-selected`, {
        method: 'POST',
      });
  toast.showToast({ type: 'info', title: 'Import', description: data.message });
      
      // 🔄 SYNCHRONISATION AUTOMATIQUE DU STATUT
      console.log('🔄 Synchronisation du statut après import...');
      
      // Recharger les produits pour mettre à jour les statuts
      await fetchStoreProducts(storeId);
      
      // Recharger les magasins pour mettre à jour les statistiques
      await fetchStores();
      
      // Déclencher un événement pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('productStatusChanged', {
        detail: { storeId, action: 'import' }
      }));
      
      // Rafraîchir les notifications du header
      window.dispatchEvent(new Event('refreshStoreNotifications'));
      
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      toast.showToast({ type: 'error', title: 'Import', description: `Erreur lors de l'import: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setSyncingStatus(false);
    }
  }, [fetchStoreProducts, fetchStores]);

  // Charger les catégories KAMRI pour la préparation
  const loadKamriCategories = useCallback(async () => {
    try {
      const response = await apiClientAuth.getCategories();
      if (response.data) {
        const categoriesData = response.data.data || response.data;
        const categoriesList = Array.isArray(categoriesData) ? categoriesData : [];
        setKamriCategories(categoriesList);
      }
    } catch (error) {
      console.error('Erreur chargement catégories KAMRI:', error);
    }
  }, []);

  // Préparer un produit CJ pour publication (créer en draft)
  const prepareProduct = useCallback(async (product: StoreProduct) => {
    if (!prepareFormData.categoryId) {
      toast.showToast({ type: 'error', title: 'Erreur', description: 'Veuillez sélectionner une catégorie' });
      return;
    }

    setPreparingProductId(product.id);
    try {
      console.log('🚀 Préparation du produit:', product.id, prepareFormData);
      const response = await apiClientAuth.prepareCJProduct(product.id, {
        categoryId: prepareFormData.categoryId,
        margin: prepareFormData.margin || 30,
      });

      console.log('📦 Réponse API complète:', JSON.stringify(response, null, 2));

      // Vérifier si la réponse est valide
      if (response.error) {
        console.error('❌ Erreur dans la réponse:', response.error);
        toast.showToast({
          type: 'error',
          title: 'Erreur',
          description: response.error || 'Impossible de préparer le produit'
        });
        setPreparingProductId(null);
        return;
      }

      if (response.data || response) {
        console.log('✅ Produit préparé avec succès:', response.data || response);
        toast.showToast({
          type: 'success',
          title: 'Succès',
          description: 'Produit préparé avec succès ! Il est maintenant en draft.'
        });
        setShowPrepareModal(false);
        setSelectedProductForPrepare(null);
        setPrepareFormData({ categoryId: '', margin: 30 });
        
        // Recharger les produits
        if (selectedStoreId) {
          await fetchStoreProducts(selectedStoreId);
          await fetchStores();
        }
        
        // Attendre un peu avant de rediriger pour laisser le temps à la DB
        setTimeout(() => {
          console.log('🔄 Redirection vers la page draft...');
          window.location.href = '/admin/products/draft';
        }, 1000);
      } else {
        console.error('❌ Réponse invalide:', response);
        toast.showToast({
          type: 'error',
          title: 'Erreur',
          description: 'Réponse invalide du serveur'
        });
        setPreparingProductId(null);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la préparation:', error);
      toast.showToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de préparer le produit'
      });
      setPreparingProductId(null);
    }
  }, [prepareFormData, selectedStoreId, fetchStoreProducts, fetchStores, toast]);

  const handlePrepareClick = (product: StoreProduct) => {
    setSelectedProductForPrepare(product);
    setPrepareFormData({ categoryId: '', margin: 30 });
    setShowPrepareModal(true);
    if (kamriCategories.length === 0) {
      loadKamriCategories();
    }
  };

  useEffect(() => {
    fetchStores();
    loadKamriCategories();
  }, [fetchStores, loadKamriCategories]);

  useEffect(() => {
    if (selectedStoreId) {
      fetchStoreProducts(selectedStoreId);
    }
  }, [selectedStoreId, fetchStoreProducts]);

  // 🔄 ÉCOUTER LES CHANGEMENTS DE STATUT DEPUIS D'AUTRES SECTIONS
  useEffect(() => {
    const handleProductStatusChange = () => {
      console.log('🔄 Changement de statut détecté, rechargement des produits...');
      if (selectedStoreId) {
        fetchStoreProducts(selectedStoreId);
        fetchStores();
      }
    };

    // Écouter les événements de changement de statut
    window.addEventListener('productStatusChanged', handleProductStatusChange);
    window.addEventListener('cjProductImported', handleProductStatusChange);
    
    return () => {
      window.removeEventListener('productStatusChanged', handleProductStatusChange);
      window.removeEventListener('cjProductImported', handleProductStatusChange);
    };
  }, [selectedStoreId, fetchStoreProducts, fetchStores]);

  const handleViewProducts = (storeId: string) => {
    setSelectedStoreId(storeId);
  };

  const handleCloseProducts = () => {
    setSelectedStoreId(null);
    setProducts([]);
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Chargement des magasins...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Magasins</h1>
        <p className="text-muted-foreground">
          Gérez vos magasins de produits et importez-les en lot.
        </p>
      </div>

      {selectedStoreId ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">
              Produits - {stores.find(s => s.id === selectedStoreId)?.name}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button onClick={handleCloseProducts} variant="outline">
                Fermer
              </Button>
              <Button 
                onClick={() => importSelectedProducts(selectedStoreId)}
                disabled={syncingStatus}
              >
                {syncingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Synchronisation...
                  </>
                ) : (
                  `Importer les sélectionnés (${products.filter(p => p.status === 'selected').length})`
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <Input
                placeholder="Rechercher des produits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="selected">Sélectionné</SelectItem>
                  <SelectItem value="imported">Importé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun produit trouvé dans ce magasin.</p>
                </div>
              ) : (
                products.map((product) => (
                  <Card
                    key={product.id}
                    className={`relative ${product.status === 'selected' ? 'border-2 border-primary' : ''}`}
                  >
                    <CardContent className="p-4">
                      {(() => {
                        const imageUrl = getCleanImageUrl(product.image);
                        return imageUrl && (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-32 object-cover rounded mb-3"
                            onError={(e) => {
                              console.log('❌ Erreur de chargement d\'image:', e.currentTarget.src);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        );
                      })()}
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-muted-foreground text-xs mb-1">
                        Catégorie: {product.category || 'N/A'}
                      </p>
                      <p className="text-lg font-bold text-primary mb-2">
                        {product.price ? `${product.price.toFixed(2)} $` : 'N/A'}
                      </p>
                      <Badge
                        className={`absolute top-2 right-2 ${
                          product.status === 'available' ? 'bg-green-500' :
                          product.status === 'selected' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}
                      >
                        {product.status}
                      </Badge>
                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          variant={product.status === 'selected' ? 'secondary' : 'default'}
                          className="w-full"
                          onClick={() => toggleProductSelection(selectedStoreId!, product.id)}
                          disabled={product.status === 'imported'}
                        >
                          {product.status === 'selected' ? 'Désélectionner' : 'Sélectionner'}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handlePrepareClick(product)}
                          disabled={product.status === 'imported' || preparingProductId === product.id}
                        >
                          {preparingProductId === product.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                              Préparation...
                            </>
                          ) : (
                            <>
                              <Edit className="w-3 h-3 mr-1" />
                              Préparer (Draft)
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          {/* Liste des magasins */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(stores) && stores.map((store) => (
              <Card
                key={store.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewProducts(store.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center">
                      <StoreIcon className="mr-2 h-5 w-5" /> {store.name}
                    </CardTitle>
                    <Badge
                      className={store.status === 'active' ? 'bg-green-500' : 'bg-red-500'}
                    >
                      {store.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <CardDescription>{store.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                      Total produits: {store.stats?.total || 0}
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                      Disponibles: {store.stats?.available || 0}
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                      Sélectionnés: {store.stats?.selected || 0}
                    </div>
                    <div className="flex items-center">
                      <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                      Importés: {store.stats?.imported || 0}
                    </div>
                    {store.config?.email && (
                      <div className="flex items-center col-span-2">
                        <span className="mr-2 text-muted-foreground">Email:</span> {store.config.email}
                      </div>
                    )}
                    {store.config?.tier && (
                      <div className="flex items-center col-span-2">
                        <span className="mr-2 text-muted-foreground">Tier:</span> {store.config.tier}
                      </div>
                    )}
                    {store.lastSync && (
                      <div className="flex items-center col-span-2">
                        <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                        Dernière synchro: {new Date(store.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <Button className="w-full mt-4" onClick={() => handleViewProducts(store.id)}>
                    Voir les produits
                  </Button>
                </CardContent>
              </Card>
            ))}


            {Array.isArray(stores) && stores.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun autre magasin disponible</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vos favoris CJ sont disponibles ci-dessus
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de préparation */}
      {showPrepareModal && selectedProductForPrepare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Préparer le produit pour publication</CardTitle>
              <CardDescription>
                Ce produit sera créé en draft pour que vous puissiez l'éditer avant publication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-2">{selectedProductForPrepare.name}</p>
                <p className="text-sm text-gray-600">
                  Prix: {selectedProductForPrepare.price.toFixed(2)}$
                  {selectedProductForPrepare.originalPrice && (
                    <span className="line-through ml-2">{selectedProductForPrepare.originalPrice.toFixed(2)}$</span>
                  )}
                </p>
              </div>

              <div>
                <Label htmlFor="category">Catégorie KAMRI *</Label>
                <Select
                  value={prepareFormData.categoryId}
                  onValueChange={(value) => setPrepareFormData({ ...prepareFormData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {kamriCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="margin">Marge (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  min="0"
                  max="500"
                  value={prepareFormData.margin}
                  onChange={(e) => setPrepareFormData({ ...prepareFormData, margin: Number(e.target.value) })}
                />
                {selectedProductForPrepare.originalPrice && (
                  <p className="text-sm text-gray-500 mt-1">
                    Prix calculé: {(selectedProductForPrepare.originalPrice * (1 + (prepareFormData.margin || 30) / 100)).toFixed(2)}$
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowPrepareModal(false);
                  setSelectedProductForPrepare(null);
                }}>
                  Annuler
                </Button>
                <Button
                  onClick={() => prepareProduct(selectedProductForPrepare)}
                  disabled={!prepareFormData.categoryId || preparingProductId === selectedProductForPrepare.id}
                >
                  {preparingProductId === selectedProductForPrepare.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Préparation...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Préparer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}