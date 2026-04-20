/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📑 GROUPED TAB NAVIGATION                                                         ║
 * ║                                                                                      ║
 * ║   Created: February 12, 2026                                                        ║
 * ║   Purpose: Organize admin dashboard tabs into logical categories with dropdowns     ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  BarChart3,
  ShoppingCart,
  Eye,
  MapPin,
  Globe,
  Users,
  Package,
  FileImage,
  Truck,
  Camera,
  Link2,
  MessageSquare,
  Folder,
  DollarSign,
  Shield,
  UserCheck,
  History,
  Scan,
  QrCode,
  TrendingUp,
  Settings,
  Briefcase,
  UserCog,
  MessageCircle,
  Star,
  ChevronDown,
  Layers,
  Headphones,
  Navigation,
  Video,
  ClipboardList,
} from 'lucide-react';

interface TabGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  tabs: {
    value: string;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
  }[];
}

interface GroupedTabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  shouldShowTab: (tab: string) => boolean;
  stats: {
    pendingOrders?: number;
    totalOrders?: number;
    pendingDeliveryRequests?: number;
  };
  deliveryAppsCount: number;
  deliveryRequestsCount: number;
  /** Optional badge on Finance tab (e.g. document count). Omitted when Finance is fully self-contained in FinancialTab. */
  financialDocsCount?: number;
  // Communication stats
  chatStats?: {
    unreadChats: number;
    openConversations: number;
    pendingFeedback: number;
  };
}

