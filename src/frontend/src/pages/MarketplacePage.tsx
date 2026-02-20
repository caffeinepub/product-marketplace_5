import { useState } from 'react';
import ProductGrid from '../components/ProductGrid';
import CategoryFilter from '../components/CategoryFilter';

export default function MarketplacePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  return (
    <div className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-3 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Handcrafted with <span className="text-terracotta">Love</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Explore our curated collection of original, artisan-made products. Each piece is unique and crafted with care.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <CategoryFilter
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
          />
        </aside>
        
        <div>
          <ProductGrid selectedCategories={selectedCategories} />
        </div>
      </div>
    </div>
  );
}
