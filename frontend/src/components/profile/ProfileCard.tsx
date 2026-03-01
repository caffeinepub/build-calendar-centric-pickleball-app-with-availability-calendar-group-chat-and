import { useState, useRef } from 'react';
import { Camera, Check, X, Pencil } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../../hooks/useCurrentUserProfile';
import { fileToUint8Array, getInitials } from '../../utils/file';
import { ExternalBlob } from '../../backend';

export default function ProfileCard() {
  const { data: userProfile, isLoading } = useGetCallerUserProfile();
  const { mutate: saveProfile, isPending } = useSaveCallerUserProfile();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditName = () => {
    setEditedName(userProfile?.name || '');
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || !userProfile) return;

    saveProfile(
      {
        name: editedName.trim(),
        customProfilePicture: userProfile.customProfilePicture,
      },
      {
        onSuccess: () => {
          setIsEditingName(false);
        },
      }
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPEG, WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
  };

  const handleSaveImage = async () => {
    if (!selectedFile || !userProfile) return;

    try {
      const bytes = await fileToUint8Array(selectedFile);
      // Cast to the expected type for ExternalBlob.fromBytes
      const blob = ExternalBlob.fromBytes(bytes as Uint8Array<ArrayBuffer>).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      saveProfile(
        {
          name: userProfile.name,
          customProfilePicture: blob,
        },
        {
          onSuccess: () => {
            setSelectedFile(null);
            setPreviewImage(null);
            setUploadProgress(0);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          },
        }
      );
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleCancelImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = userProfile?.name || 'User';
  const avatarUrl = userProfile?.customProfilePicture?.getDirectURL();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Section */}
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={previewImage || avatarUrl} alt={displayName} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              aria-label="Change profile picture"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isPending}
            />
          </div>

          {/* Profile Info Section */}
          <div className="flex-1 space-y-4 w-full">
            {/* Name Edit Section */}
            <div className="space-y-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={isPending}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button
                    size="icon"
                    variant="default"
                    onClick={handleSaveName}
                    disabled={!editedName.trim() || isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold">{displayName}</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleEditName}
                    disabled={isPending}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Pickleball Player</p>
            </div>

            {/* Image Upload Actions */}
            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">New profile picture selected</p>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <p className="text-xs text-muted-foreground">Uploading: {uploadProgress}%</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveImage}
                  disabled={isPending}
                >
                  {isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelImage}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
