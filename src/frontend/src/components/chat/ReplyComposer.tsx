import { Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../../backend";
import { useCreatePost } from "../../hooks/useQueries";
import { storageService } from "../../services/storageService";
import { validateImageFile } from "../../utils/file";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import GifPicker from "./GifPicker";

interface ReplyComposerProps {
  parentId: bigint;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReplyComposer({
  parentId,
  onSuccess,
  onCancel,
}: ReplyComposerProps) {
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
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

  const handleGifSelect = (gifUrl: string) => {
    setShowGifPicker(false);
    if (!navigator.onLine) {
      toast.error("You are offline. Please reconnect to send replies.");
      return;
    }
    createPost(
      { content: gifUrl, parentId, image: null },
      {
        onSuccess: () => {
          toast.success("Reply posted");
          onSuccess?.();
        },
        onError: (error: any) => {
          toast.error(error?.message || "Failed to post reply");
        },
      },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedImage) || isPending) return;

    // Offline guard
    if (!navigator.onLine) {
      toast.error("You are offline. Please reconnect to send replies.");
      return;
    }

    try {
      let imageBlob: ExternalBlob | null = null;

      if (selectedImage) {
        // Compress before upload via storage service
        const { bytes } =
          await storageService.prepareImageForUpload(selectedImage);
        imageBlob = ExternalBlob.fromBytes(
          bytes as Uint8Array<ArrayBuffer>,
        ).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      createPost(
        { content: content.trim(), parentId, image: imageBlob },
        {
          onSuccess: () => {
            setContent("");
            handleClearImage();
            setUploadProgress(0);
            toast.success("Reply posted");
            onSuccess?.();
          },
          onError: (error: any) => {
            toast.error(error?.message || "Failed to post reply");
            setUploadProgress(0);
          },
        },
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to prepare image");
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pl-8 pt-2 min-w-0">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image preview above input row */}
      {previewUrl && selectedImage && (
        <div className="relative inline-block max-w-full">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full h-auto rounded-lg border border-border"
            style={{ maxHeight: "160px" }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
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

      {/* Input row: [text input] [GIF] [paperclip] [send] [cancel] */}
      <div className="flex gap-1.5 min-w-0 items-center">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a reply..."
          disabled={isPending}
          className="text-sm min-w-0 flex-1"
          data-ocid="chat.reply.input"
        />

        {/* GIF button — matches the main chat input GIF button exactly */}
        <>
          {showGifPicker && (
            <GifPicker
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
              anchorRef={gifButtonRef}
            />
          )}
          <Button
            ref={gifButtonRef}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowGifPicker(!showGifPicker)}
            disabled={isPending}
            className="flex-shrink-0 text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold h-9 px-2"
            aria-label="Search GIFs"
            data-ocid="chat.reply.gif_button"
          >
            GIF
          </Button>
        </>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          aria-label="Attach image"
          className="flex-shrink-0 h-8 w-8"
          data-ocid="chat.reply.upload_button"
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="submit"
          disabled={(!content.trim() && !selectedImage) || isPending}
          size="icon"
          className="flex-shrink-0 h-8 w-8"
          data-ocid="chat.reply.submit_button"
        >
          <Send className="h-3 w-3" />
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="flex-shrink-0 h-8 px-2 text-xs"
            data-ocid="chat.reply.cancel_button"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
