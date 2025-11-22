const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export class ApiClient {
  private token: string | null = null;

  constructor() {
    // Récupérer le token depuis le localStorage au démarrage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    }
  }

  // Authentification
  async login(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.access_token;
        console.log('✅ [API] Connexion réussie, token reçu:', data.access_token ? data.access_token.substring(0, 30) + '...' : 'AUCUN');
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.access_token);
          console.log('💾 [API] Token stocké dans localStorage');
          // store refresh token if backend returns it
          if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return { data };
      } else {
        console.error('❌ [API] Erreur de connexion:', data.message);
        return { error: data.message || 'Erreur de connexion' };
      }
    } catch (error) {
      return { error: 'Erreur réseau' };
    }
  }

  async register(email: string, name: string, password: string, role: string = 'admin'): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.access_token;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.access_token);
          if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
        }
        return { data };
      } else {
        return { error: data.message || 'Erreur d\'inscription' };
      }
    } catch (error) {
      return { error: 'Erreur réseau' };
    }
  }

  logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      console.log('🚪 [API] Déconnexion - Nettoyage du localStorage');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      console.log('✅ [API] localStorage nettoyé');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Méthode générique pour les appels API avec authentification
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
    // Synchroniser le token depuis localStorage à chaque requête pour être sûr qu'il est à jour
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (storedToken && storedToken !== this.token) {
        console.log('🔄 [API] Synchronisation du token depuis localStorage');
        this.token = storedToken;
      }
    }
    
    if (!this.token) {
      console.error('❌ [API] Aucun token disponible pour la requête');
      return { error: 'Non authentifié' };
    }

    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`🌐 [API] Appel: ${options.method || 'GET'} ${url}`);
      console.log(`🔑 [API] Token présent:`, !!this.token);
      console.log(`🔑 [API] Token (preview):`, this.token.substring(0, 30) + '...');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      
      // S'assurer que le header Authorization est correctement formaté
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token.trim()}`;
        console.log('🔑 [API] Header Authorization formaté:', headers['Authorization'].substring(0, 40) + '...');
      } else {
        console.error('❌ [API] Aucun token disponible pour l\'en-tête Authorization');
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📡 [API] Réponse status:`, response.status, response.statusText);

      // Lire le body une seule fois
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      // Si la réponse n'est pas OK, gérer l'erreur
      if (!response.ok) {
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        
        try {
          if (text && contentType?.includes('application/json')) {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else if (text) {
            errorMessage = text;
          }
        } catch (parseError) {
          // Si le parsing échoue, utiliser le message par défaut
        }
        
        console.error(`❌ [API] Erreur HTTP ${response.status}:`, errorMessage);
        return { error: errorMessage };
      }

      // Vérifier si la réponse est JSON (on arrive ici seulement si response.ok === true)
      let data;
      
      // Si la réponse est vide, retourner un tableau vide
      if (!text || text.trim() === '') {
        console.log(`⚠️ [API] Réponse vide, retour d'un tableau vide`);
        // Si c'est un GET et que la réponse est vide, c'est probablement un tableau vide
        if (!options.method || options.method === 'GET') {
          data = [];
        } else {
          data = null;
        }
      } else if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`❌ [API] Erreur parsing JSON:`, text);
          return { error: `Réponse JSON invalide` };
        }
      } else {
        // Essayer de parser quand même (certains serveurs ne mettent pas le content-type)
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`❌ [API] Réponse non-JSON:`, text);
          return { error: `Réponse invalide du serveur` };
        }
      }

      console.log(`✅ [API] Succès:`, data);
      return { data };
    } catch (error) {
      console.error(`❌ [API] Erreur réseau:`, error);
      console.error(`❌ [API] URL:`, `${API_BASE_URL}${endpoint}`);
      console.error(`❌ [API] Message:`, error instanceof Error ? error.message : String(error));
      return { error: `Erreur réseau: ${error instanceof Error ? error.message : 'Connexion impossible'}` };
    }
  }

  // Attempt to refresh tokens using refresh_token stored in localStorage
  private async attemptRefresh(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const resp = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await resp.json();
      if (resp.ok && data.access_token) {
        this.token = data.access_token;
        localStorage.setItem('token', data.access_token);
        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
        return true;
      }
      // failed refresh -> logout
      this.logout();
      return false;
    } catch (e) {
      this.logout();
      return false;
    }
  }

  // Dashboard
  async getDashboardStats() {
    return this.fetchWithAuth('/dashboard/stats');
  }

  async getDashboardActivity() {
    return this.fetchWithAuth('/dashboard/activity');
  }

  async getSalesChart() {
    return this.fetchWithAuth('/dashboard/sales-chart');
  }

  async getTopCategories() {
    return this.fetchWithAuth('/dashboard/top-categories');
  }

  // Produits
  async getProducts() {
    return this.fetchWithAuth('/products');
  }

  async getAllProductsForAdmin() {
    return this.fetchWithAuth('/products/admin/all');
  }

  async getProduct(id: string) {
    return this.fetchWithAuth(`/products/${id}`);
  }

  async createProduct(productData: any) {
    return this.fetchWithAuth('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.fetchWithAuth(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id: string) {
    return this.fetchWithAuth(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getPendingProducts() {
    return this.fetchWithAuth('/products/admin/pending');
  }

  async approveProduct(id: string) {
    return this.fetchWithAuth(`/products/${id}/approve`, {
      method: 'PATCH',
    });
  }

  async rejectProduct(id: string) {
    return this.fetchWithAuth(`/products/${id}/reject`, {
      method: 'PATCH',
    });
  }

  // Fournisseurs
  async getSuppliers() {
    return this.fetchWithAuth('/suppliers');
  }

  async getSupplier(id: string) {
    return this.fetchWithAuth(`/suppliers/${id}`);
  }

  async createSupplier(supplierData: any) {
    return this.fetchWithAuth('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
  }

  async updateSupplier(id: string, supplierData: any) {
    return this.fetchWithAuth(`/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(supplierData),
    });
  }

  async deleteSupplier(id: string) {
    return this.fetchWithAuth(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  async testSupplierConnection(id: string) {
    return this.fetchWithAuth(`/suppliers/${id}/test`, {
      method: 'POST',
    });
  }

  async importProducts(supplierId: string) {
    return this.fetchWithAuth(`/suppliers/${supplierId}/import`, {
      method: 'POST',
    });
  }

  async getSupplierStats() {
    return this.fetchWithAuth('/suppliers/stats');
  }

  // Catégories
  async getCategories() {
    return this.fetchWithAuth('/categories');
  }

  async createCategory(categoryData: { name: string; description?: string; icon?: string; color?: string }) {
    return this.fetchWithAuth('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(id: string, categoryData: { name?: string; description?: string; icon?: string; color?: string }) {
    return this.fetchWithAuth(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(id: string) {
    return this.fetchWithAuth(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Commandes
  async getOrders() {
    return this.fetchWithAuth('/orders');
  }

  async getOrder(id: string) {
    return this.fetchWithAuth(`/orders/order/${id}`);
  }

  async createOrder(items: Array<{ productId: string; quantity: number; price: number }>) {
    return this.fetchWithAuth('/orders', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // CJ Order Status
  async getCJStatus(orderId: string) {
    return this.fetchWithAuth(`/orders/${orderId}/cj-status`);
  }

  async createCJOrder(orderId: string) {
    return this.fetchWithAuth(`/orders/${orderId}/create-cj`, {
      method: 'POST',
    });
  }

  async hasCJProducts(orderId: string) {
    return this.fetchWithAuth(`/orders/${orderId}/has-cj-products`);
  }

  async getCJDetails(orderId: string) {
    return this.fetchWithAuth(`/orders/${orderId}/cj-details`);
  }

  async syncCJStatus(orderId: string) {
    return this.fetchWithAuth(`/orders/${orderId}/sync-cj-status`, {
      method: 'POST',
    });
  }

  async getCJStats() {
    return this.fetchWithAuth('/orders/cj/stats');
  }

  // CJ Dropshipping - Variants
  async syncProductVariants(productId: string) {
    return this.fetchWithAuth(`/cj-dropshipping/products/${productId}/sync-variants-stock`, {
      method: 'POST',
    });
  }

  async syncAllProductsVariants() {
    return this.fetchWithAuth('/cj-dropshipping/products/sync-all-variants', {
      method: 'POST',
    });
  }

  // Utilisateurs
  async getUsers() {
    return this.fetchWithAuth('/users');
  }

  async updateUser(id: string, userData: any) {
    return this.fetchWithAuth(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Paramètres
  async getSettings() {
    return this.fetchWithAuth('/settings');
  }

  async updateSettings(settingsData: any) {
    return this.fetchWithAuth('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  // Category Mappings
  async getCategoryMappings() {
    return this.fetchWithAuth('/categories/mappings/all');
  }

  async createCategoryMapping(data: {
    supplierId: string;
    externalCategory: string;
    internalCategory: string;
  }) {
    return this.fetchWithAuth('/categories/mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategoryMapping(id: string, data: {
    internalCategory?: string;
    status?: string;
  }) {
    return this.fetchWithAuth(`/categories/mappings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategoryMapping(id: string) {
    return this.fetchWithAuth(`/categories/mappings/${id}`, {
      method: 'DELETE',
    });
  }

  async syncDraftProductsForMapping(mappingId: string) {
    return this.fetchWithAuth(`/categories/mappings/${mappingId}/sync-products`, {
      method: 'POST',
    });
  }

  async getUnmappedExternalCategories() {
    return this.fetchWithAuth('/categories/unmapped-external');
  }

  async getDraftProductsCountByCategory(categoryId?: string) {
    const url = categoryId 
      ? `/products/draft?categoryId=${categoryId}`
      : '/products/draft';
    const response = await this.fetchWithAuth(url);
    if (response.data) {
      return { count: Array.isArray(response.data) ? response.data.length : 0 };
    }
    return { count: 0 };
  }

  async getCJStoreProductsCount(mappingId: string) {
    return this.fetchWithAuth(`/categories/mappings/${mappingId}/cj-products-count`);
  }

  async syncAllMappings() {
    console.log('🌐 [API] Appel syncAllMappings: POST /categories/mappings/sync-all');
    try {
      const response = await this.fetchWithAuth('/categories/mappings/sync-all', {
        method: 'POST',
      });
      console.log('🌐 [API] Réponse syncAllMappings:', response);
      return response;
    } catch (error) {
      console.error('🌐 [API] Erreur syncAllMappings:', error);
      throw error;
    }
  }

  async getProductsReadyForValidation(categoryId?: string) {
    const url = categoryId 
      ? `/products/admin/ready-for-validation?categoryId=${categoryId}`
      : '/products/admin/ready-for-validation';
    
    return this.fetchWithAuth(url);
  }

  // ===== NOUVELLES MÉTHODES POUR L'ÉDITION MANUELLE =====

  // Préparer un produit CJ pour publication
  async prepareCJProduct(cjStoreProductId: string, data: { categoryId: string; margin?: number; supplierId?: string }) {
    return this.fetchWithAuth(`/products/cj/prepare/${cjStoreProductId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Obtenir tous les produits en draft
  async getDraftProducts() {
    return this.fetchWithAuth('/products/draft');
  }

  // Obtenir un produit draft par ID
  async getDraftProduct(id: string) {
    return this.fetchWithAuth(`/products/draft/${id}`);
  }

  // Éditer un produit draft
  async editDraftProduct(id: string, data: {
    name?: string;
    description?: string;
    margin?: number;
    categoryId?: string;
    image?: string;
    images?: string[];
    badge?: string;
    stock?: number;
  }) {
    return this.fetchWithAuth(`/products/draft/${id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Publier un produit draft
  async publishProduct(id: string) {
    return this.fetchWithAuth(`/products/draft/${id}/publish`, {
      method: 'PATCH',
    });
  }

  // Mettre à jour automatiquement les produits draft sans catégorie qui ont un mapping
  async updateDraftProductsWithMapping() {
    return this.fetchWithAuth('/products/draft/update-mappings', {
      method: 'POST',
    });
  }

  // ✅ MÉTHODES CJ DROPSHIPPING
  async searchCJProducts(params: {
    productName?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    pageNum?: number;
    pageSize?: number;
    countryCode?: string;
    sort?: string;
    orderBy?: string;
  }) {
    // Construire l'URL avec les paramètres de recherche
    const searchParams = new URLSearchParams();
    if (params.productName) searchParams.append('productName', params.productName);
    if (params.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params.minPrice) searchParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice) searchParams.append('maxPrice', params.maxPrice.toString());
    if (params.pageNum) searchParams.append('pageNum', params.pageNum.toString());
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params.countryCode) searchParams.append('countryCode', params.countryCode);
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.orderBy) searchParams.append('orderBy', params.orderBy);

    const queryString = searchParams.toString();
    const url = `/cj-dropshipping/products/search${queryString ? `?${queryString}` : ''}`;
    
    return this.fetchWithAuth(url, {
      method: 'GET',
    });
  }


  async getCJConfig() {
    return this.fetchWithAuth('/cj-dropshipping/config');
  }

  async updateCJConfig(configData: any) {
    return this.fetchWithAuth('/cj-dropshipping/config', {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  async testCJConnection() {
    return this.fetchWithAuth('/cj-dropshipping/config/test', {
      method: 'POST',
    });
  }

  // ✅ NOUVELLES MÉTHODES CJ DROPSHIPPING
  async getCJProductDetails(pid: string) {
    return this.fetchWithAuth(`/cj-dropshipping/products/${pid}/details`);
  }

  async getCJCategories() {
    return this.fetchWithAuth('/cj-dropshipping/categories');
  }

  async importCJProduct(productData: any) {
    return this.fetchWithAuth('/cj-dropshipping/products/import', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async getCJProductStock(pid: string, countryCode?: string) {
    const url = `/cj-dropshipping/products/${pid}/stock${countryCode ? `?countryCode=${countryCode}` : ''}`;
    return this.fetchWithAuth(url);
  }

  // ✅ NOUVELLE MÉTHODE : Migrer les variants JSON vers ProductVariant
  async migrateCJVariants(force: boolean = false) {
    return this.fetchWithAuth(`/cj-dropshipping/migrate-variants${force ? '?force=true' : ''}`, {
      method: 'POST',
    });
  }

  // ✅ NOUVELLE MÉTHODE : Synchroniser les stocks du magasin CJ depuis l'API
  async syncCJStoreStocks() {
    return this.fetchWithAuth('/cj-dropshipping/stores/sync-stocks', {
      method: 'POST',
    });
  }

  // ✅ Resynchroniser les compteurs des catégories non mappées
  async syncUnmappedCategories() {
    return this.fetchWithAuth('/suppliers/sync-unmapped-categories', {
      method: 'POST',
    });
  }

  // ✅ Calculer les frais de livraison CJ
  async calculateCJFreight(params: {
    startCountryCode: string;
    endCountryCode: string;
    zip?: string;
    taxId?: string;
    houseNumber?: string;
    iossNumber?: string;
    products: Array<{
      quantity: number;
      vid: string;
    }>;
  }) {
    return this.fetchWithAuth('/cj-dropshipping/logistics/calculate-freight', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ✅ Récupérer les avis d'un produit CJ
  async getCJProductReviews(pid: string) {
    return this.fetchWithAuth(`/cj-dropshipping/products/${pid}/reviews`);
  }

  // ✅ 3.1 Inventory Inquiry - Obtenir le stock d'un variant par VID
  async getCJInventoryByVid(vid: string) {
    return this.fetchWithAuth(`/cj-dropshipping/inventory/vid/${vid}`);
  }

  // ✅ 3.2 Query Inventory by SKU - Obtenir le stock par SKU
  async getCJInventoryBySku(sku: string) {
    return this.fetchWithAuth(`/cj-dropshipping/inventory/sku/${encodeURIComponent(sku)}`);
  }

  // ===== DISPUTES =====
  
  // ✅ 7.1 Select the list of disputed products (GET)
  async getCJDisputeProducts(orderId: string) {
    return this.fetchWithAuth(`/cj-dropshipping/disputes/products/${orderId}`);
  }

  // ✅ 7.2 Confirm the dispute (POST)
  // Retourne les informations nécessaires pour créer un litige (montants max, raisons disponibles, etc.)
  async confirmCJDispute(params: {
    orderId: string;
    productInfoList: Array<{
      lineItemId: string;
      quantity: string;
      // price n'est pas requis dans la requête selon la doc
    }>;
  }) {
    return this.fetchWithAuth('/cj-dropshipping/disputes/confirm', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ✅ 7.3 Create dispute (POST)
  async createCJDispute(params: {
    orderId: string;
    businessDisputeId: string;
    disputeReasonId: number;
    expectType: number; // 1: Refund, 2: Reissue
    refundType: number; // 1: balance, 2: platform
    messageText: string;
    imageUrl?: string[];
    videoUrl?: string[];
    productInfoList: Array<{
      lineItemId: string;
      quantity: string;
      price: number;
    }>;
  }) {
    return this.fetchWithAuth('/cj-dropshipping/disputes/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ✅ 7.4 Cancel dispute (POST)
  async cancelCJDispute(params: {
    orderId: string;
    disputeId: string;
  }) {
    return this.fetchWithAuth('/cj-dropshipping/disputes/cancel', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ✅ 7.5 Query the list of disputes (GET)
  async getCJDisputeList(params?: {
    orderId?: string;
    disputeId?: number;
    orderNumber?: string;
    pageNum?: number;
    pageSize?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.orderId) queryParams.append('orderId', params.orderId);
    if (params?.disputeId) queryParams.append('disputeId', String(params.disputeId));
    if (params?.orderNumber) queryParams.append('orderNumber', params.orderNumber);
    if (params?.pageNum) queryParams.append('pageNum', String(params.pageNum));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    
    const query = queryParams.toString();
    return this.fetchWithAuth(`/cj-dropshipping/disputes/list${query ? `?${query}` : ''}`);
  }

  // ✅ Analytics des disputes
  async getCJDisputeAnalytics() {
    return this.fetchWithAuth('/cj-dropshipping/disputes/analytics');
  }

  // ✅ Nettoyer les descriptions de tous les produits (supprimer Weight/Dimensions faux)
  async cleanupProductDescriptions() {
    return this.fetchWithAuth('/products/cleanup-descriptions', {
      method: 'POST',
    });
  }

  // ✅ NOUVELLE MÉTHODE : Statistiques anti-doublons
  async getDuplicateStats() {
    return this.fetchWithAuth('/duplicates/stats');
  }
}

// Instance globale
export const apiClient = new ApiClient();
