export interface CJConfig {
  id: string;
  email: string;
  apiKey: string;
  tier: 'free' | 'plus' | 'prime' | 'advanced';
  platformToken?: string;
  enabled: boolean;
  connected: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CJProduct {
  pid: string;
  productName: string;
  productNameEn: string;
  productSku: string;
  productImage: string;
  sellPrice: number;
  variants: CJVariant[];
  categoryName: string;
  description: string;
  weight: number;
  dimensions: string;
  brand: string;
  tags: string[];
  reviews: CJReview[];
  rating: number;
  totalReviews: number;
  stockInfo?: any;
  
  // Nouveaux champs de l'API officielle
  productWeight?: string;
  productUnit?: string;
  productType?: string;
  categoryId?: string;
  entryCode?: string;
  entryName?: string;
  entryNameEn?: string;
  materialName?: string;
  materialNameEn?: string;
  materialKey?: string;
  packingWeight?: string;
  packingName?: string;
  packingNameEn?: string;
  packingKey?: string;
  productKey?: string;
  productKeyEn?: string;
  productProSet?: string[];
  productProEnSet?: string[];
  addMarkStatus?: number;
  suggestSellPrice?: string;
  listedNum?: number;
  status?: string;
  supplierName?: string;
  supplierId?: string;
  customizationVersion?: number;
  customizationJson1?: string;
  customizationJson2?: string;
  customizationJson3?: string;
  customizationJson4?: string;
  createrTime?: string;
  productVideo?: string[];
}

export interface CJVariant {
  vid: string;
  variantSku: string;
  variantSellPrice: number;
  variantKey: string;
  variantValue: string;
  stock: number;
  images: string[];
}

export interface CJReview {
  // Identifiants
  id: string;
  reviewId?: string;
  
  // Auteur
  userName: string;
  userAvatar?: string;
  userId?: string;
  
  // Contenu
  rating: number;
  title?: string;
  comment: string;
  
  // Médias
  images?: string[];
  videos?: string[];
  
  // Métadonnées
  createdAt: string;
  updatedAt?: string;
  verified?: boolean;
  helpful?: number;
  
  // Variante concernée
  variantName?: string;
  variantKey?: string;
  
  // Pays/Localisation
  country?: string;
  countryCode?: string;
  
  // Réponse du vendeur
  sellerReply?: {
    comment: string;
    date: string;
  };
}

export interface CJOrder {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  totalAmount: number;
  shippingAddress: CJShippingAddress;
  products: CJOrderProduct[];
  trackNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CJOrderProduct {
  vid: string;
  quantity: number;
  price: number;
  productName: string;
  variantInfo: string;
}

export interface CJShippingAddress {
  country: string;
  countryCode: string;
  province?: string;
  city: string;
  address: string;
  customerName: string;
  phone: string;
  zipCode?: string;
}

export interface CJStats {
  products: {
    total: number;
    synced: number;
  };
  orders: {
    total: number;
    active: number;
  };
  webhooks: {
    total: number;
    recent: number;
    processed: number;
  };
}

export interface CJProductSearchFilters {
  // Paramètres de base
  pageNum?: number;
  pageSize?: number;
  
  // Identifiants
  pid?: string;
  productSku?: string;
  categoryId?: string;
  
  // Noms de produits
  productName?: string;
  productNameEn?: string;
  
  // Types et catégories
  productType?: 'ORDINARY_PRODUCT' | 'SERVICE_PRODUCT' | 'PACKAGING_PRODUCT' | 'SUPPLIER_PRODUCT' | 'SUPPLIER_SHIPPED_PRODUCT';
  
  // Localisation
  countryCode?: string;
  
  // Livraison
  deliveryTime?: '24' | '48' | '72';
  isFreeShipping?: 0 | 1;
  isSelfPickup?: 0 | 1;
  
  // Inventaire
  verifiedWarehouse?: 1 | 2;
  startInventory?: number;
  endInventory?: number;
  
  // Prix
  minPrice?: number;
  maxPrice?: number;
  
  // Dates
  createTimeFrom?: string;
  createTimeTo?: string;
  
  // Marques et fournisseurs
  brandOpenId?: number;
  supplierId?: string;
  
  // Recherche et tri
  searchType?: 0 | 2 | 21;
  minListedNum?: number;
  maxListedNum?: number;
  sort?: 'desc' | 'asc';
  orderBy?: 'createAt' | 'listedNum' | number; // ✅ V2 accepte aussi des nombres (0-4)
  
  // Personnalisation
  customizationVersion?: 1 | 2 | 3 | 4 | 5;
  
  // Compatibilité legacy
  keyword?: string;
  sortBy?: string;
}

export interface CJImportResult {
  productId: string;
  cjProductId: string;
  success: boolean;
  message?: string;
}

export interface CJWebhookLog {
  id: string;
  messageId: string;
  type: string;
  payload: string;
  status: 'RECEIVED' | 'PROCESSED' | 'ERROR';
  result?: string;
  error?: string;
  processingTimeMs?: number;
  receivedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

