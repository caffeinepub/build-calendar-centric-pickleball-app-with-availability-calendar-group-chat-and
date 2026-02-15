import { useState } from 'react';
import { Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { useGetPosts, useCreatePost } from '../../hooks/useQueries';
import { toast } from 'sonner';
import { InlineLoading } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import ThreadedPostTree from './ThreadedPostTree';
import ImageAttachmentPicker from './ImageAttachmentPicker';
import { buildThreadTree } from '../../lib/chatThreads';
import { fileToUint8Array } from '../../utils/file';
import { ExternalBlob } from '../../backend';

export default function ChatPanel() {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { data: posts = [], isLoading, error, refetch } = useGetPosts();
  const { mutate: createPost, isPending } = useCreatePost();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || isPending) return;

    try {
      let imageBlob: ExternalBlob | null = null;
      
      if (selectedImage) {
        const bytes = await fileToUint8Array(selectedImage);
        imageBlob = ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      createPost(
        { content: message.trim(), parentId: null, image: imageBlob },
        {
          onSuccess: () => {
            setMessage('');
            setSelectedImage(null);
            setUploadProgress(0);
            toast.success('Message sent');
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to send message');
            setUploadProgress(0);
          },
        }
      );
    } catch (error: any) {
      toast.error(error?.message || 'Failed to prepare image');
      setUploadProgress(0);
    }
  };

  const threadTree = buildThreadTree(posts);

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Group Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4">
            {isLoading ? (
              <InlineLoading message="Loading messages..." size="sm" />
            ) : error ? (
              <ErrorState
                message="Failed to load messages. Please try again."
                onRetry={() => refetch()}
              />
            ) : posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
            ) : (
              <ThreadedPostTree nodes={threadTree} />
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSend} className="flex-shrink-0 space-y-2">
          <ImageAttachmentPicker
            onImageSelected={setSelectedImage}
            selectedFile={selectedImage}
          />
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="text-xs text-muted-foreground">Uploading: {uploadProgress}%</div>
          )}
          <div className="flex gap-2 min-w-0">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isPending}
              className="text-[14px] min-w-0 flex-1"
            />
            <Button type="submit" disabled={(!message.trim() && !selectedImage) || isPending} size="icon" className="flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
