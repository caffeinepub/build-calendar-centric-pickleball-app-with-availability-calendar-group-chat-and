import type { Principal } from "@dfinity/principal";
import { useEffect, useRef, useState } from "react";
import type { BadgeDefinition } from "../backend";
import { useGetAllBadgeDefinitions, useGetUserBadges } from "./useQueries";

function getStorageKey(principal: Principal) {
  return `seen_badges_${principal.toText()}`;
}

function loadSeenBadges(principal: Principal): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(principal));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set<string>(parsed);
    }
  } catch {
    // ignore parse errors
  }
  return new Set<string>();
}

function saveSeenBadges(principal: Principal, ids: Set<string>) {
  try {
    localStorage.setItem(
      getStorageKey(principal),
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // ignore storage errors
  }
}

/**
 * Watches the user's badge set and queues newly-earned badges for the
 * unlock animation. Uses localStorage to persist the "seen" set across
 * app restarts so the animation only plays once per badge.
 */
export function useBadgeUnlockWatcher(userPrincipal: Principal | null) {
  const { data: allDefinitions = [] } = useGetAllBadgeDefinitions();
  const { data: earnedBadgeIds = [] } = useGetUserBadges(userPrincipal);

  // Queue of badge definitions waiting to be animated
  const [pendingQueue, setPendingQueue] = useState<BadgeDefinition[]>([]);

  // Flag: has the initial snapshot been taken this session?
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userPrincipal) {
      initializedRef.current = false;
      return;
    }

    // Wait until we have a real response (earnedBadgeIds may be [] on first
    // render before the query resolves — we check initializedRef to distinguish
    // "not yet loaded" from "loaded with zero badges").
    if (!initializedRef.current) {
      // Snapshot current earned badges into localStorage as baseline.
      // This covers both "first ever use" and "re-open after earning badges".
      const seenFromStorage = loadSeenBadges(userPrincipal);
      const merged = new Set([...seenFromStorage, ...earnedBadgeIds]);
      saveSeenBadges(userPrincipal, merged);
      initializedRef.current = true;
      return;
    }

    // Subsequent updates — compare against what's stored in localStorage
    const seen = loadSeenBadges(userPrincipal);
    const newIds = earnedBadgeIds.filter((id) => !seen.has(id));

    if (newIds.length > 0) {
      const newBadgeDefs = newIds
        .map((id) => allDefinitions.find((d) => d.id === id))
        .filter((d): d is BadgeDefinition => d !== undefined);

      if (newBadgeDefs.length > 0) {
        setPendingQueue((q) => [...q, ...newBadgeDefs]);
      }

      // Persist the newly seen badges immediately so a refresh won't re-show them
      saveSeenBadges(userPrincipal, new Set([...seen, ...newIds]));
    }
  }, [earnedBadgeIds, allDefinitions, userPrincipal]);

  const dismissBadge = () => {
    setPendingQueue((q) => q.slice(1));
  };

  return {
    pendingBadge: pendingQueue[0] ?? null,
    dismissBadge,
  };
}
