import { useState } from 'react';
import { Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { useGetRecentMessages, useSendMessage } from '../../hooks/useQueries';
import { useUserDirectoryWithAvatars } from '../../hooks/useUserDirectory';
import { formatDateTime } from '../../lib/date';
import AvatarName from '../user/AvatarName';
import { toast } from 'sonner';
import { InlineLoading } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';

const DEFAULT_VISIBLE_MESSAGES = 10;

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const [showAllMessages, setShowAllMessages] = useState(false);
  const { data: messages = [], isLoading, error, refetch } = useGetRecentMessages();
  const principals = messages.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);
  const { mutate: sendMessage, isPending } = useSendMessage();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isPending) return;

    sendMessage(message.trim(), {
      onSuccess: () => {
        setMessage('');
        toast.success('Message sent');
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to send message');
      },
    });
  };

  const visibleMessages = showAllMessages ? messages : messages.slice(0, DEFAULT_VISIBLE_MESSAGES);
  const hasMoreMessages = messages.length > DEFAULT_VISIBLE_MESSAGES;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Group Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <InlineLoading message="Loading messages..." size="sm" />
          ) : error ? (
            <ErrorState
              message="Failed to load messages. Please try again."
              onRetry={() => refetch()}
            />
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
          ) : (
            <div className="space-y-4">
              {hasMoreMessages && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMessages(!showAllMessages)}
                  className="w-full gap-2"
                >
                  {showAllMessages ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show fewer messages
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show older messages ({messages.length - DEFAULT_VISIBLE_MESSAGES} more)
                    </>
                  )}
                </Button>
              )}
              {visibleMessages.map(([principal, text, timestamp], index) => {
                const principalStr = principal.toString();
                const user = userDirectory?.get(principalStr);

                return (
                  <div key={`${principalStr}-${timestamp.toString()}-${index}`} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AvatarName
                        principal={principal}
                        displayName={user?.displayName || 'Loading...'}
                        avatarUrl={user?.avatarUrl}
                        isLoading={isLoadingDirectory}
                        size="sm"
                        avatarClassName="h-[25px] w-[25px]"
                        nameClassName="text-[14px]"
                      />
                      <span className="text-xs text-muted-foreground">{formatDateTime(timestamp)}</span>
                    </div>
                    <p className="text-sm pl-8">{text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSend} className="flex gap-2 flex-shrink-0">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isPending}
            className="text-[14px]"
          />
          <Button type="submit" disabled={!message.trim() || isPending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
