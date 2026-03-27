/**
 * ============================================================================
 * DASHBOARD WIDGET CUSTOMIZATION
 * ============================================================================
 * 
 * Allows admins to customize their dashboard layout with draggable widgets.
 * 
 * Features:
 * - Drag and drop widget reordering
 * - Show/hide widgets
 * - Widget size customization
 * - Persist layout preferences
 * - Reset to default layout
 * 
 * @author UjenziXform Team
 * @version 1.0.0
 * @created December 28, 2025
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard,
  Settings,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Maximize2,
  Minimize2,
  Users,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Activity,
  Camera,
  MapPin
} from 'lucide-react';
import {
  STORAGE_DASHBOARD_LAYOUT_PREFIX,
  STORAGE_DASHBOARD_LAYOUT_PREFIX_LEGACY,
} from '@/config/appIdentity';

function dashboardLayoutStorageKey(userId: string, legacy: boolean): string {
  const prefix = legacy
    ? STORAGE_DASHBOARD_LAYOUT_PREFIX_LEGACY
    : STORAGE_DASHBOARD_LAYOUT_PREFIX;
  return `${prefix}_${userId}`;
}

function readDashboardLayoutRaw(userId: string): string | null {
  const primary = dashboardLayoutStorageKey(userId, false);
  const legacy = dashboardLayoutStorageKey(userId, true);
  const primaryVal = localStorage.getItem(primary);
  if (primaryVal) return primaryVal;
  const legacyVal = localStorage.getItem(legacy);
  if (legacyVal) {
    localStorage.setItem(primary, legacyVal);
    localStorage.removeItem(legacy);
  }
  return legacyVal;
}

function writeDashboardLayout(userId: string, json: string): void {
  localStorage.setItem(dashboardLayoutStorageKey(userId, false), json);
  localStorage.removeItem(dashboardLayoutStorageKey(userId, true));
}

export interface DashboardWidget {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: string;
  defaultSize: 'small' | 'medium' | 'large' | 'full';
  defaultVisible: boolean;
  component?: React.ComponentType<any>;
}

export interface WidgetConfig {
  id: string;
  visible: boolean;
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
}

interface DashboardWidgetsProps {
  userId: string;
  onLayoutChange?: (config: WidgetConfig[]) => void;
}

// Default widgets available in the dashboard
const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'stats-overview',
    name: 'Statistics Overview',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Key metrics and KPIs at a glance',
    category: 'Overview',
    defaultSize: 'full',
    defaultVisible: true
  },
  {
    id: 'user-registrations',
    name: 'Recent Registrations',
    icon: <Users className="h-4 w-4" />,
    description: 'Latest user registration requests',
    category: 'Users',
    defaultSize: 'medium',
    defaultVisible: true
  },
  {
    id: 'delivery-requests',
    name: 'Pending Deliveries',
    icon: <Truck className="h-4 w-4" />,
    description: 'Delivery requests awaiting action',
    category: 'Logistics',
    defaultSize: 'medium',
    defaultVisible: true
  },
  {
    id: 'revenue-chart',
    name: 'Revenue Chart',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Revenue trends and analytics',
    category: 'Finance',
    defaultSize: 'large',
    defaultVisible: true
  },
  {
    id: 'recent-feedback',
    name: 'Recent Feedback',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Latest customer feedback',
    category: 'Support',
    defaultSize: 'medium',
    defaultVisible: true
  },
  {
    id: 'system-alerts',
    name: 'System Alerts',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Critical system notifications',
    category: 'System',
    defaultSize: 'small',
    defaultVisible: true
  },
  {
    id: 'activity-feed',
    name: 'Activity Feed',
    icon: <Activity className="h-4 w-4" />,
    description: 'Real-time activity log',
    category: 'System',
    defaultSize: 'medium',
    defaultVisible: false
  },
  {
    id: 'camera-feeds',
    name: 'Camera Feeds',
    icon: <Camera className="h-4 w-4" />,
    description: 'Live camera monitoring',
    category: 'Monitoring',
    defaultSize: 'large',
    defaultVisible: false
  },
  {
    id: 'gps-map',
    name: 'GPS Tracking Map',
    icon: <MapPin className="h-4 w-4" />,
    description: 'Real-time delivery tracking',
    category: 'Logistics',
    defaultSize: 'large',
    defaultVisible: false
  },
  {
    id: 'pending-products',
    name: 'Product Approvals',
    icon: <Package className="h-4 w-4" />,
    description: 'Products awaiting approval',
    category: 'Products',
    defaultSize: 'medium',
    defaultVisible: true
  }
];

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  userId,
  onLayoutChange
}) => {
  const { toast } = useToast();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Load saved layout on mount
  useEffect(() => {
    loadLayout();
  }, [userId]);

  const loadLayout = () => {
    try {
      const saved = readDashboardLayoutRaw(userId);
      if (saved) {
        const parsed = JSON.parse(saved);
        setWidgetConfigs(parsed);
      } else {
        // Initialize with defaults
        const defaultConfigs: WidgetConfig[] = DEFAULT_WIDGETS.map((widget, index) => ({
          id: widget.id,
          visible: widget.defaultVisible,
          size: widget.defaultSize,
          order: index
        }));
        setWidgetConfigs(defaultConfigs);
      }
    } catch (error) {
      console.error('Error loading dashboard layout:', error);
    }
  };

  const saveLayout = () => {
    try {
      writeDashboardLayout(userId, JSON.stringify(widgetConfigs));
      onLayoutChange?.(widgetConfigs);
      setIsDirty(false);
      toast({
        title: "Layout Saved",
        description: "Your dashboard layout has been saved.",
      });
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({
        title: "Error",
        description: "Failed to save layout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetLayout = () => {
    const defaultConfigs: WidgetConfig[] = DEFAULT_WIDGETS.map((widget, index) => ({
      id: widget.id,
      visible: widget.defaultVisible,
      size: widget.defaultSize,
      order: index
    }));
    setWidgetConfigs(defaultConfigs);
    setIsDirty(true);
    toast({
      title: "Layout Reset",
      description: "Dashboard layout has been reset to defaults.",
    });
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgetConfigs(prev => 
      prev.map(config => 
        config.id === widgetId 
          ? { ...config, visible: !config.visible }
          : config
      )
    );
    setIsDirty(true);
  };

  const changeWidgetSize = (widgetId: string, size: 'small' | 'medium' | 'large' | 'full') => {
    setWidgetConfigs(prev => 
      prev.map(config => 
        config.id === widgetId 
          ? { ...config, size }
          : config
      )
    );
    setIsDirty(true);
  };

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    setWidgetConfigs(prev => {
      const newConfigs = [...prev];
      const draggedIndex = newConfigs.findIndex(c => c.id === draggedWidget);
      const targetIndex = newConfigs.findIndex(c => c.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      // Swap orders
      const draggedOrder = newConfigs[draggedIndex].order;
      newConfigs[draggedIndex].order = newConfigs[targetIndex].order;
      newConfigs[targetIndex].order = draggedOrder;

      return newConfigs.sort((a, b) => a.order - b.order);
    });
    setIsDirty(true);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const getWidgetById = (id: string): DashboardWidget | undefined => {
    return DEFAULT_WIDGETS.find(w => w.id === id);
  };

  const getSizeClass = (size: string): string => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-2';
      case 'large': return 'col-span-3';
      case 'full': return 'col-span-4';
      default: return 'col-span-2';
    }
  };

  const visibleWidgets = widgetConfigs
    .filter(c => c.visible)
    .sort((a, b) => a.order - b.order);

  const categories = [...new Set(DEFAULT_WIDGETS.map(w => w.category))];

  return (
    <>
      {/* Customize Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustomizer(true)}
        className="gap-2"
      >
        <LayoutDashboard className="h-4 w-4" />
        Customize Dashboard
      </Button>

      {/* Customizer Dialog */}
      <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Customize Dashboard Layout
            </DialogTitle>
            <DialogDescription>
              Show, hide, resize, and reorder your dashboard widgets. Drag widgets to reorder them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Quick Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {visibleWidgets.length} / {DEFAULT_WIDGETS.length} widgets visible
                </Badge>
                {isDirty && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={resetLayout}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </div>

            {/* Widgets by Category */}
            {categories.map(category => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-2">
                  {DEFAULT_WIDGETS
                    .filter(w => w.category === category)
                    .map(widget => {
                      const config = widgetConfigs.find(c => c.id === widget.id);
                      if (!config) return null;

                      return (
                        <div
                          key={widget.id}
                          draggable
                          onDragStart={() => handleDragStart(widget.id)}
                          onDragOver={(e) => handleDragOver(e, widget.id)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            config.visible ? 'bg-card' : 'bg-muted/50 opacity-60'
                          } ${draggedWidget === widget.id ? 'ring-2 ring-primary' : ''} cursor-move`}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className={`p-2 rounded-lg ${config.visible ? 'bg-primary/10' : 'bg-muted'}`}>
                              {widget.icon}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{widget.name}</p>
                              <p className="text-xs text-muted-foreground">{widget.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Size Selector */}
                            <Select
                              value={config.size}
                              onValueChange={(value) => changeWidgetSize(widget.id, value as any)}
                              disabled={!config.visible}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">
                                  <div className="flex items-center gap-2">
                                    <Minimize2 className="h-3 w-3" />
                                    Small
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                  <div className="flex items-center gap-2">
                                    <LayoutDashboard className="h-3 w-3" />
                                    Medium
                                  </div>
                                </SelectItem>
                                <SelectItem value="large">
                                  <div className="flex items-center gap-2">
                                    <Maximize2 className="h-3 w-3" />
                                    Large
                                  </div>
                                </SelectItem>
                                <SelectItem value="full">
                                  <div className="flex items-center gap-2">
                                    <Maximize2 className="h-3 w-3" />
                                    Full Width
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Visibility Toggle */}
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={config.visible}
                                onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                              />
                              {config.visible ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizer(false)}>
              Cancel
            </Button>
            <Button onClick={saveLayout} disabled={!isDirty}>
              <Save className="h-4 w-4 mr-2" />
              Save Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview of Current Layout */}
      {/* This would be used in the actual dashboard to render widgets */}
    </>
  );
};

// Hook to use widget configuration in the dashboard
export const useDashboardWidgets = (userId: string) => {
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([]);

  useEffect(() => {
    const saved = readDashboardLayoutRaw(userId);
    if (saved) {
      setWidgetConfigs(JSON.parse(saved));
    } else {
      setWidgetConfigs(DEFAULT_WIDGETS.map((widget, index) => ({
        id: widget.id,
        visible: widget.defaultVisible,
        size: widget.defaultSize,
        order: index
      })));
    }
  }, [userId]);

  const getVisibleWidgets = () => {
    return widgetConfigs
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order);
  };

  const getWidgetConfig = (widgetId: string) => {
    return widgetConfigs.find(c => c.id === widgetId);
  };

  return {
    widgetConfigs,
    getVisibleWidgets,
    getWidgetConfig,
    DEFAULT_WIDGETS
  };
};

export default DashboardWidgets;


