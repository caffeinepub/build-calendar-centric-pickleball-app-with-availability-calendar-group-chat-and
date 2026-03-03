/**
 * Converts a browser File or Blob to Uint8Array for backend upload.
 */
export async function fileToUint8Array(file: File | Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Gets the initials from a name for fallback avatar display.
 * Handles empty names and returns up to 2 uppercase initials.
 */
export function getInitials(name: string): string {
  if (!name || name.trim() === "") {
    return "??";
  }

  return name
    .trim()
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validates if a file is an image and within size limits.
 */
export function validateImageFile(
  file: File,
  maxSizeMB = 5,
): { valid: boolean; error?: string } {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` };
  }

  return { valid: true };
}
