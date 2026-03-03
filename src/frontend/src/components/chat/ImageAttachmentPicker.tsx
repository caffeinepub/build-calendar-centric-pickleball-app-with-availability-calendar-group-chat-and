import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { validateImageFile } from "../../utils/file";
import { Button } from "../ui/button";

interface ImageAttachmentPickerProps {
  onImageSelected: (file: File | null) => void;
  selectedFile: File | null;
  /** When true, renders only the hidden input + paperclip trigger button (no preview). */
  triggerOnly?: boolean;
}

export default function ImageAttachmentPicker({
  onImageSelected,
  selectedFile,
  triggerOnly = false,
}: ImageAttachmentPickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Clear previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create new preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageSelected(file);
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (triggerOnly) {
    // Render only the hidden input + paperclip button (used inline in the input row)
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
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
      </>
    );
  }

  return (
    <div className="space-y-2 min-w-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl && selectedFile && (
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
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {!selectedFile && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0"
          data-ocid="chat.upload_button"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
