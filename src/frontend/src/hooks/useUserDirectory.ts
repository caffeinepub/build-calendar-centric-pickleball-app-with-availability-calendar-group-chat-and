import type { Principal } from "@dfinity/principal";
import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";

export interface UserDirectoryEntry {
  displayName: string;
  avatarUrl?: string;
}

export function useUserDirectory(principals: Principal[]) {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, string>>({
    queryKey: ["userDirectory", principals.map((p) => p.toString()).sort()],
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
              directory.set(principalStr, `${principalStr.slice(0, 8)}...`);
            }
          } catch (_error) {
            const principalStr = principal.toString();
            directory.set(principalStr, `${principalStr.slice(0, 8)}...`);
          }
        }),
      );

      return directory;
    },
    enabled: !!actor && !isFetching && principals.length > 0,
    staleTime: 60000,
  });
}

export function useUserDirectoryWithAvatars(principals: Principal[]) {
  const { actor, isFetching } = useActor();

  return useQuery<Map<string, UserDirectoryEntry>>({
    queryKey: [
      "userDirectoryWithAvatars",
      principals.map((p) => p.toString()).sort(),
    ],
    queryFn: async () => {
      if (!actor) return new Map();

      const directory = new Map<string, UserDirectoryEntry>();

      await Promise.all(
        principals.map(async (principal) => {
          try {
            const profile = await actor.getUserProfile(principal);
            if (profile) {
              const entry: UserDirectoryEntry = {
                displayName: profile.name,
                avatarUrl: profile.customProfilePicture?.getDirectURL(),
              };
              directory.set(principal.toString(), entry);
            } else {
              const principalStr = principal.toString();
              directory.set(principalStr, {
                displayName: `${principalStr.slice(0, 8)}...`,
              });
            }
          } catch (_error) {
            const principalStr = principal.toString();
            directory.set(principalStr, {
              displayName: `${principalStr.slice(0, 8)}...`,
            });
          }
        }),
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
    queryKey: ["displayName", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return "Unknown";

      try {
        const profile = await actor.getUserProfile(principal);
        if (profile) {
          return profile.name;
        }
        const principalStr = principal.toString();
        return `${principalStr.slice(0, 8)}...`;
      } catch (_error) {
        const principalStr = principal.toString();
        return `${principalStr.slice(0, 8)}...`;
      }
    },
    enabled: !!actor && !isFetching && !!principal,
    staleTime: 60000,
  });
}
