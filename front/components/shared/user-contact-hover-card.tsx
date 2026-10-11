'use client';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { UserAvatar } from '@/components/shared/user-avatar';
import { RoleBadge } from '@/components/shared/badges';
import { Mail, Phone, Building2, MapPin, Briefcase } from 'lucide-react';
import type { User } from '@/types';

export function UserContactHoverCard({ user, children }: { user: User | undefined; children: React.ReactNode }) {
  if (!user) return <>{children}</>;
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar user={user} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{user.name}</p>
            <div className="mt-0.5"><RoleBadge role={user.role} /></div>
          </div>
        </div>
        <div className="space-y-1.5">
          {user.memberSpecialty && (
            <div className="flex items-center gap-2 text-xs">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{user.memberSpecialty}</span>
            </div>
          )}
          {user.company && (
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{user.company}</span>
            </div>
          )}
          {user.email && (
            <div className="flex items-center gap-2 text-xs">
              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <a href={`mailto:${user.email}`} className="truncate hover:text-primary hover:underline">{user.email}</a>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <a href={`tel:${user.phone.replace(/\s/g, '')}`} className="truncate hover:text-primary hover:underline">{user.phone}</a>
            </div>
          )}
          {user.address && (
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{user.address}</span>
            </div>
          )}
        </div>
        {user.bio && (
          <p className="text-xs text-muted-foreground pt-2.5 mt-2.5 border-t border-border line-clamp-3">{user.bio}</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}