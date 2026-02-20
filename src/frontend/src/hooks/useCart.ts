import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { BasketItem } from '../backend';

export function useCart() {
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  const { data: basketItems = [], isLoading } = useQuery<BasketItem[]>({
    queryKey: ['basket'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBasket();
    },
    enabled: !!actor && !actorFetching,
  });

  const addToBasket = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addToBasket(productId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basket'] });
    },
  });

  const removeFromBasket = useMutation({
    mutationFn: async (productId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.removeFromBasket(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basket'] });
    },
  });

  const clearBasket = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.clearBasket();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basket'] });
    },
  });

  const itemCount = basketItems.reduce((sum, item) => sum + Number(item.quantity), 0);

  return {
    basketItems,
    itemCount,
    isLoading,
    addToBasket: addToBasket.mutateAsync,
    removeFromBasket: removeFromBasket.mutateAsync,
    clearBasket: clearBasket.mutateAsync,
    isAddingToBasket: addToBasket.isPending,
    isRemovingFromBasket: removeFromBasket.isPending,
  };
}
