import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Product, Category } from '../backend';
import { ExternalBlob } from '../backend';

export function useCategories() {
  const { actor, isFetching } = useActor();

  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      console.log('[useCategories] Fetching categories...');
      if (!actor) {
        console.log('[useCategories] Actor not available, returning empty array');
        return [];
      }
      try {
        const result = await actor.getCategories();
        console.log('[useCategories] Categories fetched successfully:', result);
        return result || [];
      } catch (error) {
        console.error('[useCategories] Error fetching categories:', error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: Category) => {
      console.group('🔵 [useAddCategory] Category Creation Request');
      console.log('⏰ Timestamp:', new Date().toISOString());
      
      if (!actor) {
        console.error('❌ Actor not initialized');
        console.groupEnd();
        throw new Error('Actor not initialized');
      }
      
      console.log('📝 Input category object:', {
        name: category.name,
        parent: category.parent,
        parentType: typeof category.parent,
        parentIsUndefined: category.parent === undefined,
        parentIsNull: category.parent === null,
        parentIsEmptyString: category.parent === '',
        subcategories: category.subcategories,
      });
      
      // Ensure parent is truly undefined (not empty string) for top-level categories
      const normalizedCategory: Category = {
        name: category.name,
        subcategories: category.subcategories,
        parent: category.parent && category.parent.trim() !== '' ? category.parent : undefined,
      };
      
      console.log('🔄 Normalized category object:', {
        name: normalizedCategory.name,
        parent: normalizedCategory.parent,
        parentType: typeof normalizedCategory.parent,
        subcategories: normalizedCategory.subcategories,
      });
      
      try {
        console.log('🚀 Calling actor.addCategory...');
        const result = await actor.addCategory(normalizedCategory);
        console.log('✅ Backend response received:', {
          result,
          resultType: typeof result,
          timestamp: new Date().toISOString(),
        });
        console.log('✅ Category added successfully:', normalizedCategory.name);
        console.groupEnd();
        return result;
      } catch (error: any) {
        console.error('❌ Error adding category:', {
          timestamp: new Date().toISOString(),
          categoryName: category.name,
          parent: category.parent,
          normalizedParent: normalizedCategory.parent,
          subcategories: category.subcategories,
          error: error,
          errorMessage: error?.message,
          errorName: error?.name,
          errorStack: error?.stack,
          errorType: typeof error,
          errorKeys: error ? Object.keys(error) : [],
          errorStringified: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        });
        console.groupEnd();
        
        // Re-throw with preserved error information
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('✅ [useAddCategory] onSuccess callback triggered', {
        timestamp: new Date().toISOString(),
        addedCategory: variables.name,
        responseData: data,
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any, variables) => {
      console.error('❌ [useAddCategory] onError callback triggered:', {
        timestamp: new Date().toISOString(),
        attemptedCategory: variables.name,
        error,
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        errorKeys: error ? Object.keys(error) : [],
      });
    },
    retry: false,
  });
}

export function useDeleteCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not initialized');
      
      console.log('[useDeleteCategory] Attempting to delete category:', name);
      
      try {
        const result = await actor.deleteCategory(name);
        console.log('[useDeleteCategory] Backend response:', result);
        console.log('[useDeleteCategory] Category deleted successfully:', name);
        return result;
      } catch (error: any) {
        console.error('[useDeleteCategory] Error deleting category:', {
          categoryName: name,
          error: error,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw error;
      }
    },
    onSuccess: (data, name) => {
      console.log('[useDeleteCategory] Mutation successful, invalidating categories query', {
        deletedCategory: name,
        responseData: data,
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any, name) => {
      console.error('[useDeleteCategory] Mutation error:', {
        attemptedDelete: name,
        error,
        message: error?.message,
        stack: error?.stack,
      });
    },
    retry: false,
  });
}

export function useEditCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ oldName, newCategory }: { oldName: string; newCategory: Category }) => {
      if (!actor) throw new Error('Actor not initialized');
      
      console.log('[useEditCategory] Attempting to edit category:', {
        oldName,
        newName: newCategory.name,
        newParent: newCategory.parent,
        subcategories: newCategory.subcategories,
      });
      
      // Normalize parent field
      const normalizedCategory: Category = {
        name: newCategory.name,
        subcategories: newCategory.subcategories,
        parent: newCategory.parent && newCategory.parent.trim() !== '' ? newCategory.parent : undefined,
      };
      
      try {
        const result = await actor.editCategory(oldName, normalizedCategory);
        console.log('[useEditCategory] Backend response:', result);
        console.log('[useEditCategory] Category edited successfully:', {
          oldName,
          newName: normalizedCategory.name,
        });
        return result;
      } catch (error: any) {
        console.error('[useEditCategory] Error editing category:', {
          oldName,
          newCategory,
          normalizedCategory,
          error: error,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('[useEditCategory] Mutation successful, invalidating queries', {
        oldName: variables.oldName,
        newName: variables.newCategory.name,
        responseData: data,
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any, variables) => {
      console.error('[useEditCategory] Mutation error:', {
        oldName: variables.oldName,
        newCategory: variables.newCategory,
        error,
        message: error?.message,
        stack: error?.stack,
      });
    },
    retry: false,
  });
}

export function useReorderCategories() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryList: Category[]) => {
      if (!actor) throw new Error('Actor not initialized');
      
      console.log('[useReorderCategories] Attempting to reorder categories:', categoryList.map(c => c.name));
      
      try {
        const result = await actor.reorderCategories(categoryList);
        console.log('[useReorderCategories] Backend response:', result);
        console.log('[useReorderCategories] Categories reordered successfully');
        return result;
      } catch (error: any) {
        console.error('[useReorderCategories] Error reordering categories:', {
          categoryCount: categoryList.length,
          error: error,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[useReorderCategories] Mutation successful, invalidating categories query', {
        responseData: data,
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      console.error('[useReorderCategories] Mutation error:', {
        error,
        message: error?.message,
        stack: error?.stack,
      });
    },
    retry: false,
  });
}

export function useProducts() {
  const { actor, isFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useProduct(productId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Product | null>({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getProduct(productId);
    },
    enabled: !!actor && !isFetching && !!productId,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      price,
      image,
      categoryId,
    }: {
      name: string;
      price: bigint;
      image: ExternalBlob;
      categoryId: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.addProduct(name, price, image, categoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useStartBatchUpload() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (category: string) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.startBatchUpload(category);
    },
  });
}

export function useUploadProductImage() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      name,
      image,
      price,
      category,
    }: {
      name: string;
      image: ExternalBlob;
      price: bigint;
      category: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.uploadProductImage(name, image, price, category);
    },
  });
}

export function useFinishBatchUpload() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      await actor.finishBatchUpload();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useStripeConfigured() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['stripeConfigured'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}
