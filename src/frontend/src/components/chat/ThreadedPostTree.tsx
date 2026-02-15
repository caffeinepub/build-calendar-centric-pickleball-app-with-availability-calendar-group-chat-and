import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { useUserDirectoryWithAvatars } from '../../hooks/useUserDirectory';
import { formatDateTime } from '../../lib/date';
import AvatarName from '../user/AvatarName';
import ReactionControls from './ReactionControls';
import ReplyComposer from './ReplyComposer';
import type { ThreadNode } from '../../lib/chatThreads';

interface ThreadedPostTreeProps {
  nodes: ThreadNode[];
  depth?: number;
}

export default function ThreadedPostTree({ nodes, depth = 0 }: ThreadedPostTreeProps) {
  const principals = nodes.flatMap(node => [
    node.post.author,
    ...node.replies.flatMap(reply => getAllAuthors(reply)),
  ]);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);

  return (
    <div className="space-y-4">
      {nodes.map(node => (
        <PostItem
          key={node.post.id.toString()}
          node={node}
          depth={depth}
          userDirectory={userDirectory}
          isLoadingDirectory={isLoadingDirectory}
        />
      ))}
    </div>
  );
}

function getAllAuthors(node: ThreadNode): any[] {
  return [node.post.author, ...node.replies.flatMap(reply => getAllAuthors(reply))];
}

interface PostItemProps {
  node: ThreadNode;
  depth: number;
  userDirectory: Map<string, { displayName: string; avatarUrl?: string }> | undefined;
  isLoadingDirectory: boolean;
}

function PostItem({ node, depth, userDirectory, isLoadingDirectory }: PostItemProps) {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const { post, replies } = node;
  const principalStr = post.author.toString();
  const user = userDirectory?.get(principalStr);

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : '';
  const borderClass = depth > 0 ? 'border-l-2 border-muted pl-4' : '';

  return (
    <div className={`${indentClass} ${borderClass} min-w-0`}>
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarName
            principal={post.author}
            displayName={user?.displayName || 'Loading...'}
            avatarUrl={user?.avatarUrl}
            isLoading={isLoadingDirectory}
            size="sm"
            avatarClassName="h-[25px] w-[25px] flex-shrink-0"
            nameClassName="text-[14px] font-medium truncate"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{formatDateTime(post.timestamp)}</span>
        </div>
        
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

        {showReplyComposer && (
          <ReplyComposer
            parentId={post.id}
            onSuccess={() => setShowReplyComposer(false)}
            onCancel={() => setShowReplyComposer(false)}
          />
        )}
      </div>

      {replies.length > 0 && (
        <div className="mt-4 min-w-0">
          <ThreadedPostTree nodes={replies} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}
