import { useMemo, useEffect } from 'react';
import { useProducts, useCategories } from '../hooks/useQueries';
import ProductCard from './ProductCard';
import { Loader2 } from 'lucide-react';

interface ProductGridProps {
  selectedCategories: string[];
}

export default function ProductGrid({ selectedCategories }: ProductGridProps) {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  // Log when component renders
  useEffect(() => {
    console.log('[ProductGrid] 🎨 Rendering with products:', {
      timestamp: new Date().toISOString(),
      productCount: products.length,
      productIds: products.map(p => p.id),
      selectedCategories,
    });
  }, [products, selectedCategories]);

  // Log when products array changes
  useEffect(() => {
    console.log('[ProductGrid] 📦 Products changed:', {
      timestamp: new Date().toISOString(),
      productCount: products.length,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        categoryId: p.categoryId,
      })),
    });
  }, [products]);

  // Helper function to get all descendant category names
  const getCategoryAndDescendants = (categoryName: string): string[] => {
    const subcategories = categories.filter(c => c.parent === categoryName);
    return [categoryName, ...subcategories.map(sub => sub.name)];
  };

  const filteredProducts = useMemo(() => {
    console.log('[ProductGrid] 🔍 Filtering products:', {
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      selectedCategories,
    });

    if (selectedCategories.length === 0) {
      console.log('[ProductGrid] ✅ No filters applied, showing all products:', products.length);
      return products;
    }

    // Build a set of all category names that should be included
    const includedCategories = new Set<string>();
    selectedCategories.forEach(selectedCat => {
      // If it's a parent category, include it and all its subcategories
      const allRelated = getCategoryAndDescendants(selectedCat);
      allRelated.forEach(cat => includedCategories.add(cat));
    });

    console.log('[ProductGrid] 📋 Included categories:', Array.from(includedCategories));

    const filtered = products.filter((product) => {
      const isIncluded = includedCategories.has(product.categoryId);
      if (!isIncluded) {
        console.log('[ProductGrid] ❌ Product filtered out:', {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          reason: 'Category not in selected filters',
        });
      }
      return isIncluded;
    });

    console.log('[ProductGrid] ✅ Filtered to products:', {
      count: filtered.length,
      productIds: filtered.map(p => p.id),
    });

    return filtered;
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
    console.log('[ProductGrid] ⚠️ No products to display:', {
      totalProducts: products.length,
      filteredProducts: filteredProducts.length,
      selectedCategories,
    });
    
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

  console.log('[ProductGrid] 🎯 Rendering product cards:', filteredProducts.length);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
