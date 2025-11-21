'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/contexts/ToastContext';
import { useCJDropshipping } from '@/hooks/useCJDropshipping';
import { CJWebhookLog } from '@/types/cj.types';
import { useEffect, useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function CJWebhooksPage() {
  const {
    loading,
    error,
    configureWebhooks,
    getWebhookStatus,
    getWebhookLogs,
    importProduct,
  } = useCJDropshipping();

  const [webhookLogs, setWebhookLogs] = useState<CJWebhookLog[]>([]);
  const [configuring, setConfiguring] = useState(false);
  const [webhooksEnabled, setWebhooksEnabled] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<('product' | 'stock' | 'order' | 'logistics')[]>(['product', 'stock', 'order', 'logistics']);
  const [copied, setCopied] = useState(false);
  const [importingPids, setImportingPids] = useState<Set<string>>(new Set());
  const toast = useToast();

  useEffect(() => {
    loadWebhookLogs();
    loadWebhookStatus();
    // Détecter automatiquement l'URL ngrok ou utiliser l'URL par défaut
    detectCallbackUrl();
  }, []);

  const detectCallbackUrl = () => {
    // Détecter automatiquement l'URL ngrok depuis window.location si disponible
    // Sinon, utiliser l'URL par défaut
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isNgrok = currentHost.includes('ngrok') || currentHost.includes('ngrok-free.dev');
    
    if (isNgrok && typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      setCallbackUrl(`${protocol}//${host}/api/cj-dropshipping/webhooks`);
    } else {
      // URL par défaut (sera remplacée par ngrok en production)
      setCallbackUrl('https://pinacoidal-pat-unlasting.ngrok-free.dev/api/cj-dropshipping/webhooks');
    }
  };

  const loadWebhookStatus = async () => {
    try {
      const response = await getWebhookStatus();
      if (response?.data) {
        setWebhookStatus(response.data);
        setWebhooksEnabled(response.data.enabled || false);
        if (response.data.callbackUrl) {
          setCallbackUrl(response.data.callbackUrl);
        }
        if (response.data.types && Array.isArray(response.data.types)) {
          setSelectedTypes(response.data.types as any);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement du statut:', err);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const response = await getWebhookLogs();
      // L'API retourne { logs: [], total, page, limit }
      const logs = response?.data?.logs || response?.logs || response || [];
      setWebhookLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error('Erreur lors du chargement des logs:', err);
      setWebhookLogs([]);
    }
  };

  const handleConfigureWebhooks = async (enable: boolean) => {
    if (enable && !callbackUrl) {
      toast.showToast({ type: 'error', title: 'Webhooks', description: '❌ URL de callback requise pour activer les webhooks' });
      return;
    }

    if (enable && !callbackUrl.startsWith('https://')) {
      toast.showToast({ type: 'error', title: 'Webhooks', description: '❌ L\'URL de callback doit utiliser HTTPS (utilisez ngrok pour le développement local)' });
      return;
    }

    setConfiguring(true);
    try {
      const result = await configureWebhooks(enable, enable ? callbackUrl : undefined, enable ? selectedTypes : undefined);
      setWebhooksEnabled(enable);
      if (result?.result) {
        toast.showToast({ type: 'success', title: 'Webhooks', description: enable ? '✅ Webhooks activés avec succès' : '✅ Webhooks désactivés avec succès' });
        await loadWebhookStatus();
      } else {
        toast.showToast({ type: 'error', title: 'Webhooks', description: result?.message || '❌ Erreur lors de la configuration des webhooks' });
      }
    } catch (err: any) {
      toast.showToast({ type: 'error', title: 'Webhooks', description: err?.response?.data?.message || '❌ Erreur lors de la configuration des webhooks' });
    } finally {
      setConfiguring(false);
    }
  };

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined' && callbackUrl) {
      navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.showToast({ type: 'success', title: 'Copié', description: 'URL copiée dans le presse-papiers' });
    }
  };

  const toggleWebhookType = (type: 'product' | 'stock' | 'order' | 'logistics') => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getWebhookTypeColor = (type: string) => {
    switch (type) {
      case 'PRODUCT':
        return 'bg-blue-100 text-blue-800';
      case 'STOCK':
        return 'bg-green-100 text-green-800';
      case 'ORDER':
        return 'bg-purple-100 text-purple-800';
      case 'LOGISTICS':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWebhookTypeText = (type: string) => {
    switch (type) {
      case 'PRODUCT':
        return 'Produit';
      case 'STOCK':
        return 'Stock';
      case 'ORDER':
        return 'Commande';
      case 'LOGISTICS':
        return 'Logistique';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ✅ Nettoyer un nom de produit (peut être un array JSON stringifié)
  const cleanProductName = (name: string | any): string => {
    if (!name) return 'N/A';
    
    // Si c'est déjà une string, vérifier si c'est un JSON array
    if (typeof name === 'string') {
      // Si c'est un tableau JSON stringifié, extraire le premier élément
      try {
        if (name.startsWith('[') && name.endsWith(']')) {
          const parsed = JSON.parse(name);
          if (Array.isArray(parsed) && parsed.length > 0) {
            name = parsed[0];
          }
        }
      } catch (e) {
        // Si ce n'est pas du JSON valide, garder le nom tel quel
      }
      
      // Nettoyer les caractères spéciaux et HTML
      return name
        .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
        .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par des espaces
        .replace(/&amp;/g, '&') // Remplacer &amp; par &
        .replace(/&lt;/g, '<') // Remplacer &lt; par <
        .replace(/&gt;/g, '>') // Remplacer &gt; par >
        .replace(/&quot;/g, '"') // Remplacer &quot; par "
        .replace(/&#39;/g, "'") // Remplacer &#39; par '
        .trim();
    }
    
    // Si c'est un array, prendre le premier élément
    if (Array.isArray(name) && name.length > 0) {
      return String(name[0]).trim();
    }
    
    return String(name || 'N/A').trim();
  };

  // ✅ Nettoyer une description de produit
  const cleanProductDescription = (description: string | any): string => {
    if (!description) return '';
    
    let desc = typeof description === 'string' ? description : String(description);
    
    // Supprimer les balises HTML
    desc = desc
      .replace(/<[^>]*>/g, '') // Supprimer toutes les balises HTML
      .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par des espaces
      .replace(/&amp;/g, '&') // Remplacer &amp; par &
      .replace(/&lt;/g, '<') // Remplacer &lt; par <
      .replace(/&gt;/g, '>') // Remplacer &gt; par >
      .replace(/&quot;/g, '"') // Remplacer &quot; par "
      .replace(/&#39;/g, "'") // Remplacer &#39; par '
      .trim();
    
    // Limiter la longueur pour l'affichage
    if (desc.length > 200) {
      desc = desc.substring(0, 200) + '...';
    }
    
    return desc;
  };

  // ✅ Nettoyer le payload complet pour l'affichage (récursif)
  const cleanPayloadForDisplay = (obj: any): any => {
    if (!obj) return obj;
    
    if (typeof obj === 'string') {
      // Si c'est un JSON array stringifié, le parser et nettoyer
      try {
        if (obj.startsWith('[') && obj.endsWith(']')) {
          const parsed = JSON.parse(obj);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return cleanProductName(parsed[0]);
          }
        }
      } catch (e) {
        // Pas un JSON valide, retourner tel quel
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => cleanPayloadForDisplay(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (key === 'productName' || key === 'productNameEn' || key === 'variantName') {
          cleaned[key] = cleanProductName(obj[key]);
        } else if (key === 'productDescription' || key === 'description') {
          cleaned[key] = cleanProductDescription(obj[key]);
        } else {
          cleaned[key] = cleanPayloadForDisplay(obj[key]);
        }
      }
      return cleaned;
    }
    
    return obj;
  };

  // Formater le payload JSON pour un affichage lisible
  const formatPayload = (payload: string | any): any => {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch (e) {
        return payload;
      }
    }
    return payload;
  };

  // Extraire les informations importantes du payload selon le type
  const extractPayloadInfo = (log: CJWebhookLog) => {
    const payload = formatPayload(log.payload);
    const params = payload?.params || payload || {};

    if (log.type === 'VARIANT') {
      return {
        pid: params.pid || 'N/A',
        vid: params.vid || 'N/A',
        variantName: cleanProductName(params.variantNameEn || params.variantName || 'N/A'), // ✅ Prioriser l'anglais, puis nettoyer le nom
        variantSku: params.variantSku || 'N/A',
        variantSellPrice: params.variantSellPrice || 'N/A',
        variantImage: params.variantImage || null,
        variantKey: params.variantKey || 'N/A',
        variantValue1: params.variantValue1 || 'N/A',
        variantValue2: params.variantValue2 || 'N/A',
        variantWeight: params.variantWeight || 'N/A',
        variantLength: params.variantLength || 'N/A',
        variantWidth: params.variantWidth || 'N/A',
        variantHeight: params.variantHeight || 'N/A',
        fields: params.fields || []
      };
    } else if (log.type === 'PRODUCT') {
      return {
        pid: params.pid || 'N/A',
        productName: cleanProductName(params.productNameEn || params.productName || 'N/A'), // ✅ Prioriser l'anglais, puis nettoyer le nom
        productSku: params.productSku || 'N/A',
        productSellPrice: params.productSellPrice || 'N/A',
        productImage: params.productImage || null,
        categoryName: params.categoryName || 'N/A',
        productDescription: cleanProductDescription(params.productDescription || ''), // ✅ Nettoyer la description
        fields: params.fields || []
      };
    } else if (log.type === 'STOCK') {
      return {
        variants: Object.keys(params).length || 0,
        stockData: params
      };
    } else if (log.type === 'ORDER') {
      return {
        orderNumber: params.orderNumber || 'N/A',
        cjOrderId: params.cjOrderId || 'N/A',
        orderStatus: params.orderStatus || 'N/A',
        fields: params.fields || []
      };
    }

    return params;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Webhooks CJ Dropshipping
        </h1>
        <p className="text-gray-600">
          Configurez et surveillez les webhooks CJ Dropshipping
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Configuration des webhooks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Statut des webhooks</p>
                <p className={`text-sm ${
                  webhooksEnabled ? 'text-green-600' : 'text-red-600'
                }`}>
                  {webhooksEnabled ? 'Activés' : 'Désactivés'}
                </p>
                {webhookStatus?.callbackUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    URL: {webhookStatus.callbackUrl}
                  </p>
                )}
              </div>
              <div className={`w-3 h-3 rounded-full ${
                webhooksEnabled ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>

            {/* Champ URL de callback */}
            <div className="space-y-2">
              <Label htmlFor="callbackUrl">URL de callback (HTTPS requis)</Label>
              <div className="flex gap-2">
                <Input
                  id="callbackUrl"
                  type="text"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://votre-domaine.com/api/cj-dropshipping/webhooks"
                  className="flex-1"
                  disabled={configuring}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  title="Copier l'URL"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                💡 Pour le développement local, utilisez ngrok : <code className="bg-gray-100 px-1 rounded">ngrok http 3001</code>
              </p>
            </div>

            {/* Sélection des types de webhooks */}
            <div className="space-y-2">
              <Label>Types de webhooks à activer</Label>
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                {[
                  { value: 'product' as const, label: 'Product - Changements de produits' },
                  { value: 'stock' as const, label: 'Stock - Mises à jour de stock' },
                  { value: 'order' as const, label: 'Order - Changements de commandes' },
                  { value: 'logistics' as const, label: 'Logistics - Informations de tracking' }
                ].map(({ value, label }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`webhook-type-${value}`}
                      checked={selectedTypes.includes(value)}
                      onCheckedChange={() => toggleWebhookType(value)}
                      disabled={configuring}
                    />
                    <Label
                      htmlFor={`webhook-type-${value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleConfigureWebhooks(true)}
                disabled={configuring || webhooksEnabled || !callbackUrl || selectedTypes.length === 0}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {configuring ? 'Configuration...' : 'Activer les webhooks'}
              </Button>
              
              <Button
                onClick={() => handleConfigureWebhooks(false)}
                disabled={configuring || !webhooksEnabled}
                variant="outline"
                className="w-full"
              >
                Désactiver les webhooks
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Informations</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={loadWebhookStatus}
              disabled={loading}
            >
              Actualiser
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">URL du webhook configurée</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <code className="text-sm break-all">
                  {webhookStatus?.callbackUrl || callbackUrl || 'Aucune URL configurée'}
                </code>
              </div>
              {webhookStatus?.lastUpdated && (
                <p className="text-xs text-gray-500 mt-2">
                  Dernière mise à jour : {new Date(webhookStatus.lastUpdated).toLocaleString('fr-FR')}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">Types d'événements configurés</h3>
              <div className="space-y-1">
                {webhookStatus?.types && webhookStatus.types.length > 0 ? (
                  webhookStatus.types.map((type: string) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        type === 'product' ? 'bg-blue-500' :
                        type === 'stock' ? 'bg-green-500' :
                        type === 'order' ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`}></span>
                      <span className="text-sm">
                        {type === 'product' ? 'PRODUCT - Changements de produits' :
                         type === 'stock' ? 'STOCK - Mises à jour de stock' :
                         type === 'order' ? 'ORDER - Changements de commandes' :
                         'LOGISTICS - Informations de tracking'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Aucun type configuré</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Types d'événements disponibles</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-sm">PRODUCT - Changements de produits</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm">STOCK - Mises à jour de stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span className="text-sm">ORDER - Changements de commandes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="text-sm">LOGISTICS - Informations de tracking</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Statistiques des webhooks */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Statistiques</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {webhookLogs.length}
            </div>
            <div className="text-sm text-gray-600">Total reçus</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {webhookLogs.filter(log => log.status === 'PROCESSED').length}
            </div>
            <div className="text-sm text-gray-600">Traités</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {webhookLogs.filter(log => log.status === 'ERROR' || log.error).length}
            </div>
            <div className="text-sm text-gray-600">Erreurs</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {webhookLogs.filter(log => 
                new Date(log.receivedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <div className="text-sm text-gray-600">Récents (24h)</div>
          </div>
        </div>
      </Card>

      {/* Logs des webhooks */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Logs des webhooks</h2>
          <Button
            onClick={loadWebhookLogs}
            variant="outline"
            size="sm"
          >
            Actualiser
          </Button>
        </div>

        {webhookLogs.length > 0 ? (
          <div className="space-y-4">
            {webhookLogs.slice(0, 50).map((log) => {
              const payloadInfo = extractPayloadInfo(log);
              const payload = formatPayload(log.payload);
              
              return (
                <div key={log.id} className={`border rounded-lg p-4 ${
                  log.status === 'ERROR' ? 'border-red-300 bg-red-50/30' :
                  log.status === 'PROCESSED' ? 'border-green-300 bg-green-50/30' :
                  'border-gray-200 bg-white'
                }`}>
                  {/* En-tête */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getWebhookTypeColor(log.type)}`}>
                        {getWebhookTypeText(log.type)}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {log.messageId.substring(0, 8)}...
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.receivedAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'PROCESSED' ? 'bg-green-500' : 
                        log.status === 'ERROR' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></span>
                      <span className="text-xs font-medium text-gray-600">
                        {log.status === 'PROCESSED' ? 'Traité' : 
                         log.status === 'ERROR' ? 'Erreur' : 'En attente'}
                      </span>
                      {log.processingTimeMs && (
                        <span className="text-xs text-gray-400">
                          ({log.processingTimeMs}ms)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informations principales selon le type */}
                  {log.type === 'VARIANT' && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Produit ID:</span>
                          <span className="ml-2 font-mono text-xs">{payloadInfo.pid}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Variante ID:</span>
                          <span className="ml-2 font-mono text-xs">{payloadInfo.vid}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">SKU:</span>
                          <span className="ml-2 font-mono text-xs">{payloadInfo.variantSku}</span>
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-gray-500">Nom:</span>
                          <span className="ml-2">{payloadInfo.variantName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Prix:</span>
                          <span className="ml-2 font-semibold">{payloadInfo.variantSellPrice} $</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Poids:</span>
                          <span className="ml-2">{payloadInfo.variantWeight} g</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Dimensions:</span>
                          <span className="ml-2">{payloadInfo.variantLength}×{payloadInfo.variantWidth}×{payloadInfo.variantHeight}</span>
                        </div>
                        {payloadInfo.variantImage && (
                          <div className="col-span-2 md:col-span-3">
                            <img 
                              src={payloadInfo.variantImage} 
                              alt={payloadInfo.variantName}
                              className="w-20 h-20 object-cover rounded border border-gray-200"
                            />
                          </div>
                        )}
                        {payloadInfo.fields && payloadInfo.fields.length > 0 && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="text-gray-500">Champs modifiés:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {payloadInfo.fields.map((field: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {log.type === 'PRODUCT' && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Produit ID:</span>
                          <span className="ml-2 font-mono text-xs">{payloadInfo.pid}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">SKU:</span>
                          <span className="ml-2 font-mono text-xs">{payloadInfo.productSku}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Prix:</span>
                          <span className="ml-2 font-semibold">{payloadInfo.productSellPrice} $</span>
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-gray-500">Nom:</span>
                          <span className="ml-2">{payloadInfo.productName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Catégorie:</span>
                          <span className="ml-2">{payloadInfo.categoryName}</span>
                        </div>
                        {payloadInfo.productImage && (
                          <div className="col-span-2 md:col-span-3">
                            <img 
                              src={Array.isArray(payloadInfo.productImage) ? payloadInfo.productImage[0] : payloadInfo.productImage} 
                              alt={payloadInfo.productName}
                              className="w-20 h-20 object-cover rounded border border-gray-200"
                            />
                          </div>
                        )}
                        {payloadInfo.fields && payloadInfo.fields.length > 0 && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="text-gray-500">Champs modifiés:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {payloadInfo.fields.map((field: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {log.type === 'STOCK' && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-500">Variantes mises à jour:</span>
                        <span className="ml-2 font-semibold">{payloadInfo.variants}</span>
                      </div>
                    </div>
                  )}

                  {log.type === 'ORDER' && (
                    <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Commande:</span>
                          <span className="ml-2 font-mono text-xs">{payloadInfo.orderNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">ID CJ:</span>
                          <span className="ml-2 font-mono text-xs">{payloadInfo.cjOrderId}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Statut:</span>
                          <span className="ml-2 font-semibold">{payloadInfo.orderStatus}</span>
                        </div>
                        {payloadInfo.fields && payloadInfo.fields.length > 0 && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="text-gray-500">Champs modifiés:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {payloadInfo.fields.map((field: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message d'erreur */}
                  {log.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 mb-1">Erreur</p>
                          <p className="text-sm text-red-700">{log.error}</p>
                          
                          {/* ✅ Bouton Importer pour les erreurs "Produit parent introuvable" */}
                          {log.error.includes('Produit parent introuvable') && (() => {
                            // Extraire le PID depuis l'erreur ou le payload
                            let pid: string | null = null;
                            
                            // 1️⃣ Essayer depuis l'erreur (format: "pid: 123456" ou "PID: 123456")
                            const pidMatch = log.error.match(/pid:\s*([^\s\)]+)/i) || 
                                           log.error.match(/PID:\s*([^\s\)]+)/i);
                            if (pidMatch && Array.isArray(pidMatch)) {
                              pid = pidMatch[1];
                            }
                            
                            // 2️⃣ Si pas trouvé, essayer depuis le payloadInfo (pour les webhooks VARIANT)
                            if (!pid && (payloadInfo as any)?.pid && (payloadInfo as any).pid !== 'N/A') {
                              pid = (payloadInfo as any).pid;
                            }
                            
                            // 3️⃣ Si toujours pas trouvé, essayer depuis le payload brut
                            if (!pid) {
                              const payload = formatPayload(log.payload);
                              const params = payload?.params || payload || {};
                              if (params.pid && params.pid !== 'N/A') {
                                pid = params.pid;
                              }
                            }
                            
                            if (pid && pid !== 'N/A') {
                              const isImporting = importingPids.has(pid);
                              
                              return (
                                <div className="mt-3 pt-3 border-t border-red-200">
                                  <Button
                                    onClick={async () => {
                                      if (isImporting) return;
                                      
                                      setImportingPids(prev => new Set(prev).add(pid));
                                      try {
                                        const result = await importProduct(pid);
                                        if (result.success) {
                                          toast.showToast({
                                            type: 'success',
                                            title: 'Import réussi',
                                            description: `✅ Produit ${pid} importé avec succès dans le magasin (statut: disponible)`
                                          });
                                          // Rafraîchir les logs après import
                                          await loadWebhookLogs();
                                          // Rafraîchir les notifications
                                          window.dispatchEvent(new Event('refreshStoreNotifications'));
                                        } else {
                                          toast.showToast({
                                            type: 'error',
                                            title: 'Erreur import',
                                            description: result.message || `❌ Erreur lors de l'import du produit ${pid}`
                                          });
                                        }
                                      } catch (err: any) {
                                        toast.showToast({
                                          type: 'error',
                                          title: 'Erreur import',
                                          description: err?.response?.data?.message || `❌ Erreur lors de l'import du produit ${pid}`
                                        });
                                      } finally {
                                        setImportingPids(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(pid);
                                          return newSet;
                                        });
                                      }
                                    }}
                                    disabled={isImporting}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {isImporting ? 'Import en cours...' : '📦 Importer le produit dans le magasin'}
                                  </Button>
                                  <p className="text-xs text-gray-600 mt-2">
                                    Le produit sera importé dans le magasin avec le statut "disponible" et pourra être suivi comme les autres produits.
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Détails complets du payload (collapsible) */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium py-2">
                      ▼ Voir les détails complets du payload
                    </summary>
                    <div className="mt-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <pre className="text-xs whitespace-pre-wrap overflow-x-auto font-mono">
                        {JSON.stringify(cleanPayloadForDisplay(payload), null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <div className="text-4xl mb-4">📡</div>
              <h3 className="text-lg font-medium mb-2">Aucun webhook reçu</h3>
              <p>Les webhooks CJ Dropshipping apparaîtront ici une fois activés</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

