'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { Package, Search, Warehouse, Globe, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface InventoryStock {
  vid?: string;
  areaId?: number | string;
  areaEn?: string;
  countryCode: string;
  countryNameEn?: string;
  totalInventoryNum?: number;
  cjInventoryNum?: number;
  factoryInventoryNum?: number;
  storageNum?: number; // Déprécié
  totalInventory?: number; // Pour 3.3
  cjInventory?: number; // Pour 3.3
  factoryInventory?: number; // Pour 3.3
  verifiedWarehouse?: number; // Pour 3.3
}

export default function InventoryPage() {
  const [searchType, setSearchType] = useState<'vid' | 'sku'>('vid');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InventoryStock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.showToast({
        title: 'Erreur',
        description: 'Veuillez entrer un VID ou un SKU',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let response;
      
      if (searchType === 'vid') {
        response = await apiClient.getCJInventoryByVid(searchValue.trim());
      } else {
        response = await apiClient.getCJInventoryBySku(searchValue.trim());
      }

      if (response?.error) {
        setError(response.error);
        toast.showToast({
          title: 'Erreur',
          description: response.error,
          type: 'error'
        });
        return;
      }

      if (response?.data?.stock && Array.isArray(response.data.stock)) {
        setResults(response.data.stock);
        
        if (response.data.stock.length === 0) {
          toast.showToast({
            title: 'Aucun résultat',
            description: `Aucun stock trouvé pour ce ${searchType.toUpperCase()}`,
            type: 'info'
          });
        } else {
          const totalStock = response.data.stock.reduce(
            (sum: number, s: InventoryStock) => sum + (s.totalInventoryNum || s.totalInventory || 0),
            0
          );
          toast.showToast({
            title: 'Succès',
            description: `${response.data.stock.length} entrepôt(s) trouvé(s) - Stock total: ${totalStock}`,
            type: 'success'
          });
        }
      } else {
        setError('Format de réponse invalide');
        toast.showToast({
          title: 'Erreur',
          description: 'Format de réponse invalide',
          type: 'error'
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la récupération de l\'inventaire';
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

  const handleClear = () => {
    setSearchValue('');
    setResults([]);
    setError(null);
  };

  const getTotalStock = (stock: InventoryStock): number => {
    return stock.totalInventoryNum || stock.totalInventory || stock.storageNum || 0;
  };

  const getCJStock = (stock: InventoryStock): number => {
    return stock.cjInventoryNum || stock.cjInventory || 0;
  };

  const getFactoryStock = (stock: InventoryStock): number => {
    return stock.factoryInventoryNum || stock.factoryInventory || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventaire CJ Dropshipping</h1>
          <p className="text-gray-600 mt-2">
            Recherchez le stock disponible par variant (VID) ou par SKU
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Réinitialiser
        </Button>
      </div>

      {/* Search Card */}
      <Card className="kamri-card">
        <div className="p-6">
          <div className="space-y-4">
            {/* Search Type Toggle */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setSearchType('vid');
                  handleClear();
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  searchType === 'vid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Par VID (Variant ID)
              </button>
              <button
                onClick={() => {
                  setSearchType('sku');
                  handleClear();
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  searchType === 'sku'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Par SKU
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={searchType === 'vid' 
                    ? 'Entrez le VID (ex: 7874B45D-E971-4DC8-8F59-40530B0F6B77)'
                    : 'Entrez le SKU (ex: CJDS2012593)'
                  }
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleSearch();
                    }
                  }}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || !searchValue.trim()}
                className="kamri-button"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Rechercher
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="kamri-card border-red-200 bg-red-50">
          <div className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Erreur</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="kamri-card bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Résultats de la recherche
                  </h2>
                  <p className="text-sm text-gray-600">
                    {searchType === 'vid' ? 'VID' : 'SKU'}: <span className="font-mono font-semibold">{searchValue}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    {results.reduce((sum, s) => sum + getTotalStock(s), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Stock total</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Warehouse Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((stock, index) => {
              const totalStock = getTotalStock(stock);
              const cjStock = getCJStock(stock);
              const factoryStock = getFactoryStock(stock);

              return (
                <Card key={index} className="kamri-card">
                  <div className="p-6">
                    {/* Warehouse Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Warehouse className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {stock.areaEn || 'Entrepôt inconnu'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {stock.countryNameEn || stock.countryCode || 'N/A'}
                            </span>
                            {stock.countryCode && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                {stock.countryCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {stock.verifiedWarehouse !== undefined && (
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          stock.verifiedWarehouse === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {stock.verifiedWarehouse === 1 ? 'Vérifié' : 'Non vérifié'}
                        </div>
                      )}
                    </div>

                    {/* Stock Details */}
                    <div className="space-y-3">
                      {/* Total Stock */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Stock total</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {totalStock.toLocaleString()}
                        </span>
                      </div>

                      {/* Stock Breakdown */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* CJ Stock */}
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-xs text-blue-600 font-medium mb-1">Stock CJ</div>
                          <div className="text-lg font-bold text-blue-700">
                            {cjStock.toLocaleString()}
                          </div>
                          {totalStock > 0 && (
                            <div className="text-xs text-blue-500 mt-1">
                              {((cjStock / totalStock) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>

                        {/* Factory Stock */}
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="text-xs text-orange-600 font-medium mb-1">Stock Usine</div>
                          <div className="text-lg font-bold text-orange-700">
                            {factoryStock.toLocaleString()}
                          </div>
                          {totalStock > 0 && (
                            <div className="text-xs text-orange-500 mt-1">
                              {((factoryStock / totalStock) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      {stock.areaId && (
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>ID Entrepôt:</span>
                            <span className="font-mono">{stock.areaId}</span>
                          </div>
                          {stock.vid && (
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                              <span>VID:</span>
                              <span className="font-mono">{stock.vid}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && searchValue && (
        <Card className="kamri-card">
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun résultat
            </h3>
            <p className="text-gray-600">
              Aucun stock trouvé pour ce {searchType === 'vid' ? 'VID' : 'SKU'}. 
              Vérifiez que la valeur est correcte.
            </p>
          </div>
        </Card>
      )}

      {/* Initial State */}
      {!loading && results.length === 0 && !error && !searchValue && (
        <Card className="kamri-card">
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Rechercher un stock
            </h3>
            <p className="text-gray-600 mb-6">
              Utilisez le formulaire ci-dessus pour rechercher le stock d'un variant par VID ou par SKU.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Recherche par VID</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Recherchez le stock d'un variant spécifique en utilisant son identifiant unique (VID).
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Recherche par SKU</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Recherchez le stock en utilisant le SKU ou SPU du produit.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

