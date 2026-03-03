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

const LONG_PRESS_DURATION = 400;

export default function ReactionControls({ post }: ReactionControlsProps) {
  const { identity } = useInternetIdentity();
  const { mutate: addReaction, isPending: isAddingReaction } = useAddReaction();
  const { mutate: removeReaction, isPending: isRemovingReaction } =
    useRemoveReaction();

  // Track optimistic counts
  const [optimisticLikes, setOptimisticLikes] = useState<number | null>(null);
  const [optimisticDislikes, setOptimisticDislikes] = useState<number | null>(
    null,
  );
  // Track which emoji the user has selected (null = no reaction)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  // Controls visibility of the full emoji picker
  const [showPicker, setShowPicker] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      setShowPicker(true);
    }, LONG_PRESS_DURATION);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

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

      setSelectedEmoji(null);
      if (prevType === ReactionType.like) {
        setOptimisticLikes(likesCount - 1);
      } else {
        setOptimisticDislikes(dislikesCount - 1);
      }

      removeReaction(post.id, {
        onSuccess: () => {
          setOptimisticLikes(null);
          setOptimisticDislikes(null);
        },
        onError: (error: any) => {
          setOptimisticLikes(null);
          setOptimisticDislikes(null);
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
            setOptimisticLikes(null);
            setOptimisticDislikes(null);
          },
          onError: (error: any) => {
            setOptimisticLikes(null);
            setOptimisticDislikes(null);
            setSelectedEmoji(prevEmoji);
            toast.error(error?.message || "Failed to add reaction");
          },
        },
      );
    }
  };

  return (
    <div className="flex items-center gap-0.5" ref={pickerRef}>
      {!showPicker &&
        (selectedEmoji ? (
          // Show the selected emoji as the trigger — long-press to open picker
          (() => {
            const emojiDef = EMOJI_REACTIONS.find(
              (e) => e.emoji === selectedEmoji,
            );
            const showCount = selectedEmoji === "👍" || selectedEmoji === "👎";
            const count = selectedEmoji === "👍" ? likesCount : dislikesCount;
            return (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isPending}
                aria-label={`${emojiDef?.label ?? "Reaction"} — long press to change`}
                data-ocid="chat.reaction.button"
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={startLongPress}
                onTouchEnd={cancelLongPress}
                className="h-7 px-1.5 text-base gap-1 min-w-0 bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
              >
                <span className="leading-none">{selectedEmoji}</span>
                {showCount && count > 0 && (
                  <span className="text-xs font-medium leading-none">
                    {count}
                  </span>
                )}
              </Button>
            );
          })()
        ) : (
          // No reaction yet — show neutral smiley trigger
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            aria-label="React to message"
            data-ocid="chat.reaction.button"
            onMouseDown={startLongPress}
            onMouseUp={cancelLongPress}
            onMouseLeave={cancelLongPress}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            className="h-7 w-7 p-0 min-w-0 hover:bg-muted"
          >
            <Smile className="h-4 w-4 text-muted-foreground" />
          </Button>
        ))}

      {showPicker && (
        <div className="flex items-center flex-wrap gap-0.5">
          {EMOJI_REACTIONS.map((emojiDef) => {
            const isSelected = selectedEmoji === emojiDef.emoji;
            const showCount =
              emojiDef.emoji === "👍" || emojiDef.emoji === "👎";
            const count = emojiDef.emoji === "👍" ? likesCount : dislikesCount;

            return (
              <Button
                key={emojiDef.emoji}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                onClick={() => handleEmojiClick(emojiDef)}
                disabled={isPending}
                aria-label={emojiDef.label}
                data-ocid="chat.reaction.button"
                className={`h-8 px-1.5 text-base gap-1 min-w-0 ${
                  isSelected
                    ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                    : "hover:bg-muted"
                }`}
              >
                <span className="leading-none">{emojiDef.emoji}</span>
                {showCount && count > 0 && (
                  <span className="text-xs font-medium leading-none">
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
