'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { CJProduct } from '@/types/cj.types';
import { DollarSign, Star, Tag } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CJProduct | any | null; // Accepter CJProduct ou tout type de produit
  onImport?: (productId: string) => void;
  importing?: boolean;
}

export function ProductDetailsModal({ 
  isOpen, 
  onClose, 
  product, 
  onImport, 
  importing = false 
}: ProductDetailsModalProps) {
  // TOUS LES HOOKS DOIVENT ÊTRE AU DÉBUT
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<number>(0); // 0 = toutes, 1-5 = note spécifique
  const [showOnlyWithPhotos, setShowOnlyWithPhotos] = useState(false);
  const [reviewSort, setReviewSort] = useState<'recent' | 'helpful' | 'rating'>('recent');
  
  // 🆕 États pour les stocks
  const [variantStocks, setVariantStocks] = useState<Map<string, number>>(new Map());
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stocksLoaded, setStocksLoaded] = useState(false);
  
  // 🆕 Charger les stocks quand le modal s'ouvre
  useEffect(() => {
    // Reset quand on ferme le modal
    if (!isOpen) {
      setVariantStocks(new Map());
      setStocksLoaded(false);
      setLoadingStocks(false);
      return;
    }
    
    // Si pas de produit, ne rien faire
    if (!product) {
      return;
    }
    
    // Si déjà chargé ou en cours de chargement, ne PAS recharger (évite la boucle)
    if (stocksLoaded || loadingStocks) {
      return;
    }
    
    // Récupérer le PID (CJ Product ID)
    const pid = product.cjProductId || product.pid;
    if (!pid) {
      console.log('⚠️ Pas de PID CJ disponible pour charger les stocks');
      setStocksLoaded(true); // Marquer comme "chargé" pour éviter la boucle
      return;
    }
    
    console.log(`🔄 Chargement des stocks pour PID: ${pid}`);
    
    // Charger les stocks depuis l'API backend
    const loadStocks = async () => {
      setLoadingStocks(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const url = `${API_URL}/cj-dropshipping/products/${pid}/stock`;
        console.log(`📡 Appel API: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📦 Réponse API:`, data);
        
        if (data.success && data.data) {
          // Créer une Map VID -> Stock
          const stockMap = new Map<string, number>();
          Object.entries(data.data).forEach(([vid, stockInfo]: [string, any]) => {
            stockMap.set(vid, stockInfo.stock || 0);
          });
          
          setVariantStocks(stockMap);
          console.log(`✅ Stocks chargés pour ${stockMap.size} variants`);
        } else {
          console.log(`⚠️ Aucun stock retourné par l'API`);
        }
      } catch (error) {
        console.error('❌ Erreur chargement stocks:', error);
        // Marquer comme chargé même en cas d'erreur pour éviter la boucle infinie
      } finally {
        setLoadingStocks(false);
        setStocksLoaded(true); // ✅ IMPORTANT : Toujours marquer comme chargé pour éviter la boucle
      }
    };
    
    loadStocks();
  }, [isOpen, product?.cjProductId, product?.pid]); // ✅ Dépendances fixes pour éviter la boucle
  
  // Parser les variants avec useMemo pour éviter les re-calculs
  // ✅ Priorité : productVariants (relation Prisma) > variants (JSON)
  // ✅ Enrichir avec les stocks chargés dynamiquement
  const parsedVariants = useMemo(() => {
    let variants: any[] = [];
    
    // 1. Essayer d'abord productVariants (relation Prisma) - priorité haute
    if (product?.productVariants && Array.isArray(product.productVariants) && product.productVariants.length > 0) {
      // Transformer les ProductVariant en format compatible avec le modal
      variants = product.productVariants.map((pv: any) => ({
        vid: pv.cjVariantId || pv.id,
        variantName: pv.name || '',
        variantNameEn: pv.name || '',
        variantSku: pv.sku || '',
        variantImage: pv.image || '',
        variantPrice: pv.price || 0,
        variantStock: pv.stock || 0,
        variantWeight: pv.weight || 0,
        variantDimensions: typeof pv.dimensions === 'string' ? pv.dimensions : JSON.stringify(pv.dimensions || {}),
        variantProperties: typeof pv.properties === 'string' ? pv.properties : JSON.stringify(pv.properties || {}),
        isActive: pv.isActive !== false,
        // Conserver les données originales pour référence
        _original: pv
      }));
    } 
    // 2. Fallback : utiliser variants (champ JSON)
    else if (product?.variants) {
      // Si c'est déjà un tableau, le retourner
      if (Array.isArray(product.variants)) {
        variants = product.variants;
      }
      // Si c'est une chaîne JSON, la parser
      else if (typeof product.variants === 'string') {
        try {
          const parsed = JSON.parse(product.variants);
          variants = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.error('Erreur de parsing des variants:', error);
          variants = [];
        }
      }
    }
    
    // 🆕 Enrichir avec les stocks chargés dynamiquement
    if (variantStocks.size > 0) {
      variants = variants.map(v => {
        const vid = v.vid;
        const stock = variantStocks.get(vid);
        
        // Si on a un stock chargé, l'injecter
        if (stock !== undefined) {
          return {
            ...v,
            variantStock: stock,
            stock: stock
          };
        }
        return v;
      });
    }
    
    return variants;
  }, [product?.variants, product?.productVariants, variantStocks]);

  // Parser les tags de la même manière

  // Filtrer et trier les reviews
  const getFilteredReviews = useMemo(() => {
    if (!product?.reviews) return [];
    
    let filtered = Array.isArray(product.reviews) ? [...product.reviews] : [];
    
    // Filtrer par note (utiliser score ou rating)
    if (reviewFilter > 0) {
      filtered = filtered.filter((r: any) => {
        const rating = parseInt(r.score || r.rating || "0", 10);
        return rating === reviewFilter;
      });
    }
    
    // Filtrer par photos (utiliser commentUrls ou images)
    if (showOnlyWithPhotos) {
      filtered = filtered.filter((r: any) => {
        const hasImages = (r.commentUrls && r.commentUrls.length > 0) || (r.images && r.images.length > 0);
        return hasImages;
      });
    }
    
    // Trier
    switch (reviewSort) {
      case 'recent':
        filtered.sort((a: any, b: any) => {
          const dateA = a.commentDate || a.createdAt || 0;
          const dateB = b.commentDate || b.createdAt || 0;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        break;
      case 'helpful':
        filtered.sort((a: any, b: any) => (b.helpful || 0) - (a.helpful || 0));
        break;
      case 'rating':
        filtered.sort((a: any, b: any) => {
          const ratingA = parseInt(a.score || a.rating || "0", 10);
          const ratingB = parseInt(b.score || b.rating || "0", 10);
          return ratingB - ratingA;
        });
        break;
    }
    
    return filtered;
  }, [product?.reviews, reviewFilter, showOnlyWithPhotos, reviewSort]);
  const parsedTags = useMemo(() => {
    if (!product?.tags) return [];
    
    // Si c'est déjà un tableau, le retourner
    if (Array.isArray(product.tags)) return product.tags;
    
    // Si c'est une chaîne JSON, la parser
    if (typeof product.tags === 'string') {
      try {
        const parsed = JSON.parse(product.tags);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('Erreur de parsing des tags:', error);
        return [];
      }
    }
    
    return [];
  }, [product?.tags]);
  
  const handleClose = () => {
    setSelectedSize('');
    onClose();
  };
  
  if (!product) return null;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Image+produit';
  };

  // Fonction pour obtenir le vrai prix (pour produits de validation)
  const getDisplayPrice = (product: any) => {
    // Pour les produits de validation, utiliser originalPrice ou price
    if (product.originalPrice && product.originalPrice > 0) {
      return product.originalPrice
    }
    
    if (product.price && product.price > 0) {
      return product.price
    }
    
    // Fallback sur sellPrice pour les produits CJ normaux
    if (product.sellPrice && product.sellPrice > 0) {
      return product.sellPrice
    }
    
    return 0
  }

  // Fonction pour obtenir l'image principale
  const getMainImage = (product: any) => {
    // Essayer productImage en premier (pour produits CJ)
    if (product.productImage) {
      try {
        // Si c'est déjà une URL directe
        if (typeof product.productImage === 'string' && product.productImage.startsWith('http')) {
          return product.productImage;
        }
        
        // Si c'est un tableau JSON
        if (typeof product.productImage === 'string' && product.productImage.startsWith('[')) {
          const images = JSON.parse(product.productImage);
          if (Array.isArray(images) && images.length > 0) {
            return images[0];
          }
        }
        
        // Si c'est déjà un tableau
        if (Array.isArray(product.productImage) && product.productImage.length > 0) {
          return product.productImage[0];
        }
        
        // Sinon utiliser tel quel
        return product.productImage;
      } catch (e) {
        console.error('Erreur parsing productImage:', e);
        return product.productImage;
      }
    }
    
    // Essayer le champ image standard
    if (product.image) {
      return product.image;
    }
    
    // Essayer images (tableau)
    if (product.images) {
      try {
        const images = JSON.parse(product.images);
        if (Array.isArray(images) && images.length > 0) {
          return images[0];
        }
      } catch (e) {
        // Si ce n'est pas du JSON, utiliser directement
        return product.images;
      }
    }
    
    return 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Image+produit';
  }

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  const formatSuggestedPrice = (price: string | number) => {
    if (!price) return '0.00';
    
    const priceStr = String(price);
    
    // Si c'est une plage (ex: "76.13 - 85.41")
    if (priceStr.includes(' - ')) {
      return priceStr; // Retourner la plage telle quelle
    }
    
    // Si c'est un nombre simple
    const numPrice = parseFloat(priceStr);
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  const formatWeight = (weight: string | number) => {
    if (!weight) return '';
    const weightStr = String(weight);
    
    // Si c'est une plage (ex: "500.00-620.00g")
    if (weightStr.includes('-')) {
      const [min, max] = weightStr.split('-').map(w => parseFloat(w.trim()));
      if (!isNaN(min) && !isNaN(max)) {
        const avg = Math.round((min + max) / 2);
        return `${avg}g`;
      }
    }
    
    // Si c'est un poids simple
    const numWeight = parseFloat(weightStr);
    return isNaN(numWeight) ? '' : `${Math.round(numWeight)}g`;
  };

  const cleanProductName = (name: string) => {
    if (!name) return '';
    
    // Si le nom contient des caractères chinois, utiliser la version anglaise
    if (/[\u4e00-\u9fff]/.test(name)) {
      // Chercher la version anglaise dans le nom
      const englishMatch = name.match(/[A-Za-z\s]+/);
      if (englishMatch) {
        return englishMatch[0].trim();
      }
    }
    
    return name;
  };

  // Fonction pour nettoyer le HTML de la description
  const cleanDescription = (html: string) => {
    if (!html) return '';
    // Supprimer les balises HTML et nettoyer le texte
    return html
      .replace(/<[^>]*>/g, '') // Supprimer toutes les balises HTML
      .replace(/&nbsp;/g, ' ') // Remplacer &nbsp; par des espaces
      .replace(/&amp;/g, '&') // Remplacer &amp; par &
      .replace(/&lt;/g, '<') // Remplacer &lt; par <
      .replace(/&gt;/g, '>') // Remplacer &gt; par >

      .replace(/&quot;/g, '"') // Remplacer &quot; par "
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
      .trim();
  };



  // 🎨 Fonction pour extraire les couleurs des variantes
  const extractColorsFromVariants = (variants: any[]): string => {
    if (!variants || variants.length === 0) return 'N/A';
    
    // Debug: log des variants pour comprendre leur structure
    console.log('🔍 Debug variants pour couleurs:', variants.map(v => ({
      variantName: v.variantName,
      variantNameEn: v.variantNameEn,
      variantKey: v.variantKey,
      variantValue: v.variantValue
    })));
    
    const colors = Array.from(new Set(variants.map(v => {
      const name = (v as any).variantNameEn || (v as any).variantName || '';
      
      let color = null;
      
      // Format CJ: Couleur est généralement l'avant-dernier mot
      // Ex: "neck Patchwork Lace Irregular Solid Color Jumpsuit White S"
      // Couleur = "White", Taille = "S"
      const words = name.trim().split(' ');
      const validSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'XXL', 'XXXL'];
      
      if (words.length >= 2 && validSizes.includes(words[words.length - 1].toUpperCase())) {
        // Si le dernier mot est une taille, l'avant-dernier est probablement la couleur
        color = words[words.length - 2];
      }
      // Format 1: "Couleur-Taille" (ex: "Red-M")
      else if (name.includes('-')) {
        color = name.split('-')[0]?.trim();
      }
      // Format 2: Couleur directe
      else if (name.trim()) {
        color = name.trim();
      }
      // Format 3: Dans variantValue ou variantKey
      else {
        const variantValue = v.variantValue || '';
        const variantKey = v.variantKey || '';
        
        if (variantValue.trim()) {
          color = variantValue.trim();
        } else if (variantKey.trim()) {
          color = variantKey.trim();
        }
      }
      
      return color;
    }).filter(Boolean)));
    
    console.log('🎨 Couleurs extraites:', colors);
    return colors.length > 0 ? colors.join(', ') : 'N/A';
  };

  // 📏 Fonction pour extraire les tailles des variantes
  const extractSizesFromVariants = (variants: any[]): string => {
    if (!variants || variants.length === 0) return 'N/A';
    
    // Debug: log des variants pour comprendre leur structure
    console.log('🔍 Debug variants pour tailles:', variants.map(v => ({
      variantName: v.variantName,
      variantNameEn: v.variantNameEn,
      variantKey: v.variantKey,
      variantValue: v.variantValue
    })));
    
    const sizes = Array.from(new Set(variants.map(v => {
      const name = (v as any).variantNameEn || (v as any).variantName || '';
      
      // Essayer plusieurs formats de tailles
      let size = null;
      
      // Format CJ: Taille à la fin du nom complet
      // Ex: "neck Patchwork Lace Irregular Solid Color Jumpsuit White S"
      const words = name.trim().split(' ');
      const lastWord = words[words.length - 1];
      const validSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'XXL', 'XXXL'];
      
      if (validSizes.includes(lastWord.toUpperCase())) {
        size = lastWord.toUpperCase();
      }
      // Format 1: "Couleur-Taille" (ex: "Red-M")
      else if (name.includes('-') && name.split('-').length >= 2) {
        const splitSize = name.split('-')[1]?.trim();
        if (validSizes.includes(splitSize?.toUpperCase())) {
          size = splitSize.toUpperCase();
        }
      }
      // Format 2: Taille directe (ex: "M", "L", "XL")
      else if (/^[A-Z]{1,3}$/.test(name.trim()) && validSizes.includes(name.trim().toUpperCase())) {
        size = name.trim().toUpperCase();
      }
      // Format 3: Dans variantValue ou variantKey
      else {
        const variantValue = v.variantValue || '';
        const variantKey = v.variantKey || '';
        
        // Chercher des tailles standard dans variantValue
        if (/^[A-Z]{1,3}$/.test(variantValue.trim()) && validSizes.includes(variantValue.trim().toUpperCase())) {
          size = variantValue.trim().toUpperCase();
        }
        // Ou dans variantKey
        else if (/^[A-Z]{1,3}$/.test(variantKey.trim()) && validSizes.includes(variantKey.trim().toUpperCase())) {
          size = variantKey.trim().toUpperCase();
        }
        // Ou extraction de patterns de taille dans le texte
        else {
          const sizeMatch = (name + ' ' + variantValue + ' ' + variantKey).match(/\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL)\b/i);
          if (sizeMatch) {
            size = sizeMatch[1].toUpperCase();
          }
        }
      }
      
      return size;
    }).filter(Boolean)));
    
    console.log('🎯 Tailles extraites:', sizes);
    return sizes.length > 0 ? sizes.join(', ') : 'N/A';
  };


  
  // Extraire toutes les images du produit (chaque image = une couleur)
  const getAllImages = () => {
    let images: string[] = [];
    
    // Parser les images du produit
    if (product.productImage) {
      try {
        // Si c'est une chaîne qui ressemble à un tableau JSON
        if (typeof product.productImage === 'string' && product.productImage.startsWith('[')) {
          const parsed = JSON.parse(product.productImage);
          if (Array.isArray(parsed)) {
            images = parsed.filter(img => img && typeof img === 'string');
          } else {
            images = [product.productImage];
          }
        } else if (typeof product.productImage === 'string') {
          images = [product.productImage];
        } else if (Array.isArray(product.productImage)) {
          images = product.productImage.filter((img: any) => img && typeof img === 'string');
        }
      } catch (e) {
        console.error('Erreur parsing productImage:', e);
        if (typeof product.productImage === 'string') {
          images = [product.productImage];
        }
      }
    }
    
    // Si pas d'images du produit principal, essayer image standard
    if (images.length === 0 && product.image) {
      images = [product.image];
    }
    
    // Ajouter les images des variantes
    if (parsedVariants && parsedVariants.length > 0) {
      parsedVariants.forEach((variant: any) => {
        if (variant.images && Array.isArray(variant.images)) {
          images.push(...variant.images.filter((img: any) => img && typeof img === 'string'));
        } else if (variant.variantImage && typeof variant.variantImage === 'string') {
          images.push(variant.variantImage);
        }
      });
    }
    
    // Supprimer les doublons et filtrer les URLs valides
    const uniqueImages = Array.from(new Set(images)).filter(img => 
      img && 
      typeof img === 'string' && 
      (img.startsWith('http') || img.startsWith('/'))
    );
    
    // Si aucune image valide, retourner un placeholder
    return uniqueImages.length > 0 ? uniqueImages : ['https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Image+produit'];
  };

  // Extraire les couleurs des variantes (pour l'affichage)
  const getColorsFromVariants = (): string[] => {
    if (!parsedVariants || parsedVariants.length === 0) return [];
    
    const colors = Array.from(new Set(parsedVariants.map((v: any) => {
      const name = (v as any).variantNameEn || (v as any).variantName || '';
      const color = name.split('-')[0]?.trim();
      return color;
    }).filter(Boolean))) as string[];
    
    return colors;
  };

  const allImages = getAllImages();
  const colors = getColorsFromVariants();
  const currentImage = allImages[selectedImageIndex] || getMainImage(product);
  const currentColor = colors[selectedImageIndex] || 'Couleur principale';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Product Details" size="xl">
      <div className="space-y-6">
        {/* Header avec galerie d'images et infos principales */}
        <div className="flex gap-6">
          {/* Galerie d'images comme CJ Dropshipping */}
          <div className="flex-shrink-0">
            <div className="flex gap-4">
              {/* Thumbnails à gauche (Images = Couleurs) */}
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
                      title={colors[index] || `Couleur ${index + 1}`}
                    >
                      <img
                        src={image}
                        alt={colors[index] || `Couleur ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    </button>
                  ))}
                </div>
              )}
              
              {/* Image principale */}
              <div className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={currentImage}
                  alt={product.productName}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
            </div>
          </div>

          {/* Infos principales */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {cleanProductName(product.productName)}
              </h3>
              {product.productNameEn && product.productNameEn !== product.productName && (
                <p className="text-sm text-gray-600 mb-2">
                  {product.productNameEn}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-lg font-semibold text-green-600">
                  ${formatPrice(getDisplayPrice(product))}
                </span>
                {product.suggestSellPrice && (
                  <span className="text-sm text-gray-500">
                    (Suggéré: ${product.suggestSellPrice})
                  </span>
                )}
              </div>
              
              {product.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-gray-600">
                    {product.rating} ({product.totalReviews} avis)
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {product.productSku}
              </Badge>
              {product.categoryName && (
                <Badge variant="outline">
                  {product.categoryName}
                </Badge>
              )}
            </div>

            {/* Sélecteurs comme CJ Dropshipping */}
            {parsedVariants && parsedVariants.length > 0 && (
              <div className="space-y-4">
                {/* Affichage de la couleur sélectionnée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur ({currentColor})
                  </label>
                  <div className="text-sm text-gray-600">
                    Cliquez sur les images à gauche pour changer de couleur
                  </div>
                </div>

                {/* Sélecteur de tailles */}
                {extractSizesFromVariants(parsedVariants) !== 'N/A' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tailles disponibles
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {extractSizesFromVariants(parsedVariants).split(', ').map((size, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSize(selectedSize === size.trim() ? '' : size.trim())}
                          className={`px-4 py-2 text-sm border rounded-md transition-colors ${
                            selectedSize === size.trim()
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {size.trim()}
                        </button>
                      ))}
                    </div>
                    {selectedSize && (
                      <p className="text-sm text-gray-600 mt-2">
                        Taille sélectionnée: <span className="font-medium text-orange-600">{selectedSize}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {cleanDescription(product.description)}
            </div>
          </div>
        )}

        {/* === VARIANTES DISPONIBLES (comme CJ) === */}
        {parsedVariants && parsedVariants.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🎨 Available Variants ({parsedVariants.length})
            </h4>
            
            {/* Résumé des variants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-3 border">
                <label className="text-sm font-medium text-gray-700">Total Variants</label>
                <p className="text-lg font-bold text-blue-600 mt-1">{parsedVariants.length}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <label className="text-sm font-medium text-gray-700">Colors Available</label>
                <p className="text-sm text-gray-900 mt-1 font-medium">{extractColorsFromVariants(parsedVariants)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <label className="text-sm font-medium text-gray-700">Sizes Available</label>
                <p className="text-sm text-gray-900 mt-1 font-medium">{extractSizesFromVariants(parsedVariants)}</p>
              </div>
            </div>
            
            {/* Tableau des variants (style CJ) */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700">Variant</th>
                      <th className="text-left p-3 font-medium text-gray-700">VID</th>
                      <th className="text-left p-3 font-medium text-gray-700">SKU</th>
                      <th className="text-left p-3 font-medium text-gray-700">Price</th>
                      <th className="text-left p-3 font-medium text-gray-700">Stock</th>
                      <th className="text-left p-3 font-medium text-gray-700">Weight</th>
                      <th className="text-left p-3 font-medium text-gray-700">Dimensions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedVariants.map((variant: any, index: number) => (
                      <tr key={variant.vid || index} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {variant.variantImage && (
                              <img 
                                src={variant.variantImage} 
                                alt={variant.variantNameEn || variant.variantName}
                                className="w-8 h-8 rounded object-cover"
                                onError={handleImageError}
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {variant.variantNameEn || variant.variantName || `Variant ${index + 1}`}
                              </p>
                              {variant.variantKey && (
                                <p className="text-xs text-gray-500">{variant.variantKey}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-xs font-mono text-gray-600">
                            {variant.vid ? String(variant.vid).slice(-8) : 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-xs font-mono text-blue-600">
                            {variant.variantSku || 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          {variant.variantSellPrice ? (
                            <span className="font-semibold text-green-600">
                              ${formatPrice(variant.variantSellPrice)}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="p-3">
                          {variant.variantStock !== undefined && variant.variantStock !== null ? (
                            <span className={`font-semibold ${
                              variant.variantStock > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {variant.variantStock}
                            </span>
                          ) : variant.stock !== undefined && variant.stock !== null ? (
                            <span className={`font-semibold ${
                              variant.stock > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {variant.stock}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-gray-700">
                            {variant.variantWeight ? `${Math.round(variant.variantWeight)}g` : 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          {variant.variantLength && variant.variantWidth && variant.variantHeight ? (
                            <span className="text-xs text-gray-600">
                              {variant.variantLength}×{variant.variantWidth}×{variant.variantHeight}
                            </span>
                          ) : variant.variantStandard ? (
                            <span className="text-xs text-gray-600">{variant.variantStandard}</span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Informations supplémentaires des variants */}
            <div className="mt-4 text-xs text-gray-600">
              <p>💡 Tous les variants sont affichés ci-dessus. Chaque variant a ses propres spécifications (prix, poids, dimensions).</p>
            </div>
          </div>
        )}

        {/* ✅ SECTION REVIEWS AMÉLIORÉE */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="space-y-6">
            {/* En-tête avec statistiques */}
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold text-gray-900">
                Avis Clients
              </h4>
              <span className="text-sm text-gray-500">
                {product.reviews.length} avis
              </span>
            </div>
            
            {/* Statistiques des notes */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Note moyenne */}
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    {(() => {
                      const totalRating = product.reviews.reduce((sum: number, r: any) => {
                        return sum + parseInt(r.score || r.rating || "0", 10);
                      }, 0);
                      const avg = totalRating / product.reviews.length;
                      return avg.toFixed(1);
                    })()}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => {
                      const avgRating = product.reviews.reduce((sum: number, r: any) => {
                        return sum + parseInt(r.score || r.rating || "0", 10);
                      }, 0) / product.reviews.length;
                      
                      return (
                        <Star 
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.round(avgRating)
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-600">
                    Basé sur {product.reviews.length} avis
                  </p>
                </div>
                
                {/* Répartition des notes */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = product.reviews.filter((r: any) => 
                      parseInt(r.score || r.rating || "0", 10) === rating
                    ).length;
                    const percentage = (count / product.reviews.length) * 100;
                    
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-8">
                          {rating}★
                        </span>
                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Badge avec photos */}
              {(() => {
                const withPhotosCount = product.reviews.filter((r: any) => 
                  (r.commentUrls?.length > 0) || (r.images?.length > 0)
                ).length;
                  
                return withPhotosCount > 0 ? (
                  <div className="mt-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                      </svg>
                      {withPhotosCount} avec photos
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
            
            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setReviewFilter(0);
                  setShowOnlyWithPhotos(false);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                  reviewFilter === 0 && !showOnlyWithPhotos
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                Tous les avis
              </button>
              {[5, 4, 3, 2, 1].map(rating => (
                <button
                  key={rating}
                  onClick={() => {
                    setReviewFilter(rating);
                    setShowOnlyWithPhotos(false);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all flex items-center gap-1 ${
                    reviewFilter === rating
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-500 hover:text-blue-600'
                  }`}
                >
                  {rating}★
                </button>
              ))}
              <button
                onClick={() => {
                  setShowOnlyWithPhotos(!showOnlyWithPhotos);
                  setReviewFilter(0);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all flex items-center gap-1 ${
                  showOnlyWithPhotos
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-500 hover:text-blue-600'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                </svg>
                Avec photos
              </button>
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value as 'recent' | 'helpful' | 'rating')}
                className="px-4 py-2 text-sm font-medium rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-all"
              >
                <option value="recent">Plus récents</option>
                <option value="helpful">Plus utiles</option>
                <option value="rating">Meilleures notes</option>
              </select>
            </div>
            
            {/* Liste des reviews */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {getFilteredReviews.map((review: any, index: number) => (
                <div 
                  key={index}
                  className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:border-blue-200 transition-all"
                >
                  {/* En-tête du review */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {(review.userName || 'A')[0].toUpperCase()}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {review.userName || 'Client anonyme'}
                          </span>
                          {review.verified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                              </svg>
                              Vérifié
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Étoiles */}
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (review.rating || 0)
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          {/* Date */}
                          <span className="text-xs text-gray-500">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Utile */}
                    {review.helpful > 0 && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {review.helpful}
                      </div>
                    )}
                  </div>
                  
                  {/* Titre du review */}
                  {review.title && (
                    <h5 className="font-semibold text-gray-900 mb-2">
                      {review.title}
                    </h5>
                  )}
                  
                  {/* Commentaire */}
                  <p className="text-gray-700 leading-relaxed mb-3">
                    {review.comment}
                  </p>
                  
                  {/* Variante */}
                  {review.variantName && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700 mb-3">
                      <span className="font-medium mr-1">Variante:</span>
                      {review.variantName}
                    </div>
                  )}
                  
                  {/* Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {review.images.map((img: string, imgIndex: number) => (
                        <img
                          key={imgIndex}
                          src={img}
                          alt={`Review ${imgIndex + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all hover:scale-105"
                          onClick={() => {
                            // Ouvrir en grand
                            window.open(img, '_blank');
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Réponse du vendeur */}
                  {review.sellerReply && (
                    <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm font-semibold text-blue-900">
                          Réponse du vendeur
                        </span>
                        <span className="text-xs text-blue-600">
                          {new Date(review.sellerReply.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm text-blue-800">
                        {review.sellerReply.comment}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Bouton "Voir plus" si beaucoup de reviews */}
            {getFilteredReviews.length > 10 && (
              <button className="w-full py-3 px-4 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all">
                Voir tous les avis ({getFilteredReviews.length})
              </button>
            )}
          </div>
        )}

        {/* === PRIX ET MARGES === */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Pricing Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Base Price</label>
              <p className="text-sm text-gray-900 mt-1">${formatPrice(getDisplayPrice(product))}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Suggested Price</label>
              <p className="text-sm text-gray-900 mt-1">${formatSuggestedPrice(product.suggestSellPrice || 0)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Lists</label>
              <p className="text-sm text-gray-900 mt-1">{product.listedNum || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">SKU</label>
              <p className="text-sm text-gray-900 mt-1">{product.productSku || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Supplier</label>
              <p className="text-sm text-gray-900 mt-1">{product.supplierName || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* === INFORMATIONS TECHNIQUES === */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">🔧 Technical Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.productWeight && (
              <div>
                <label className="text-sm font-medium text-gray-700">Weight</label>
                <p className="text-sm text-gray-900 mt-1">{formatWeight(product.productWeight)}</p>
              </div>
            )}
            
            {product.packingWeight && (
              <div>
                <label className="text-sm font-medium text-gray-700">Packing Weight</label>
                <p className="text-sm text-gray-900 mt-1">{formatWeight(product.packingWeight)}</p>
              </div>
            )}
            
            {product.productUnit && (
              <div>
                <label className="text-sm font-medium text-gray-700">Unit</label>
                <p className="text-sm text-gray-900 mt-1">{product.productUnit}</p>
              </div>
            )}

            {product.entryCode && (
              <div>
                <label className="text-sm font-medium text-gray-700">HS Code</label>
                <p className="text-sm text-gray-900 mt-1">{product.entryCode}</p>
              </div>
            )}

            {product.productType && (
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <p className="text-sm text-gray-900 mt-1">{product.productType}</p>
              </div>
            )}

            {product.materialNameEn && (
              <div>
                <label className="text-sm font-medium text-gray-700">Material</label>
                <p className="text-sm text-gray-900 mt-1">{product.materialNameEn}</p>
              </div>
            )}

            {product.packingNameEn && (
              <div>
                <label className="text-sm font-medium text-gray-700">Packaging</label>
                <p className="text-sm text-gray-900 mt-1">{product.packingNameEn}</p>
              </div>
            )}

            {product.productKeyEn && (
              <div>
                <label className="text-sm font-medium text-gray-700">Attributes</label>
                <p className="text-sm text-gray-900 mt-1">{product.productKeyEn}</p>
              </div>
            )}

            {product.createrTime && (
              <div>
                <label className="text-sm font-medium text-gray-700">Creation Date</label>
                <p className="text-sm text-gray-900 mt-1">{product.createrTime}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {parsedTags && parsedTags.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {parsedTags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {onImport && (
            <Button 
              onClick={() => onImport(product.pid)}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
