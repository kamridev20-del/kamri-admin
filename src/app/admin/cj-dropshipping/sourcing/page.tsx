'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Package, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SourcingRequest {
  id: string;
  cjSourcingId: string | null;
  productName: string;
  productImage: string;
  productUrl: string | null;
  price: number | null;
  remark: string | null;
  status: string;
  statusChinese: string | null;
  cjProductId: string | null;
  cjVariantSku: string | null;
  imported: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
  foundAt: string | null;
}

export default function SourcingPage() {
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    productName: '',
    productImage: '',
    productUrl: '',
    price: '',
    remark: ''
  });

  // Charger les demandes
  const loadRequests = async () => {
    try {
      const response = await fetch('/api/cj-dropshipping/sourcing');
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data);
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Créer une demande
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/cj-dropshipping/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Demande créée ! CJ va chercher ce produit.');
        setShowForm(false);
        setFormData({
          productName: '',
          productImage: '',
          productUrl: '',
          price: '',
          remark: ''
        });
        loadRequests();
      }
    } catch (error) {
      console.error('Erreur création demande:', error);
      alert('❌ Erreur lors de la création');
    }
  };

  // Rafraîchir toutes les demandes
  const handleRefreshAll = async () => {
    setRefreshing(true);
    
    try {
      const response = await fetch('/api/cj-dropshipping/sourcing/update-all', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        loadRequests();
      }
    } catch (error) {
      console.error('Erreur rafraîchissement:', error);
      alert('❌ Erreur lors du rafraîchissement');
    } finally {
      setRefreshing(false);
    }
  };

  // Rafraîchir une demande
  const handleRefreshOne = async (id: string) => {
    try {
      const response = await fetch(`/api/cj-dropshipping/sourcing/${id}/update-status`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        loadRequests();
      }
    } catch (error) {
      console.error('Erreur rafraîchissement:', error);
    }
  };

  // Importer le produit trouvé
  const handleImport = async (request: SourcingRequest) => {
    if (!request.cjProductId) return;
    
    if (!confirm(`Importer le produit ${request.productName} ?`)) return;
    
    try {
      const response = await fetch('/api/cj-dropshipping/products/' + request.cjProductId + '/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pid: request.cjProductId,
          isFavorite: false
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Marquer comme importé
        await fetch(`/api/cj-dropshipping/sourcing/${request.id}/mark-imported`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importedProductId: data.product.id
          })
        });
        
        alert('✅ Produit importé !');
        loadRequests();
      }
    } catch (error) {
      console.error('Erreur import:', error);
      alert('❌ Erreur lors de l\'import');
    }
  };

  // Badge statut
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw, label: 'En cours' },
      found: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Trouvé' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Échec' }
    };
    
    const { color, icon: Icon, label } = config[status as keyof typeof config] || config.pending;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Product Sourcing CJ
        </h1>
        <p className="text-gray-600">
          Demandez à CJ de trouver n'importe quel produit pour vous
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle Demande
        </button>
        
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Rafraîchissement...' : 'Rafraîchir Tout'}
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg border-2 border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Trouvés</p>
              <p className="text-2xl font-bold text-green-900">
                {requests.filter(r => r.status === 'found').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">En cours</p>
              <p className="text-2xl font-bold text-blue-900">
                {requests.filter(r => r.status === 'pending' || r.status === 'processing').length}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg border-2 border-purple-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Importés</p>
              <p className="text-2xl font-bold text-purple-900">
                {requests.filter(r => r.imported).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requests.map(request => (
          <div
            key={request.id}
            className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-purple-300 transition-all"
          >
            {/* Image */}
            <div className="relative mb-4">
              <img
                src={request.productImage}
                alt={request.productName}
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2">
                <StatusBadge status={request.status} />
              </div>
            </div>

            {/* Infos */}
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {request.productName}
            </h3>

            {request.price && (
              <p className="text-sm text-gray-600 mb-2">
                Prix demandé: ${request.price}
              </p>
            )}

            {request.cjProductId && (
              <p className="text-sm text-green-600 mb-2">
                ✅ Produit CJ: {request.cjProductId}
              </p>
            )}

            {request.remark && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                {request.remark}
              </p>
            )}

            {/* Dates */}
            <div className="text-xs text-gray-500 mb-3">
              <p>Créé: {new Date(request.createdAt).toLocaleDateString('fr-FR')}</p>
              {request.lastCheckedAt && (
                <p>Vérifié: {new Date(request.lastCheckedAt).toLocaleDateString('fr-FR')}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {!request.imported && request.status !== 'found' && (
                <button
                  onClick={() => handleRefreshOne(request.id)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 inline mr-1" />
                  Vérifier
                </button>
              )}
              
              {request.status === 'found' && !request.imported && (
                <button
                  onClick={() => handleImport(request)}
                  className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Package className="w-4 h-4 inline mr-1" />
                  Importer
                </button>
              )}
              
              {request.imported && (
                <div className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 text-sm text-center rounded-lg">
                  ✅ Importé
                </div>
              )}
              
              {request.productUrl && (
                <a
                  href={request.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire de création (modal) */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Nouvelle Demande de Sourcing
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  required
                  value={formData.productName}
                  onChange={(e) => setFormData({...formData, productName: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Ex: Wireless Earbuds Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de l'image *
                </label>
                <input
                  type="url"
                  required
                  value={formData.productImage}
                  onChange={(e) => setFormData({...formData, productImage: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL du produit source (AliExpress, Amazon, etc.)
                </label>
                <input
                  type="url"
                  value={formData.productUrl}
                  onChange={(e) => setFormData({...formData, productUrl: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix actuel (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="24.99"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarques (urgent, quantité souhaitée, branding, etc.)
                </label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Ex: Besoin urgent, je veux mon logo sur le produit"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Créer la Demande
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message si vide */}
      {requests.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucune demande de sourcing
          </h3>
          <p className="text-gray-600 mb-4">
            Créez votre première demande pour que CJ trouve un produit pour vous
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Créer une Demande
          </button>
        </div>
      )}
    </div>
  );
}

