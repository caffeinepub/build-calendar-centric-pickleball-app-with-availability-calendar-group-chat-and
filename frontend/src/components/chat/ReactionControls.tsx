import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '../ui/button';
import { useAddReaction, useRemoveReaction } from '../../hooks/useQueries';
import { ReactionType } from '../../backend';
import { toast } from 'sonner';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import type { Post } from '../../backend';

interface ReactionControlsProps {
  post: Post;
}

export default function ReactionControls({ post }: ReactionControlsProps) {
  const { identity } = useInternetIdentity();
  const { mutate: addReaction, isPending: isAddingReaction } = useAddReaction();
  const { mutate: removeReaction, isPending: isRemovingReaction } = useRemoveReaction();
  
  // Track optimistic state
  const [optimisticLikes, setOptimisticLikes] = useState<number | null>(null);
  const [optimisticDislikes, setOptimisticDislikes] = useState<number | null>(null);
  const [optimisticUserReaction, setOptimisticUserReaction] = useState<ReactionType | null>(null);

  const isPending = isAddingReaction || isRemovingReaction;

  const likesCount = optimisticLikes !== null ? optimisticLikes : Number(post.likesCount);
  const dislikesCount = optimisticDislikes !== null ? optimisticDislikes : Number(post.dislikesCount);

  // For now, we don't have caller reaction state from backend, so we track it locally
  const userReaction = optimisticUserReaction;

  const handleReaction = (reactionType: ReactionType) => {
    if (!identity || isPending) return;

    // Optimistic update
    if (userReaction === reactionType) {
      // Remove reaction
      setOptimisticUserReaction(null);
      if (reactionType === ReactionType.like) {
        setOptimisticLikes(likesCount - 1);
      } else {
        setOptimisticDislikes(dislikesCount - 1);
      }
      
      removeReaction(post.id, {
        onSuccess: () => {
          setOptimisticLikes(null);
          setOptimisticDislikes(null);
          setOptimisticUserReaction(null);
        },
        onError: (error: any) => {
          // Revert optimistic update
          setOptimisticLikes(null);
          setOptimisticDislikes(null);
          setOptimisticUserReaction(userReaction);
          toast.error(error?.message || 'Failed to remove reaction');
        },
      });
    } else {
      // Add or change reaction
      const previousReaction = userReaction;
      setOptimisticUserReaction(reactionType);
      
      if (reactionType === ReactionType.like) {
        setOptimisticLikes(previousReaction === ReactionType.dislike ? likesCount + 1 : likesCount + 1);
        if (previousReaction === ReactionType.dislike) {
          setOptimisticDislikes(dislikesCount - 1);
        }
      } else {
        setOptimisticDislikes(previousReaction === ReactionType.like ? dislikesCount + 1 : dislikesCount + 1);
        if (previousReaction === ReactionType.like) {
          setOptimisticLikes(likesCount - 1);
        }
      }

      addReaction({ postId: post.id, reactionType }, {
        onSuccess: () => {
          setOptimisticLikes(null);
          setOptimisticDislikes(null);
          setOptimisticUserReaction(null);
        },
        onError: (error: any) => {
          // Revert optimistic update
          setOptimisticLikes(null);
          setOptimisticDislikes(null);
          setOptimisticUserReaction(previousReaction);
          toast.error(error?.message || 'Failed to add reaction');
        },
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={userReaction === ReactionType.like ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleReaction(ReactionType.like)}
        disabled={isPending}
        className="gap-1 h-7 px-2"
      >
        <ThumbsUp className="h-3 w-3" />
        <span className="text-xs">{likesCount}</span>
      </Button>
      <Button
        variant={userReaction === ReactionType.dislike ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleReaction(ReactionType.dislike)}
        disabled={isPending}
        className="gap-1 h-7 px-2"
      >
        <ThumbsDown className="h-3 w-3" />
        <span className="text-xs">{dislikesCount}</span>
      </Button>
    </div>
  );
}
