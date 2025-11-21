import { ChevronRight, Home, Loader2, Search, Star } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useCJDropshipping } from '../../hooks/useCJDropshipping';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

interface CJCategory {
  categoryId: string;
  categoryName: string;
  parentId?: string;
  level: number;
  hasChildren: boolean;
  productCount?: number;
  isPopular?: boolean;
}

interface CategoryPath {
  categoryId: string;
  categoryName: string;
  level: number;
}

const CategoryExplorer: React.FC = () => {
  const { 
    searchCategories, 
    getPopularCategories, 
    getSubCategories, 
    getCategoryPath,
    loading 
  } = useCJDropshipping();
  const { showToast } = useToast();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<CJCategory[]>([]);
  const [popularCategories, setPopularCategories] = useState<CJCategory[]>([]);
  const [subCategories, setSubCategories] = useState<CJCategory[]>([]);
  const [categoryPath, setCategoryPath] = useState<CategoryPath[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CJCategory | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string>('');

  // Charger les catégories populaires au démarrage
  useEffect(() => {
    loadPopularCategories();
  }, []);

  const loadPopularCategories = async () => {
    try {
      const result = await getPopularCategories(10);
      setPopularCategories(result.categories || []);
      showToast({ 
        title: 'Succès', 
        description: 'Catégories populaires chargées avec succès', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Erreur lors du chargement des catégories populaires:', error);
      showToast({ 
        title: 'Erreur', 
        description: 'Erreur lors du chargement des catégories populaires', 
        type: 'error' 
      });
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      showToast({ 
        title: 'Attention', 
        description: 'Veuillez saisir un mot-clé', 
        type: 'warning' 
      });
      return;
    }

    try {
      const result = await searchCategories({
        keyword: searchKeyword,
        page: 1,
        pageSize: 20
      });
      setSearchResults(result.categories || []);
      showToast({ 
        title: 'Succès', 
        description: `${result.total || 0} catégorie(s) trouvée(s)`, 
        type: 'success' 
      });
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      showToast({ 
        title: 'Erreur', 
        description: 'Erreur lors de la recherche de catégories', 
        type: 'error' 
      });
    }
  };

  const loadSubCategories = async (parentId: string) => {
    try {
      const result = await getSubCategories(parentId);
      setSubCategories(result.categories || []);
      setCurrentParentId(parentId);
      showToast({ 
        title: 'Succès', 
        description: `${result.total || 0} sous-catégorie(s) trouvée(s)`, 
        type: 'success' 
      });
    } catch (error) {
      console.error('Erreur lors du chargement des sous-catégories:', error);
      showToast({ 
        title: 'Erreur', 
        description: 'Erreur lors du chargement des sous-catégories', 
        type: 'error' 
      });
    }
  };

  const loadCategoryPath = async (categoryId: string) => {
    try {
      const result = await getCategoryPath(categoryId);
      setCategoryPath(result.path || []);
    } catch (error) {
      console.error('Erreur lors du chargement du chemin:', error);
      showToast({ 
        title: 'Erreur', 
        description: 'Erreur lors du chargement du chemin de la catégorie', 
        type: 'error' 
      });
    }
  };

  const selectCategory = async (category: CJCategory) => {
    setSelectedCategory(category);
    await loadCategoryPath(category.categoryId);
    if (category.hasChildren) {
      await loadSubCategories(category.categoryId);
    } else {
      setSubCategories([]);
    }
  };

  const Breadcrumb: React.FC<{ path: CategoryPath[] }> = ({ path }) => {
    if (path.length === 0) return null;

    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <Home className="w-4 h-4" />
        {path.map((item, index) => (
          <React.Fragment key={item.categoryId}>
            <ChevronRight className="w-4 h-4" />
            <span 
              className={`${index === path.length - 1 ? 'font-semibold text-blue-600' : 'hover:text-blue-600 cursor-pointer'}`}
              onClick={() => index < path.length - 1 ? loadCategoryPath(item.categoryId) : undefined}
            >
              {item.categoryName}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const CategoryCard: React.FC<{ category: CJCategory; onClick: () => void }> = ({ category, onClick }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-1">{category.categoryName}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Badge variant="outline">Niveau {category.level}</Badge>
              {category.productCount && (
                <Badge variant="secondary">{category.productCount} produits</Badge>
              )}
              {category.isPopular && (
                <Badge variant="default" className="bg-yellow-500">
                  <Star className="w-3 h-3 mr-1" />
                  Populaire
                </Badge>
              )}
            </div>
          </div>
          {category.hasChildren && (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Explorateur de Catégories CJ</h1>
        <Button onClick={loadPopularCategories} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Actualiser
        </Button>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Recherche de Catégories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Input
              placeholder="Rechercher une catégorie..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Breadcrumb */}
      {categoryPath.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <Breadcrumb path={categoryPath} />
          </CardContent>
        </Card>
      )}

      {/* Catégorie sélectionnée */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle>Catégorie Sélectionnée</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg text-blue-800">{selectedCategory.categoryName}</h3>
              <div className="flex items-center space-x-2 mt-2">
                <Badge>ID: {selectedCategory.categoryId}</Badge>
                <Badge variant="outline">Niveau {selectedCategory.level}</Badge>
                {selectedCategory.hasChildren && (
                  <Badge variant="secondary">A des sous-catégories</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Catégories populaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Catégories Populaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {popularCategories.map((category) => (
                <CategoryCard
                  key={category.categoryId}
                  category={category}
                  onClick={() => selectCategory(category)}
                />
              ))}
              {popularCategories.length === 0 && !loading && (
                <p className="text-gray-500 text-center py-4">Aucune catégorie populaire disponible</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Résultats de recherche ou sous-catégories */}
        <Card>
          <CardHeader>
            <CardTitle>
              {searchResults.length > 0 ? 'Résultats de Recherche' : 'Sous-catégories'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(searchResults.length > 0 ? searchResults : subCategories).map((category) => (
                <CategoryCard
                  key={category.categoryId}
                  category={category}
                  onClick={() => selectCategory(category)}
                />
              ))}
              {searchResults.length === 0 && subCategories.length === 0 && !loading && (
                <p className="text-gray-500 text-center py-4">
                  {selectedCategory?.hasChildren 
                    ? 'Aucune sous-catégorie disponible'
                    : 'Effectuez une recherche ou sélectionnez une catégorie avec des sous-catégories'
                  }
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
};

export default CategoryExplorer;