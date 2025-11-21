'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Filter,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  User,
  Clock
} from 'lucide-react';

interface Dispute {
  id?: string; // dispute id (selon la doc 7.5)
  disputeId?: string; // alias pour compatibilité
  orderId?: string;
  orderNumber?: string;
  status?: string; // dispute status
  disputeReason?: string; // dispute reason
  money?: number | string; // final refund amount (USD)
  replacementAmount?: number | string; // Reissue amount (USD)
  resendOrderCode?: string; // Reissue order id
  finallyDeal?: number; // 1:Refund, 2: Reissue, 3: Reject
  createDate?: string; // create date
  createTime?: string; // alias pour compatibilité
  updateTime?: string;
  productList?: Array<{
    lineItemId?: string;
    cjProductId?: string;
    cjVariantId?: string;
    productName?: string; // selon la doc 7.5
    cjProductName?: string; // alias pour compatibilité
    image?: string; // selon la doc 7.5
    cjImage?: string; // alias pour compatibilité
    sku?: string;
    supplierName?: string;
    quantity?: number;
    price?: number;
  }>;
  messageText?: string;
  imageUrl?: string[];
  videoUrl?: string[];
}

interface DisputeProduct {
  lineItemId: string;
  cjProductId?: string;
  cjVariantId?: string;
  canChoose?: boolean;
  price?: number;
  quantity?: number;
  cjProductName?: string;
  cjImage?: string;
  sku?: string;
  supplierName?: string;
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtres
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchDisputeId, setSearchDisputeId] = useState('');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  
  // Création de dispute
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [disputeProducts, setDisputeProducts] = useState<DisputeProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Formulaire de création
  const [createForm, setCreateForm] = useState({
    businessDisputeId: '',
    disputeReasonId: 1,
    expectType: 1, // 1: Refund, 2: Reissue
    refundType: 1, // 1: balance, 2: platform
    messageText: '',
    imageUrl: [] as string[],
    videoUrl: [] as string[],
    selectedProducts: [] as Array<{
      lineItemId: string;
      quantity: string;
      price: number;
    }>
  });

  const toast = useToast();

  useEffect(() => {
    loadDisputes();
    loadAnalytics();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        pageNum: 1,
        pageSize: 50
      };
      
      if (searchOrderId) params.orderId = searchOrderId;
      if (searchDisputeId) params.disputeId = parseInt(searchDisputeId);
      if (searchOrderNumber) params.orderNumber = searchOrderNumber;
      
      const response = await apiClient.getCJDisputeList(params);
      
      if (response?.error) {
        setError(response.error);
        toast.showToast({
          title: 'Erreur',
          description: response.error,
          type: 'error'
        });
        return;
      }
      
      if (response?.data?.disputes) {
        let filtered = response.data.disputes;
        
        // ✅ Normaliser les disputes selon la structure de la doc 7.5
        filtered = filtered.map((d: any) => ({
          ...d,
          disputeId: d.id || d.disputeId, // Utiliser id comme disputeId
          createTime: d.createDate || d.createTime, // Utiliser createDate comme createTime
          productList: d.productList?.map((p: any) => ({
            ...p,
            cjProductName: p.productName || p.cjProductName,
            cjImage: p.image || p.cjImage
          })) || d.productList
        }));
        
        // Filtrer par statut si nécessaire
        if (statusFilter !== 'Tous') {
          filtered = filtered.filter((d: Dispute) => 
            d.status?.toLowerCase() === statusFilter.toLowerCase()
          );
        }
        
        setDisputes(filtered);
        
        toast.showToast({
          title: 'Succès',
          description: `${filtered.length} litige(s) trouvé(s) sur ${response.data.total || 0} total`,
          type: 'success'
        });
      } else {
        setDisputes([]);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des litiges';
      setError(errorMessage);
      toast.showToast({
        title: 'Erreur',
        description: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    
    try {
      const response = await apiClient.getCJDisputeAnalytics();
      
      if (response?.data?.analytics) {
        setAnalytics(response.data.analytics);
      }
    } catch (err) {
      console.error('Erreur chargement analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleSearch = () => {
    loadDisputes();
  };

  const handleLoadDisputeProducts = async (orderId: string) => {
    if (!orderId.trim()) {
      toast.showToast({
        title: 'Erreur',
        description: 'Veuillez entrer un ID de commande',
        type: 'error'
      });
      return;
    }

    setLoadingProducts(true);
    setDisputeProducts([]);
    setSelectedOrderId(orderId);
    
    try {
      const response = await apiClient.getCJDisputeProducts(orderId);
      
      if (response?.error) {
        toast.showToast({
          title: 'Erreur',
          description: response.error,
          type: 'error'
        });
        return;
      }
      
      if (response?.data?.disputeProducts?.productInfoList) {
        setDisputeProducts(response.data.disputeProducts.productInfoList);
        setShowCreateModal(true);
        
        // Pré-remplir le formulaire
        // ✅ Générer un businessDisputeId unique (customer business id)
        const businessDisputeId = `KAMRI-${Date.now()}-${orderId.substring(0, 8)}`;
        
        setCreateForm(prev => ({
          ...prev,
          businessDisputeId: businessDisputeId,
          selectedProducts: response.data.disputeProducts.productInfoList.map((p: DisputeProduct) => ({
            lineItemId: p.lineItemId,
            quantity: String(p.quantity || 1),
            price: p.price || 0 // ✅ Price est requis selon la doc
          }))
        }));
      } else {
        toast.showToast({
          title: 'Aucun résultat',
          description: 'Aucun produit en litige trouvé pour cette commande',
          type: 'info'
        });
      }
    } catch (err: any) {
      toast.showToast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la récupération des produits',
        type: 'error'
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!selectedOrderId) {
      toast.showToast({
        title: 'Erreur',
        description: 'Aucune commande sélectionnée',
        type: 'error'
      });
      return;
    }

    if (!createForm.businessDisputeId.trim()) {
      toast.showToast({
        title: 'Erreur',
        description: 'ID business manquant',
        type: 'error'
      });
      return;
    }

    if (createForm.selectedProducts.length === 0) {
      toast.showToast({
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un produit',
        type: 'error'
      });
      return;
    }

    // ✅ Validation: tous les produits doivent avoir un price (requis selon la doc)
    const productsWithoutPrice = createForm.selectedProducts.filter(p => p.price === undefined || p.price === null);
    if (productsWithoutPrice.length > 0) {
      toast.showToast({
        title: 'Erreur',
        description: 'Tous les produits doivent avoir un prix',
        type: 'error'
      });
      return;
    }

    if (!createForm.messageText.trim()) {
      toast.showToast({
        title: 'Erreur',
        description: 'Veuillez entrer un message de réclamation',
        type: 'error'
      });
      return;
    }

    // ✅ Validation: message max 500 caractères selon la doc
    if (createForm.messageText.length > 500) {
      toast.showToast({
        title: 'Erreur',
        description: 'Le message ne peut pas dépasser 500 caractères',
        type: 'error'
      });
      return;
    }

    setCreating(true);
    
    try {
      const response = await apiClient.createCJDispute({
        orderId: selectedOrderId,
        businessDisputeId: createForm.businessDisputeId || `DISPUTE-${Date.now()}-${selectedOrderId}`,
        disputeReasonId: createForm.disputeReasonId,
        expectType: createForm.expectType,
        refundType: createForm.refundType,
        messageText: createForm.messageText,
        imageUrl: createForm.imageUrl,
        videoUrl: createForm.videoUrl,
        productInfoList: createForm.selectedProducts
      });
      
      if (response?.error) {
        toast.showToast({
          title: 'Erreur',
          description: response.error,
          type: 'error'
        });
        return;
      }
      
      toast.showToast({
        title: 'Succès',
        description: `Litige créé avec succès. ID: ${response.data?.disputeId || 'N/A'}`,
        type: 'success'
      });
      
      setShowCreateModal(false);
      setCreateForm({
        businessDisputeId: '',
        disputeReasonId: 1,
        expectType: 1,
        refundType: 1,
        messageText: '',
        imageUrl: [],
        videoUrl: [],
        selectedProducts: []
      });
      setDisputeProducts([]);
      setSelectedOrderId('');
      
      // Recharger la liste
      loadDisputes();
    } catch (err: any) {
      toast.showToast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la création du litige',
        type: 'error'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCancelDispute = async (orderId: string, disputeId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce litige ?')) {
      return;
    }

    try {
      const response = await apiClient.cancelCJDispute({ orderId, disputeId });
      
      if (response?.error) {
        toast.showToast({
          title: 'Erreur',
          description: response.error,
          type: 'error'
        });
        return;
      }
      
      toast.showToast({
        title: 'Succès',
        description: 'Litige annulé avec succès',
        type: 'success'
      });
      
      loadDisputes();
    } catch (err: any) {
      toast.showToast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de l\'annulation du litige',
        type: 'error'
      });
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const s = status.toLowerCase();
    if (s.includes('pending') || s.includes('waiting')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('resolved') || s.includes('closed')) return 'bg-green-100 text-green-800';
    if (s.includes('rejected') || s.includes('cancelled')) return 'bg-red-100 text-red-800';
    if (s.includes('processing') || s.includes('open')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('fr-FR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Litiges CJ Dropshipping</h1>
          <p className="text-gray-600 mt-2">
            Gérez les réclamations et litiges de vos commandes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadDisputes();
              loadAnalytics();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="kamri-card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Litiges</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.total || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </Card>
          
          <Card className="kamri-card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Remboursements</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(analytics.totalRefundAmount || 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </Card>
          
          <Card className="kamri-card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Réémissions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${(analytics.totalReissueAmount || 0).toFixed(2)}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </Card>
          
          <Card className="kamri-card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En Attente</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {analytics.byStatus?.pending || analytics.byStatus?.waiting || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="kamri-card">
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Recherche et Filtres</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Commande
                </label>
                <Input
                  placeholder="Entrez l'ID de la commande"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleSearch();
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de Commande
                </label>
                <Input
                  placeholder="Entrez le numéro de commande"
                  value={searchOrderNumber}
                  onChange={(e) => setSearchOrderNumber(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleSearch();
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Litige
                </label>
                <Input
                  placeholder="Entrez l'ID du litige"
                  value={searchDisputeId}
                  onChange={(e) => setSearchDisputeId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleSearch();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Tous">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="processing">En traitement</option>
                  <option value="resolved">Résolu</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-6">
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="kamri-button"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchOrderId('');
                    setSearchOrderNumber('');
                    setSearchDisputeId('');
                    setStatusFilter('Tous');
                    loadDisputes();
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Create Dispute Section */}
      <Card className="kamri-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Créer un Litige</h3>
              <p className="text-sm text-gray-600">Récupérez les produits en litige pour une commande</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Input
              placeholder="Entrez l'ID de la commande"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="flex-1"
              disabled={loadingProducts}
            />
            <Button
              onClick={() => handleLoadDisputeProducts(selectedOrderId)}
              disabled={loadingProducts || !selectedOrderId.trim()}
              className="kamri-button"
            >
              {loadingProducts ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Charger les Produits
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Disputes List */}
      {error && (
        <Card className="kamri-card border-red-200 bg-red-50">
          <div className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Erreur</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="kamri-card">
          <div className="p-12 text-center">
            <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Chargement des litiges...</p>
          </div>
        </Card>
      ) : disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map((dispute, index) => (
            <Card key={index} className="kamri-card">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Litige #{dispute.id || dispute.disputeId || 'N/A'}
                      </h3>
                      {dispute.status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                          {dispute.status}
                        </span>
                      )}
                      {dispute.finallyDeal && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          dispute.finallyDeal === 1 ? 'bg-green-100 text-green-800' :
                          dispute.finallyDeal === 2 ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {dispute.finallyDeal === 1 ? 'Remboursement' :
                           dispute.finallyDeal === 2 ? 'Réémission' :
                           'Rejeté'}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Commande:</span>
                        <p className="font-mono font-semibold">{dispute.orderId || 'N/A'}</p>
                        {dispute.orderNumber && (
                          <p className="text-xs text-gray-400">#{dispute.orderNumber}</p>
                        )}
                        {dispute.resendOrderCode && (
                          <p className="text-xs text-blue-600">Réémission: #{dispute.resendOrderCode}</p>
                        )}
                      </div>
                      
                      {dispute.disputeReason && (
                        <div>
                          <span className="text-gray-500">Raison:</span>
                          <p className="font-medium">{dispute.disputeReason}</p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-gray-500">Montants:</span>
                        {dispute.money && (
                          <p className="font-bold text-green-600">
                            Remboursement: ${typeof dispute.money === 'string' ? parseFloat(dispute.money).toFixed(2) : dispute.money.toFixed(2)}
                          </p>
                        )}
                        {dispute.replacementAmount && (
                          <p className="font-bold text-blue-600">
                            Réémission: ${typeof dispute.replacementAmount === 'string' ? parseFloat(dispute.replacementAmount).toFixed(2) : dispute.replacementAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Créé:</span>
                        <p className="text-xs">{formatDate(dispute.createDate || dispute.createTime)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {(dispute.id || dispute.disputeId) && dispute.orderId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelDispute(dispute.orderId!, dispute.id || dispute.disputeId!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
                
                {dispute.messageText && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{dispute.messageText}</p>
                  </div>
                )}
                
                {dispute.productList && dispute.productList.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Produits concernés:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dispute.productList.map((product, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          {(product.image || product.cjImage) && (
                            <img
                              src={product.image || product.cjImage}
                              alt={product.productName || product.cjProductName || 'Produit'}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{product.productName || product.cjProductName || 'Produit inconnu'}</p>
                            {product.sku && (
                              <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            )}
                            {product.quantity && (
                              <p className="text-xs text-gray-500">Qté: {product.quantity}</p>
                            )}
                            {product.price && (
                              <p className="text-xs font-semibold text-green-600">${product.price.toFixed(2)}</p>
                            )}
                            {product.supplierName && (
                              <p className="text-xs text-gray-400">Fournisseur: {product.supplierName}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="kamri-card">
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun litige trouvé
            </h3>
            <p className="text-gray-600">
              Aucun litige ne correspond à vos critères de recherche.
            </p>
          </div>
        </Card>
      )}

      {/* Create Dispute Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="kamri-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Créer un Litige</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCreateModal(false);
                    setDisputeProducts([]);
                    setSelectedOrderId('');
                  }}
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              
              {disputeProducts.length > 0 ? (
                <div className="space-y-6">
                  {/* Produits en litige */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Produits en Litige</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {disputeProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          {product.cjImage && (
                            <img
                              src={product.cjImage}
                              alt={product.cjProductName || 'Produit'}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{product.cjProductName || 'Produit inconnu'}</p>
                            {product.sku && (
                              <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            )}
                            {product.price && (
                              <p className="text-sm font-semibold text-green-600">
                                ${product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Qté: {product.quantity || 1}</p>
                            {product.canChoose === false && (
                              <span className="text-xs text-red-600">Non sélectionnable</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Formulaire */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Raison du Litige
                      </label>
                      <select
                        value={createForm.disputeReasonId}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, disputeReasonId: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value={1}>Produit défectueux</option>
                        <option value={2}>Produit non reçu</option>
                        <option value={3}>Produit incorrect</option>
                        <option value={4}>Produit endommagé</option>
                        <option value={5}>Autre</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type d'Attente
                        </label>
                        <select
                          value={createForm.expectType}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, expectType: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value={1}>Remboursement</option>
                          <option value={2}>Réémission</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type de Remboursement
                        </label>
                        <select
                          value={createForm.refundType}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, refundType: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value={1}>Solde</option>
                          <option value={2}>Plateforme</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message de Réclamation * (max 500 caractères)
                      </label>
                      <textarea
                        value={createForm.messageText}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, messageText: e.target.value }))}
                        placeholder="Décrivez le problème rencontré..."
                        rows={4}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {createForm.messageText.length}/500 caractères
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCreateDispute}
                        disabled={creating || !createForm.messageText.trim()}
                        className="kamri-button flex-1"
                      >
                        {creating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Création...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Créer le Litige
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateModal(false);
                          setDisputeProducts([]);
                          setSelectedOrderId('');
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Chargement des produits en litige...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

