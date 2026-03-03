import { Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../../backend";
import { useCreatePost, useGetPosts } from "../../hooks/useQueries";
import { buildThreadTree } from "../../lib/chatThreads";
import { fileToUint8Array, validateImageFile } from "../../utils/file";
import { ErrorState } from "../common/ErrorState";
import { InlineLoading } from "../common/LoadingState";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import ThreadedPostTree from "./ThreadedPostTree";

export default function ChatPanel() {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: posts = [], isLoading, error, refetch } = useGetPosts();
  const { mutate: createPost, isPending } = useCreatePost();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedImage(file);
  };

  const handleClearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || isPending) return;

    try {
      let imageBlob: ExternalBlob | null = null;

      if (selectedImage) {
        const bytes = await fileToUint8Array(selectedImage);
        imageBlob = ExternalBlob.fromBytes(
          bytes as Uint8Array<ArrayBuffer>,
        ).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      createPost(
        { content: message.trim(), parentId: null, image: imageBlob },
        {
          onSuccess: () => {
            setMessage("");
            handleClearImage();
            setUploadProgress(0);
            toast.success("Message sent");
          },
          onError: (error: any) => {
            toast.error(error?.message || "Failed to send message");
            setUploadProgress(0);
          },
        },
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to prepare image");
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
              <p className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              <ThreadedPostTree nodes={threadTree} />
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSend} className="flex-shrink-0 space-y-2">
          {/* Image preview — shown above input row when a file is selected */}
          {previewUrl && selectedImage && (
            <div className="relative inline-block max-w-full">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full h-auto rounded-lg border border-border"
                style={{ maxHeight: "200px" }}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleClearImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="text-xs text-muted-foreground">
              Uploading: {uploadProgress}%
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Input row: [text input] [paperclip] [send] */}
          <div className="flex gap-2 min-w-0 items-center">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isPending}
              className="text-[14px] min-w-0 flex-1"
              data-ocid="chat.input"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
              aria-label="Attach image"
              data-ocid="chat.upload_button"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              disabled={(!message.trim() && !selectedImage) || isPending}
              size="icon"
              className="flex-shrink-0"
              data-ocid="chat.submit_button"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
