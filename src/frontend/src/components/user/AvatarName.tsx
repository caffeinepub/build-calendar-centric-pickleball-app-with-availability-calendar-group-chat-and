import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { getInitials } from '../../utils/file';
import type { Principal } from '@dfinity/principal';

interface AvatarNameProps {
  principal: Principal;
  displayName: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export default function AvatarName({
  principal,
  displayName,
  avatarUrl,
  size = 'md',
  isLoading = false,
}: AvatarNameProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 text-[10px]',
    md: 'h-6 w-6 text-xs',
    lg: 'h-8 w-8 text-sm',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const initials = displayName && displayName !== 'Loading...' 
    ? getInitials(displayName)
    : principal.toString().slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Avatar className={sizeClasses[size]}>
        {avatarUrl && !isLoading && (
          <AvatarImage src={avatarUrl} alt={displayName} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className={textSizeClasses[size]}>{isLoading ? 'Loading...' : displayName}</span>
    </div>
  );
}
