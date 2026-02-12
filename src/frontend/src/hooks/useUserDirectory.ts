import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Principal } from '@dfinity/principal';
import type { UserProfile } from '../backend';

export function useUserDirectory(principals: Principal[]) {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, string>>({
    queryKey: ['userDirectory', principals.map(p => p.toString()).sort()],
    queryFn: async () => {
      if (!actor) return new Map();
      
      const directory = new Map<string, string>();
      
      await Promise.all(
        principals.map(async (principal) => {
          try {
            const profile = await actor.getUserProfile(principal);
            if (profile) {
              directory.set(principal.toString(), profile.name);
            } else {
              const principalStr = principal.toString();
              directory.set(principalStr, principalStr.slice(0, 8) + '...');
            }
          } catch (error) {
            const principalStr = principal.toString();
            directory.set(principalStr, principalStr.slice(0, 8) + '...');
          }
        })
      );
      
      return directory;
    },
    enabled: !!actor && !isFetching && principals.length > 0,
    staleTime: 60000,
  });
}

export function useGetDisplayName(principal: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ['displayName', principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return 'Unknown';
      
      try {
        const profile = await actor.getUserProfile(principal);
        if (profile) {
          return profile.name;
        }
        const principalStr = principal.toString();
        return principalStr.slice(0, 8) + '...';
      } catch (error) {
        const principalStr = principal.toString();
        return principalStr.slice(0, 8) + '...';
      }
    },
    enabled: !!actor && !isFetching && !!principal,
    staleTime: 60000,
  });
}
