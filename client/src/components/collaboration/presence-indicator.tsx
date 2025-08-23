/**
 * User presence indicator component for real-time collaboration
 */

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Eye, Edit, Clock } from 'lucide-react';

interface PresenceIndicatorProps {
  user: {
    userId: string;
    userName: string;
    userRole: string;
    userEmail: string;
    profileImageUrl?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    currentPage?: string;
    currentActivity?: string;
    currentCustomer?: string;
    lastSeen: string;
    isTyping?: boolean;
    typingIn?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function PresenceIndicator({ user, size = 'md', showDetails = true }: PresenceIndicatorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  const getActivityIcon = (activity?: string) => {
    if (!activity) return null;
    
    if (activity.includes('Viewing')) return <Eye className="h-3 w-3" />;
    if (activity.includes('Editing')) return <Edit className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const avatarSize = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }[size];

  const initials = user.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative inline-flex items-center gap-2 ${showDetails ? 'p-2 rounded-lg hover:bg-muted/50' : ''}`}>
            <div className="relative">
              <Avatar className={avatarSize}>
                <AvatarImage src={user.profileImageUrl} alt={user.userName} />
                <AvatarFallback className="text-xs bg-muted">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              {/* Status indicator */}
              <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(user.status)}`} />
              
              {/* Typing indicator */}
              {user.isTyping && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>

            {showDetails && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">
                    {user.userName}
                  </span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    {user.userRole}
                  </Badge>
                </div>
                
                {user.currentActivity && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    {getActivityIcon(user.currentActivity)}
                    <span className="truncate">{user.currentActivity}</span>
                  </div>
                )}
                
                {user.isTyping && user.typingIn && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>typing in {user.typingIn}...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium">{user.userName}</div>
            <div className="text-xs text-muted-foreground">{user.userEmail}</div>
            <div className="flex items-center gap-1 text-xs">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(user.status)}`} />
              {getStatusText(user.status)}
              {user.status === 'online' ? '' : ` • ${formatLastSeen(user.lastSeen)}`}
            </div>
            {user.currentPage && (
              <div className="text-xs text-muted-foreground">
                Currently on: {user.currentPage}
              </div>
            )}
            {user.currentActivity && (
              <div className="text-xs text-muted-foreground">
                {user.currentActivity}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface OnlineUsersListProps {
  users: any[];
  currentUserId?: string;
  maxVisible?: number;
}

export function OnlineUsersList({ users, currentUserId, maxVisible = 5 }: OnlineUsersListProps) {
  const otherUsers = users.filter(user => user.userId !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

  if (otherUsers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>No other users online</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        <span>Team Online ({otherUsers.length})</span>
      </div>
      
      <div className="space-y-1">
        {visibleUsers.map(user => (
          <PresenceIndicator
            key={user.userId}
            user={user}
            size="sm"
            showDetails={true}
          />
        ))}
        
        {hiddenCount > 0 && (
          <div className="text-xs text-muted-foreground px-2 py-1">
            +{hiddenCount} more online
          </div>
        )}
      </div>
    </div>
  );
}

export function PresenceAvatarGroup({ users, currentUserId, maxVisible = 4 }: OnlineUsersListProps) {
  const otherUsers = users.filter(user => user.userId !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

  return (
    <div className="flex items-center -space-x-2">
      {visibleUsers.map(user => (
        <PresenceIndicator
          key={user.userId}
          user={user}
          size="sm"
          showDetails={false}
        />
      ))}
      
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium">+{hiddenCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span>{hiddenCount} more users online</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}