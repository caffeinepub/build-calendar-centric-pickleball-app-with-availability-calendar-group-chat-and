import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ReactionType } from "../../backend";
import type { Post } from "../../backend";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useAddReaction, useRemoveReaction } from "../../hooks/useQueries";
import { Button } from "../ui/button";

interface ReactionControlsProps {
  post: Post;
}

/**
 * Module-level store so emoji selections survive component remounts
 * (tab switches, scroll virtualization, etc.).
 * Key: post id string → selected emoji string
 */
const emojiSelectionStore = new Map<string, string>();

// Fixed emoji set — each maps to a backend ReactionType
const EMOJI_REACTIONS: Array<{
  emoji: string;
  label: string;
  type: ReactionType;
}> = [
  { emoji: "👍", label: "Like", type: ReactionType.like },
  { emoji: "👎", label: "Dislike", type: ReactionType.dislike },
  { emoji: "😂", label: "Haha", type: ReactionType.like },
  { emoji: "❤️", label: "Love", type: ReactionType.like },
  { emoji: "🔥", label: "Fire", type: ReactionType.like },
  { emoji: "😮", label: "Wow", type: ReactionType.like },
];

export default function ReactionControls({ post }: ReactionControlsProps) {
  const { identity } = useInternetIdentity();
  const { mutate: addReaction, isPending: isAddingReaction } = useAddReaction();
  const { mutate: removeReaction, isPending: isRemovingReaction } =
    useRemoveReaction();

  const postIdStr = post.id.toString();

  // Track optimistic counts
  const [optimisticLikes, setOptimisticLikes] = useState<number | null>(null);
  const [optimisticDislikes, setOptimisticDislikes] = useState<number | null>(
    null,
  );

  // Track which emoji the user has selected (null = no reaction).
  // Initialise from module-level store first, then fall back to localStorage.
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(() => {
    const stored = emojiSelectionStore.get(postIdStr);
    if (stored) return stored;
    try {
      const ls = localStorage.getItem(`emoji_sel_${postIdStr}`);
      if (ls) {
        emojiSelectionStore.set(postIdStr, ls); // sync to memory store
        return ls;
      }
    } catch {
      // localStorage may be unavailable in some environments
    }
    return null;
  });

  // When the post prop is updated from outside (e.g. poll refresh), clear
  // optimistic counts so we display the authoritative backend values.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    setOptimisticLikes(null);
    setOptimisticDislikes(null);
  }, [post.likesCount, post.dislikesCount]);

  // Controls visibility of the emoji picker (opened via smiley button)
  const [showPicker, setShowPicker] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  const isPending = isAddingReaction || isRemovingReaction;

  const likesCount =
    optimisticLikes !== null ? optimisticLikes : Number(post.likesCount);
  const dislikesCount =
    optimisticDislikes !== null
      ? optimisticDislikes
      : Number(post.dislikesCount);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  const handleEmojiClick = (emojiDef: (typeof EMOJI_REACTIONS)[number]) => {
    if (!identity || isPending) return;

    // Close the picker after selecting
    setShowPicker(false);

    const { emoji, type: reactionType } = emojiDef;

    if (selectedEmoji === emoji) {
      // Remove reaction — clicking same emoji deselects it
      const prevEmoji = selectedEmoji;
      const prevEmojiDef = EMOJI_REACTIONS.find((e) => e.emoji === prevEmoji);
      const prevType = prevEmojiDef?.type ?? ReactionType.like;

      emojiSelectionStore.delete(postIdStr);
      try {
        localStorage.removeItem(`emoji_sel_${postIdStr}`);
      } catch {}
      setSelectedEmoji(null);
      if (prevType === ReactionType.like) {
        setOptimisticLikes(likesCount - 1);
      } else {
        setOptimisticDislikes(dislikesCount - 1);
      }

      removeReaction(post.id, {
        onSuccess: () => {
          // Keep optimistic state until the next poll updates the post prop
          // Clearing here would revert to stale post.likesCount
        },
        onError: (error: any) => {
          setOptimisticLikes(null);
          setOptimisticDislikes(null);
          emojiSelectionStore.set(postIdStr, prevEmoji);
          try {
            localStorage.setItem(`emoji_sel_${postIdStr}`, prevEmoji);
          } catch {}
          setSelectedEmoji(prevEmoji);
          toast.error(error?.message || "Failed to remove reaction");
        },
      });
    } else {
      // Add or switch reaction
      const prevEmoji = selectedEmoji;
      const prevEmojiDef = prevEmoji
        ? EMOJI_REACTIONS.find((e) => e.emoji === prevEmoji)
        : null;
      const prevType = prevEmojiDef?.type ?? null;

      emojiSelectionStore.set(postIdStr, emoji);
      try {
        localStorage.setItem(`emoji_sel_${postIdStr}`, emoji);
      } catch {}
      setSelectedEmoji(emoji);

      // Adjust counts optimistically
      if (reactionType === ReactionType.like) {
        setOptimisticLikes(likesCount + 1);
        if (prevType === ReactionType.dislike) {
          setOptimisticDislikes(dislikesCount - 1);
        } else if (prevType === ReactionType.like) {
          // switching from one "like"-mapped emoji to another → no net change
          setOptimisticLikes(likesCount);
        }
      } else {
        setOptimisticDislikes(dislikesCount + 1);
        if (prevType === ReactionType.like) {
          setOptimisticLikes(likesCount - 1);
        }
      }

      addReaction(
        { postId: post.id, reactionType },
        {
          onSuccess: () => {
            // Keep optimistic state until the next poll updates the post prop
          },
          onError: (error: any) => {
            setOptimisticLikes(null);
            setOptimisticDislikes(null);
            if (prevEmoji) {
              emojiSelectionStore.set(postIdStr, prevEmoji);
              try {
                localStorage.setItem(`emoji_sel_${postIdStr}`, prevEmoji);
              } catch {}
            } else {
              emojiSelectionStore.delete(postIdStr);
              try {
                localStorage.removeItem(`emoji_sel_${postIdStr}`);
              } catch {}
            }
            setSelectedEmoji(prevEmoji);
            toast.error(error?.message || "Failed to add reaction");
          },
        },
      );
    }
  };

  // Build the list of reaction pills to always show (count > 0 or selected by user)
  const selectedLikeEmoji = selectedEmoji
    ? EMOJI_REACTIONS.find(
        (e) => e.emoji === selectedEmoji && e.type === ReactionType.like,
      )
    : null;

  const reactionPills = EMOJI_REACTIONS.map((emojiDef) => {
    const isSelected = selectedEmoji === emojiDef.emoji;
    let count = 0;
    if (emojiDef.emoji === "👎") {
      count = dislikesCount;
    } else if (emojiDef.type === ReactionType.like) {
      if (selectedLikeEmoji) {
        count = emojiDef.emoji === selectedLikeEmoji.emoji ? likesCount : 0;
      } else {
        // No like-mapped emoji selected by this user — show total on 👍 only
        count = emojiDef.emoji === "👍" ? likesCount : 0;
      }
    }
    return { ...emojiDef, count, isSelected };
  }).filter((pill) => pill.count > 0);

  return (
    <div className="flex flex-col gap-1 min-w-0" ref={pickerRef}>
      {/* Always-visible reaction pills row */}
      {reactionPills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {reactionPills.map((pill) => (
            <button
              key={pill.emoji}
              type="button"
              disabled={isPending || !identity}
              aria-label={`${pill.label}: ${pill.count}`}
              data-ocid="chat.reaction.button"
              onClick={() => handleEmojiClick(pill)}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors cursor-pointer select-none ${
                pill.isSelected
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-muted/60 border-border text-foreground hover:bg-muted"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="leading-none text-sm">{pill.emoji}</span>
              <span className="font-medium leading-none">{pill.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji picker trigger + inline picker */}
      <div className="flex items-center gap-0.5">
        {!showPicker && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending || !identity}
            aria-label="React to message"
            data-ocid="chat.reaction.button"
            onClick={() => setShowPicker(true)}
            className="h-6 w-6 p-0 min-w-0 hover:bg-muted rounded-full"
          >
            <Smile className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}

        {showPicker && (
          <div className="flex items-center flex-wrap gap-0.5">
            {EMOJI_REACTIONS.map((emojiDef) => {
              const isSelected = selectedEmoji === emojiDef.emoji;
              return (
                <Button
                  key={emojiDef.emoji}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleEmojiClick(emojiDef)}
                  disabled={isPending}
                  aria-label={emojiDef.label}
                  data-ocid="chat.reaction.button"
                  className={`h-7 w-7 p-0 text-base min-w-0 rounded-full ${
                    isSelected
                      ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="leading-none">{emojiDef.emoji}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
