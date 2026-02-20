import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { StoreSettings } from '../backend';

export function useSettingsQuery() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<StoreSettings | null>({
    queryKey: ['storeSettings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStoreSettings();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useUpdateSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: StoreSettings) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateStoreSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
    },
  });
}
