import { useState } from 'react';
import { useCategories } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { Category } from '../backend';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export default function CategoryFilter({ selectedCategories, onCategoriesChange }: CategoryFilterProps) {
  const { data: categories = [], isLoading } = useCategories();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpanded = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get parent categories (categories without a parent)
  const parentCategories = categories.filter(c => !c.parent);
  
  // Get subcategories for a given parent
  const getSubcategories = (parentName: string) => {
    return categories.filter(c => c.parent === parentName);
  };

  // Get all category names that should be included when a parent is selected
  const getCategoryAndDescendants = (categoryName: string): string[] => {
    const subcategories = getSubcategories(categoryName);
    return [categoryName, ...subcategories.map(sub => sub.name)];
  };

  const handleToggleParentCategory = (categoryName: string) => {
    const allRelated = getCategoryAndDescendants(categoryName);
    const isAnySelected = allRelated.some((name) => selectedCategories.includes(name));

    if (isAnySelected) {
      // Remove all related categories
      onCategoriesChange(selectedCategories.filter((c) => !allRelated.includes(c)));
    } else {
      // Add all related categories
      onCategoriesChange([...selectedCategories, ...allRelated]);
    }
  };

  const handleToggleSubcategory = (subcategoryName: string) => {
    if (selectedCategories.includes(subcategoryName)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== subcategoryName));
    } else {
      onCategoriesChange([...selectedCategories, subcategoryName]);
    }
  };

  const handleClearAll = () => {
    onCategoriesChange([]);
  };

  const isParentChecked = (categoryName: string) => {
    const allRelated = getCategoryAndDescendants(categoryName);
    return allRelated.every((name) => selectedCategories.includes(name));
  };

  const isParentIndeterminate = (categoryName: string) => {
    const allRelated = getCategoryAndDescendants(categoryName);
    const selectedCount = allRelated.filter((name) => selectedCategories.includes(name)).length;
    return selectedCount > 0 && selectedCount < allRelated.length;
  };

  return (
    <Card className="border-sage/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg text-terracotta">Filter by Category</CardTitle>
          {selectedCategories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-sage" />
          </div>
        ) : parentCategories.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No categories available</p>
        ) : (
          <div className="space-y-2">
            {parentCategories.map((category) => {
              const subcategories = getSubcategories(category.name);
              const hasSubcategories = subcategories.length > 0;
              const isExpanded = expandedCategories.has(category.name);

              return (
                <div key={category.name} className="space-y-1">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(category.name)}>
                    <div className="flex items-center space-x-2">
                      {hasSubcategories && (
                        <CollapsibleTrigger asChild>
                          <button className="flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                      )}
                      {!hasSubcategories && <div className="w-4" />}
                      <Checkbox
                        id={`category-${category.name}`}
                        checked={isParentChecked(category.name)}
                        onCheckedChange={() => handleToggleParentCategory(category.name)}
                        className="border-sage data-[state=checked]:bg-sage data-[state=checked]:text-white"
                        data-indeterminate={isParentIndeterminate(category.name)}
                      />
                      <Label
                        htmlFor={`category-${category.name}`}
                        className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {category.name}
                      </Label>
                    </div>

                    {hasSubcategories && (
                      <CollapsibleContent className="ml-8 mt-2 space-y-2">
                        {subcategories.map((subcategory) => (
                          <div key={subcategory.name} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${subcategory.name}`}
                              checked={selectedCategories.includes(subcategory.name)}
                              onCheckedChange={() => handleToggleSubcategory(subcategory.name)}
                              className="border-sage data-[state=checked]:bg-sage data-[state=checked]:text-white"
                            />
                            <Label
                              htmlFor={`category-${subcategory.name}`}
                              className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {subcategory.name}
                            </Label>
                          </div>
                        ))}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
