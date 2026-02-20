import { useMemo } from 'react';
import { useProducts, useCategories } from '../hooks/useQueries';
import ProductCard from './ProductCard';
import { Loader2 } from 'lucide-react';

interface ProductGridProps {
  selectedCategories: string[];
}

export default function ProductGrid({ selectedCategories }: ProductGridProps) {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  // Helper function to get all descendant category names
  const getCategoryAndDescendants = (categoryName: string): string[] => {
    const subcategories = categories.filter(c => c.parent === categoryName);
    return [categoryName, ...subcategories.map(sub => sub.name)];
  };

  const filteredProducts = useMemo(() => {
    if (selectedCategories.length === 0) {
      return products;
    }

    // Build a set of all category names that should be included
    const includedCategories = new Set<string>();
    selectedCategories.forEach(selectedCat => {
      // If it's a parent category, include it and all its subcategories
      const allRelated = getCategoryAndDescendants(selectedCat);
      allRelated.forEach(cat => includedCategories.add(cat));
    });

    return products.filter((product) => {
      // Check if product's categoryId matches any of the included categories
      return includedCategories.has(product.categoryId);
    });
  }, [products, selectedCategories, categories]);

  const isLoading = productsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">No products found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedCategories.length > 0
              ? 'Try adjusting your filters'
              : 'Products will appear here once added'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
