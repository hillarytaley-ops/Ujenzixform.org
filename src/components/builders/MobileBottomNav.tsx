import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Users, 
  Video, 
  Bell, 
  Menu,
  Plus,
  Search,
  MessageCircle
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'feed' | 'builders' | 'create' | 'notifications' | 'menu';
  onTabChange: (tab: 'feed' | 'builders' | 'create' | 'notifications' | 'menu') => void;
  notificationCount?: number;
  messageCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  notificationCount = 0,
  messageCount = 0
}) => {
  const tabs = [
    { id: 'feed' as const, icon: Home, label: 'Feed' },
    { id: 'builders' as const, icon: Users, label: 'Builders' },
    { id: 'create' as const, icon: Plus, label: 'Create', isSpecial: true },
    { id: 'notifications' as const, icon: Bell, label: 'Alerts', badge: notificationCount },
    { id: 'menu' as const, icon: Menu, label: 'Menu' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Safe area padding for iOS */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-center justify-around py-2 px-2 pb-safe">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 ${
                tab.isSpecial
                  ? 'bg-blue-600 text-white -mt-6 shadow-lg shadow-blue-500/30 rounded-full w-14 h-14'
                  : activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <tab.icon className={`${tab.isSpecial ? 'h-7 w-7' : 'h-6 w-6'}`} />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold text-white bg-red-500 rounded-full px-1">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              {!tab.isSpecial && (
                <span className={`text-xs mt-1 font-medium ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Mobile Header Component
interface MobileHeaderProps {
  title?: string;
  onSearch?: () => void;
  onMessages?: () => void;
  messageCount?: number;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'UjenziXform',
  onSearch,
  onMessages,
  messageCount = 0
}) => {
  return (
    <div className="sticky top-0 z-40 lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo/Title */}
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-full bg-gray-100 dark:bg-gray-800"
            onClick={onSearch}
          >
            <Search className="h-5 w-5 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-full bg-gray-100 dark:bg-gray-800 relative"
            onClick={onMessages}
          >
            <MessageCircle className="h-5 w-5 text-gray-600" />
            {messageCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold text-white bg-red-500 rounded-full px-1">
                {messageCount > 99 ? '99+' : messageCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;
