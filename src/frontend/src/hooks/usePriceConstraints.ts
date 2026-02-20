import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { PriceConstraint } from '../backend';

export function usePriceConstraint(category: string) {
  const { actor, isFetching } = useActor();

  return useQuery<PriceConstraint | null>({
    queryKey: ['priceConstraint', category],
    queryFn: async () => {
      if (!actor || !category) return null;
      return actor.getPriceConstraint(category);
    },
    enabled: !!actor && !isFetching && !!category,
  });
}
