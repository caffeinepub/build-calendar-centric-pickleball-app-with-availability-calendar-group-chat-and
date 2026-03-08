import {
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import {
  useDeletePost,
  useEditPost,
  useGetAllBadgeDefinitions,
  useGetUserBadges,
} from "../../hooks/useQueries";
import { useUserDirectoryWithAvatars } from "../../hooks/useUserDirectory";
import type { ThreadNode } from "../../lib/chatThreads";
import { formatDateTime } from "../../lib/date";
import SeasonChampionBadge from "../badges/SeasonChampionBadge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Textarea } from "../ui/textarea";
import AvatarName from "../user/AvatarName";
import DeleteMessageDialog from "./DeleteMessageDialog";
import ReactionControls from "./ReactionControls";
import ReplyComposer from "./ReplyComposer";

interface ThreadedPostTreeProps {
  nodes: ThreadNode[];
  depth?: number;
  onPostDeleted?: (postId: bigint) => void;
}

export default function ThreadedPostTree({
  nodes,
  depth = 0,
  onPostDeleted,
}: ThreadedPostTreeProps) {
  const principals = nodes.flatMap((node) => [
    node.post.author,
    ...node.replies.flatMap((reply) => getAllAuthors(reply)),
  ]);
  const { data: userDirectory, isLoading: isLoadingDirectory } =
    useUserDirectoryWithAvatars(principals);

  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <PostItem
          key={node.post.id.toString()}
          node={node}
          depth={depth}
          userDirectory={userDirectory}
          isLoadingDirectory={isLoadingDirectory}
          onPostDeleted={onPostDeleted}
        />
      ))}
    </div>
  );
}

function getAllAuthors(node: ThreadNode): any[] {
  return [
    node.post.author,
    ...node.replies.flatMap((reply) => getAllAuthors(reply)),
  ];
}

interface PostItemProps {
  node: ThreadNode;
  depth: number;
  userDirectory:
    | Map<string, { displayName: string; avatarUrl?: string }>
    | undefined;
  isLoadingDirectory: boolean;
  onPostDeleted?: (postId: bigint) => void;
}

function PostItem({
  node,
  depth,
  userDirectory,
  isLoadingDirectory,
  onPostDeleted,
}: PostItemProps) {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { post, replies } = node;
  const { identity } = useInternetIdentity();
  const principalStr = post.author.toString();
  const user = userDirectory?.get(principalStr);

  const editPostMutation = useEditPost();
  const deletePostMutation = useDeletePost();

  // Season Champion badge data for this post's author
  const { data: authorBadgeIds = [] } = useGetUserBadges(post.author);
  const { data: allBadgeDefinitions = [] } = useGetAllBadgeDefinitions();

  const isOwnPost =
    identity && post.author.toString() === identity.getPrincipal().toString();

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : "";
  const borderClass = depth > 0 ? "border-l-2 border-muted pl-4" : "";

  const handleEditClick = () => {
    setEditContent(post.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      await editPostMutation.mutateAsync({
        postId: post.id,
        newContent: editContent.trim(),
      });
      toast.success("Message updated");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update message");
      console.error("Edit error:", error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleDeleteConfirm = async () => {
    try {
      await deletePostMutation.mutateAsync(post.id);
      toast.success("Message deleted");
      setShowDeleteDialog(false);
      // Immediately remove this post (and its replies) from the visible list
      onPostDeleted?.(post.id);
    } catch (error) {
      toast.error("Failed to delete message");
      console.error("Delete error:", error);
    }
  };

  return (
    <div className={`${indentClass} ${borderClass} min-w-0`}>
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarName
            principal={post.author}
            displayName={user?.displayName || "Loading..."}
            avatarUrl={user?.avatarUrl}
            isLoading={isLoadingDirectory}
            size="sm"
            avatarClassName="h-[25px] w-[25px] flex-shrink-0"
            nameClassName="text-[14px] font-medium truncate"
          />
          <SeasonChampionBadge
            earnedBadgeIds={authorBadgeIds}
            allDefinitions={allBadgeDefinitions}
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatDateTime(post.timestamp)}
          </span>
          {post.edited && (
            <span className="text-xs text-muted-foreground/70 italic whitespace-nowrap flex-shrink-0">
              (edited)
            </span>
          )}
          {isOwnPost && !isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 ml-auto"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditClick}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="pl-8 space-y-2 min-w-0">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none"
              placeholder="Edit your message..."
              disabled={editPostMutation.isPending}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={editPostMutation.isPending || !editContent.trim()}
              >
                {editPostMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={editPostMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {post.content && (
              <p className="text-sm pl-8 break-words overflow-wrap-anywhere whitespace-pre-wrap min-w-0">
                {post.content}
              </p>
            )}

            {post.image && (
              <div className="pl-8 min-w-0">
                <img
                  src={post.image.getDirectURL()}
                  alt="Attached"
                  className="max-w-full h-auto rounded-lg border border-border"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pl-8 flex-wrap">
              <ReactionControls post={post} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyComposer(!showReplyComposer)}
                className="gap-1 h-7 px-2"
              >
                <MessageSquare className="h-3 w-3" />
                <span className="text-xs">Reply</span>
              </Button>
            </div>
          </>
        )}

        {showReplyComposer && !isEditing && (
          <ReplyComposer
            parentId={post.id}
            onSuccess={() => setShowReplyComposer(false)}
            onCancel={() => setShowReplyComposer(false)}
          />
        )}
      </div>

      {replies.length > 0 && (
        <div className="mt-4 min-w-0">
          <ThreadedPostTree
            nodes={replies}
            depth={depth + 1}
            onPostDeleted={onPostDeleted}
          />
        </div>
      )}

      <DeleteMessageDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        isDeleting={deletePostMutation.isPending}
      />
    </div>
  );
}
