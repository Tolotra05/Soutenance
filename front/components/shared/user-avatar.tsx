'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/status';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: User | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
  if (!user) {
    return (
      <div className={cn(sizeMap[size], 'rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium', className)}>
        ?
      </div>
    );
  }
  return (
    <Avatar className={cn(sizeMap[size], className)}>
      <AvatarImage src={user.avatarUrl} alt={user.name} />
      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
        {getInitials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