export const GroupedTabNav: React.FC<GroupedTabNavProps> = ({
  activeTab,
  onTabChange,
  shouldShowTab,
  stats,
  deliveryAppsCount,
  deliveryRequestsCount,
  financialDocsCount,
  chatStats,
}) => {
  const tabGroups: TabGroup[] = [
    {
      id: 'main',
      label: 'Main',
      icon: BarChart3,
      color: 'blue',
      tabs: [
        { value: 'overview', label: 'Overview', icon: BarChart3 },
        { value: 'orders', label: 'Orders', icon: ShoppingCart, badge: stats.pendingOrders || undefined },
        { value: 'analytics', label: 'Analytics', icon: TrendingUp },
      ],
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      color: 'green',
      tabs: [
        { value: 'registrations', label: 'Registrations', icon: Users },
        { value: 'user-roles', label: 'User Roles', icon: UserCog },
        { value: 'builder-moderation', label: 'Builder Moderation', icon: Users },
        { value: 'reviews', label: 'Reviews', icon: Star },
      ],
    },
    {
      id: 'logistics',
      label: 'Logistics',
      icon: Truck,
      color: 'orange',
      tabs: [
        { value: 'delivery-apps', label: 'Delivery Apps', icon: Truck, badge: deliveryAppsCount || undefined },
        { value: 'delivery-requests', label: 'Delivery Requests', icon: Package, badge: deliveryRequestsCount || undefined },
        { value: 'tracking', label: 'Tracking Numbers', icon: Navigation },
        { value: 'gps', label: 'GPS Tracking', icon: MapPin },
        { value: 'delivery-analytics', label: 'Delivery Analytics', icon: TrendingUp },
        { value: 'delivery-pay', label: 'DeliveryPay', icon: DollarSign },
      ],
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      color: 'purple',
      tabs: [
        { value: 'pending-products', label: 'Pending Products', icon: Package },
        { value: 'material-images', label: 'Material Images', icon: FileImage },
      ],
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Eye,
      color: 'red',
      tabs: [
        { value: 'videos', label: 'Video Approvals', icon: Video },
        { value: 'monitoring', label: 'Cameras', icon: Eye },
        { value: 'monitoring-requests', label: 'Monitoring Requests', icon: Camera },
        { value: 'camera-assignment', label: 'Camera Assignment', icon: Link2 },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: QrCode,
      color: 'cyan',
      tabs: [
        { value: 'scanning', label: 'QR Scanning', icon: Scan },
        { value: 'qr-codes', label: 'QR Codes', icon: QrCode },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      color: 'teal',
      tabs: [
        { value: 'communications', label: 'LiveChat', icon: MessageSquare, badge: chatStats?.unreadChats || undefined },
        { value: 'voice-calls', label: 'Voice Calls', icon: Headphones },
        { value: 'messaging', label: 'Messaging', icon: MessageCircle },
        { value: 'feedback', label: 'Feedback', icon: MessageSquare, badge: chatStats?.pendingFeedback || undefined },
        { value: 'sms-test', label: 'SMS Test', icon: MessageSquare },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: DollarSign,
      color: 'emerald',
      tabs: [
        {
          value: 'financial',
          label: 'Finance',
          icon: DollarSign,
          badge:
            financialDocsCount != null && financialDocsCount > 0
              ? financialDocsCount
              : undefined,
        },
      ],
    },
    {
      id: 'finance-system',
      label: 'System',
      icon: Layers,
      color: 'slate',
      tabs: [
        { value: 'documents', label: 'Documents', icon: Folder },
        { value: 'supply-chain-docs', label: 'DN · GRN · Invoices', icon: ClipboardList },
        { value: 'staff', label: 'Staff', icon: UserCheck },
        { value: 'security', label: 'Security', icon: Shield },
        { value: 'activity-log', label: 'Activity Log', icon: History },
        { value: 'ml', label: 'Analytics (ML)', icon: BarChart3 },
        { value: 'pages', label: 'Pages', icon: Globe },
        { value: 'careers', label: 'Careers', icon: Briefcase },
        { value: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    red: 'bg-red-600 hover:bg-red-700',
    cyan: 'bg-cyan-600 hover:bg-cyan-700',
    teal: 'bg-teal-600 hover:bg-teal-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    slate: 'bg-slate-600 hover:bg-slate-700',
  };

  const getActiveGroupId = () => {
    for (const group of tabGroups) {
      if (group.tabs.some(tab => tab.value === activeTab)) {
        return group.id;
      }
    }
    return 'main';
  };

  const activeGroupId = getActiveGroupId();

  const aggregateBadge = (groupId: string, visibleTabs: TabGroup['tabs']) => {
    const nums = visibleTabs
      .map((tab) => (typeof tab.badge === 'number' ? tab.badge : 0))
      .filter((n) => n > 0);
    if (nums.length === 0) return { display: 0, sum: 0 };
    const sum = nums.reduce((a, b) => a + b, 0);
    // Communication: avoid inflated sum on the pill; show the largest queue + full total in title
    if (groupId === 'communication') {
      return { display: Math.max(...nums), sum };
    }
    return { display: sum, sum };
  };

  return (
    <div className="grid grid-cols-2 min-[520px]:grid-cols-4 gap-2 p-2 bg-slate-900/50 border border-slate-800 rounded-lg">
      {tabGroups.map((group) => {
        const visibleTabs = group.tabs.filter(tab => shouldShowTab(tab.value));
        if (visibleTabs.length === 0) return null;

        const isActiveGroup = group.id === activeGroupId;
        const { display: badgeDisplay, sum: badgeSum } = aggregateBadge(group.id, visibleTabs);
        const badgeTitle =
          group.id === 'communication' && badgeSum > 0 && badgeDisplay !== badgeSum
            ? `Unread / pending items (max ${badgeDisplay}; ${badgeSum} total across tabs)`
            : undefined;

        return (
          <DropdownMenu key={group.id}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                title={badgeTitle}
                className={`flex w-full min-h-11 items-center justify-center gap-1.5 sm:justify-start ${
                  isActiveGroup 
                    ? `${colorClasses[group.color]} text-white` 
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <group.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline truncate text-left">{group.label}</span>
                <span className="sm:hidden text-xs font-medium truncate">{group.label.split(' ')[0]}</span>
                {badgeDisplay > 0 && (
                  <Badge className="ml-0.5 shrink-0 bg-yellow-600 text-[10px] px-1 sm:text-xs sm:px-1.5">
                    {badgeDisplay > 99 ? '99+' : badgeDisplay}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 ml-0.5 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="bg-slate-900 border-slate-700 min-w-[200px]"
              align="start"
            >
              <DropdownMenuLabel className="text-slate-400 text-xs">
                {group.label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              {visibleTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  onClick={() => onTabChange(tab.value)}
                  className={`cursor-pointer ${
                    activeTab === tab.value 
                      ? `${colorClasses[group.color]} text-white` 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                  {tab.badge && (
                    <Badge className="ml-auto bg-yellow-600 text-xs">{tab.badge}</Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
};

export default GroupedTabNav;
