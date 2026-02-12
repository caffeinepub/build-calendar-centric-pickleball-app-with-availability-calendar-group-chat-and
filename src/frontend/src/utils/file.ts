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
        reject(new Error('Failed to read file as ArrayBuffer'));
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
  if (!name || name.trim() === '') {
    return '??';
  }
  
  return name
    .trim()
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
