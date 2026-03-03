import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../../backend";
import { useCreatePost } from "../../hooks/useQueries";
import { fileToUint8Array } from "../../utils/file";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import ImageAttachmentPicker from "./ImageAttachmentPicker";

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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { mutate: createPost, isPending } = useCreatePost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedImage) || isPending) return;

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
        { content: content.trim(), parentId, image: imageBlob },
        {
          onSuccess: () => {
            setContent("");
            setSelectedImage(null);
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
      <ImageAttachmentPicker
        onImageSelected={setSelectedImage}
        selectedFile={selectedImage}
      />
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="text-xs text-muted-foreground">
          Uploading: {uploadProgress}%
        </div>
      )}
      <div className="flex gap-2 min-w-0 items-center">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a reply..."
          disabled={isPending}
          className="text-sm min-w-0 flex-1"
        />
        <Button
          type="submit"
          disabled={(!content.trim() && !selectedImage) || isPending}
          size="sm"
          className="flex-shrink-0"
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
            className="flex-shrink-0"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
