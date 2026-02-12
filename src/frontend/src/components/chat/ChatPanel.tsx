import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useGetRecentMessages, useSendMessage } from '../../hooks/useQueries';
import { useUserDirectory } from '../../hooks/useUserDirectory';
import { formatTime } from '../../lib/date';

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const { data: messages = [], isLoading } = useGetRecentMessages(50);
  const { mutate: sendMessage, isPending } = useSendMessage();

  const principals = messages.map(([principal]) => principal);
  const { data: userDirectory } = useUserDirectory(principals);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isPending) return;

    sendMessage(message.trim(), {
      onSuccess: () => {
        setMessage('');
      },
    });
  };

  return (
    <Card className="h-[300px]">
      <CardHeader>
        <CardTitle>Group Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-5rem)]">
        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-muted-foreground text-xs">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(([principal, text, timestamp], index) => {
                const displayName = userDirectory?.get(principal.toString()) || 'Loading...';
                
                return (
                  <div key={index}>
                    {index > 0 && <Separator className="my-2" />}
                    <div className="space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-xs">{displayName}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(timestamp)}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
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
