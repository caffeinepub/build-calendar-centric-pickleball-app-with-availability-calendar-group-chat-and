import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useGetRecentMessages, useSendMessage } from '../../hooks/useQueries';
import { useUserDirectoryWithAvatars } from '../../hooks/useUserDirectory';
import { formatTime } from '../../lib/date';
import AvatarName from '../user/AvatarName';

const DEFAULT_VISIBLE_MESSAGES = 10;

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const [shouldScrollToTop, setShouldScrollToTop] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const { data: messages = [], isLoading } = useGetRecentMessages(50);
  const { mutate: sendMessage, isPending } = useSendMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const principals = messages.map(([principal]) => principal);
  const { data: userDirectory, isLoading: isLoadingDirectory } = useUserDirectoryWithAvatars(principals);

  const hasMoreMessages = messages.length > DEFAULT_VISIBLE_MESSAGES;
  const displayedMessages = showAllMessages ? messages : messages.slice(0, DEFAULT_VISIBLE_MESSAGES);

  useEffect(() => {
    if (scrollRef.current && shouldScrollToTop) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = 0;
      }
      setShouldScrollToTop(false);
    }
  }, [messages, shouldScrollToTop]);

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport && viewport.scrollTop === 0) {
        setShouldScrollToTop(true);
      }
    }
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isPending) return;

    sendMessage(message.trim(), {
      onSuccess: () => {
        setMessage('');
        setShouldScrollToTop(true);
      },
    });
  };

  const toggleShowAllMessages = () => {
    setShowAllMessages(!showAllMessages);
    if (showAllMessages) {
      // When collapsing, scroll to top to show newest messages
      setShouldScrollToTop(true);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base">Group Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0">
        <ScrollArea className="flex-1 pr-4 min-h-0" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mb-3 h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-xs text-muted-foreground">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-2">
              {hasMoreMessages && !showAllMessages && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleShowAllMessages}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Show older messages ({messages.length - DEFAULT_VISIBLE_MESSAGES} more)
                  </Button>
                </div>
              )}
              {hasMoreMessages && showAllMessages && (
                <div className="flex justify-center pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleShowAllMessages}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Hide older messages
                  </Button>
                </div>
              )}
              {displayedMessages.map(([principal, text, timestamp], index) => {
                const userEntry = userDirectory?.get(principal.toString());
                const displayName = userEntry?.displayName || 'Loading...';
                const avatarUrl = userEntry?.avatarUrl;
                
                return (
                  <div key={index}>
                    {index > 0 && <Separator className="my-2" />}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <AvatarName
                          principal={principal}
                          displayName={displayName}
                          avatarUrl={avatarUrl}
                          size="sm"
                          isLoading={isLoadingDirectory}
                          avatarClassName="h-[25px] w-[25px] text-[10px]"
                          nameClassName="text-sm"
                        />
                        <span className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap">
                          {formatTime(timestamp)}
                        </span>
                      </div>
                      <p className="text-sm leading-snug">{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="mt-3 flex gap-2 flex-shrink-0">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isPending}
            className="text-sm"
          />
          <Button type="submit" size="icon" disabled={!message.trim() || isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
