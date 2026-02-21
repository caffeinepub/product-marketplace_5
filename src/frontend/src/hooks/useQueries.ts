import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Product, Category } from '../backend';
import { ExternalBlob } from '../backend';
import { useEffect } from 'react';

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

  const query = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const timestamp = new Date().toISOString();
      console.log(`[useProducts] 🔍 Query triggered at ${timestamp}`);
      
      if (!actor) {
        console.log('[useProducts] ⚠️ Actor not available, returning empty array');
        return [];
      }
      
      try {
        console.log('[useProducts] 🚀 Calling actor.getAllProducts()...');
        const result = await actor.getAllProducts();
        
        console.log('[useProducts] ✅ Raw response received:', {
          timestamp: new Date().toISOString(),
          productCount: result.length,
          productIds: result.map(p => p.id),
          products: result.map(p => ({
            id: p.id,
            name: p.name,
            categoryId: p.categoryId,
            price: p.price.toString(),
          })),
        });
        
        return result || [];
      } catch (error: any) {
        console.error('[useProducts] ❌ Error fetching products:', {
          timestamp: new Date().toISOString(),
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
  });

  // Log when data changes
  useEffect(() => {
    if (query.data) {
      console.log('[useProducts] 📊 Data updated:', {
        timestamp: new Date().toISOString(),
        productCount: query.data.length,
        productIds: query.data.map(p => p.id),
      });
    }
  }, [query.data]);

  return query;
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
      const timestamp = new Date().toISOString();
      console.log('[useAddProduct] 🚀 Starting product upload:', {
        timestamp,
        name,
        price: price.toString(),
        categoryId,
      });
      
      if (!actor) {
        console.error('[useAddProduct] ❌ Actor not initialized');
        throw new Error('Actor not initialized');
      }
      
      try {
        await actor.addProduct(name, price, image, categoryId);
        console.log('[useAddProduct] ✅ Product uploaded successfully:', {
          timestamp: new Date().toISOString(),
          name,
          categoryId,
        });
      } catch (error: any) {
        console.error('[useAddProduct] ❌ Error uploading product:', {
          timestamp: new Date().toISOString(),
          name,
          categoryId,
          error,
          errorMessage: error?.message,
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      const timestamp = new Date().toISOString();
      console.log('[useAddProduct] 🔄 Invalidating products query cache at', timestamp);
      console.log('[useAddProduct] 📦 Product details:', {
        name: variables.name,
        categoryId: variables.categoryId,
        price: variables.price.toString(),
      });
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Add small delay to allow refetch to complete
      setTimeout(() => {
        console.log('[useAddProduct] ⏱️ Cache invalidation complete, refetch should have triggered');
      }, 100);
    },
  });
}

export function useStartBatchUpload() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (category: string) => {
      console.log('[useStartBatchUpload] 🚀 Starting batch upload for category:', category);
      if (!actor) throw new Error('Actor not initialized');
      await actor.startBatchUpload(category);
      console.log('[useStartBatchUpload] ✅ Batch upload started successfully');
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
      console.log('[useUploadProductImage] 📤 Uploading product image:', {
        name,
        price: price.toString(),
        category,
      });
      
      if (!actor) throw new Error('Actor not initialized');
      await actor.uploadProductImage(name, image, price, category);
      
      console.log('[useUploadProductImage] ✅ Product image uploaded:', name);
    },
  });
}

export function useFinishBatchUpload() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const timestamp = new Date().toISOString();
      console.log('[useFinishBatchUpload] 🏁 Finishing batch upload at', timestamp);
      
      if (!actor) throw new Error('Actor not initialized');
      await actor.finishBatchUpload();
      
      console.log('[useFinishBatchUpload] ✅ Batch upload completed at', new Date().toISOString());
    },
    onSuccess: () => {
      const timestamp = new Date().toISOString();
      console.log('[useFinishBatchUpload] 🔄 Batch complete at', timestamp);
      console.log('[useFinishBatchUpload] 🔄 Invalidating products and categories cache');
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      console.log('[useFinishBatchUpload] ⏱️ Cache invalidated at', new Date().toISOString());
    },
  });
}

export function useUpdateProductImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      newImage,
      onProgress,
    }: {
      productId: string;
      newImage: File;
      onProgress?: (percentage: number) => void;
    }) => {
      console.log('[useUpdateProductImage] Starting image update for product:', productId);
      
      if (!actor) {
        console.error('[useUpdateProductImage] Actor not initialized');
        throw new Error('Actor not initialized');
      }

      try {
        // Convert File to Uint8Array
        const arrayBuffer = await newImage.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('[useUpdateProductImage] Image converted to Uint8Array, size:', uint8Array.length);

        // Create ExternalBlob with progress tracking
        let imageBlob = ExternalBlob.fromBytes(uint8Array);
        
        if (onProgress) {
          imageBlob = imageBlob.withUploadProgress((percentage) => {
            console.log(`[useUpdateProductImage] Upload progress: ${percentage}%`);
            onProgress(percentage);
          });
        }

        console.log('[useUpdateProductImage] Calling backend updateProductImage...');
        const updatedProduct = await actor.updateProductImage(productId, imageBlob);
        
        console.log('[useUpdateProductImage] Image updated successfully:', updatedProduct);
        return updatedProduct;
      } catch (error: any) {
        console.error('[useUpdateProductImage] Error updating product image:', {
          productId,
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('[useUpdateProductImage] Mutation successful, invalidating queries', {
        productId: variables.productId,
        updatedProduct: data,
      });
      // Invalidate both products list and individual product queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
    },
    onError: (error: any, variables) => {
      console.error('[useUpdateProductImage] Mutation error:', {
        productId: variables.productId,
        error,
        message: error?.message,
        stack: error?.stack,
      });
    },
    retry: false,
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
