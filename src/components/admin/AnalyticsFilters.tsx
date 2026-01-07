import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Filter,
  X,
  Save,
  FolderOpen,
  Trash2,
  Calendar as CalendarIcon,
  Camera,
  MapPin,
  Bell,
  Truck,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { DateRange } from 'react-day-picker';

export interface FilterConfig {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
    preset?: string;
  };
  cameras: string[];
  projects: string[];
  alertTypes: string[];
  severities: string[];
  deliveryStatuses: string[];
  showResolved: boolean;
}

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filter_config: FilterConfig;
  is_default: boolean;
}

interface AnalyticsFiltersProps {
  onFilterChange: (filters: FilterConfig) => void;
  initialFilters?: Partial<FilterConfig>;
}

const ALERT_TYPES = [
  'camera_offline',
  'camera_low_battery',
  'motion_detected',
  'intrusion_detected',
  'delivery_delayed',
  'delivery_arrived',
  'route_deviation',
  'system_error',
  'maintenance_required',
  'access_request',
  'security_breach',
  'material_quality'
];

const SEVERITIES = ['info', 'warning', 'critical', 'emergency'];
const DELIVERY_STATUSES = ['pending', 'in_transit', 'near_destination', 'arrived', 'completed', 'cancelled'];

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'Custom', value: 'custom' }
];

const defaultFilters: FilterConfig = {
  dateRange: { from: subDays(new Date(), 7), to: new Date(), preset: '7days' },
  cameras: [],
  projects: [],
  alertTypes: [],
  severities: [],
  deliveryStatuses: [],
  showResolved: true
};

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  onFilterChange,
  initialFilters
}) => {
  const [filters, setFilters] = useState<FilterConfig>({ ...defaultFilters, ...initialFilters });
  const [cameras, setCameras] = useState<Array<{ id: string; name: string; project_name?: string }>>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchCameras();
    fetchSavedFilters();
  }, []);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  const fetchCameras = async () => {
    try {
      const { data } = await supabase
        .from('cameras')
        .select('id, name, project_name')
        .order('name');
      
      if (data) {
        setCameras(data);
        const uniqueProjects = [...new Set(data.map(c => c.project_name).filter(Boolean))];
        setProjects(uniqueProjects as string[]);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
    }
  };

  const fetchSavedFilters = async () => {
    try {
      const { data } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('filter_type', 'analytics')
        .order('created_at', { ascending: false });
      
      if (data) {
        setSavedFilters(data.map(f => ({
          ...f,
          filter_config: f.filter_config as FilterConfig
        })));
      }
    } catch (error) {
      console.error('Error fetching saved filters:', error);
    }
  };

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date();
        break;
      case 'yesterday':
        from = subDays(new Date().setHours(0, 0, 0, 0), 1);
        to = subDays(new Date().setHours(23, 59, 59, 999), 1);
        break;
      case '7days':
        from = subDays(now, 7);
        break;
      case '30days':
        from = subDays(now, 30);
        break;
      case 'this_week':
        from = startOfWeek(now);
        to = endOfWeek(now);
        break;
      case 'last_week':
        from = startOfWeek(subDays(now, 7));
        to = endOfWeek(subDays(now, 7));
        break;
      case 'this_month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'last_month':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case '3months':
        from = subMonths(now, 3);
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      dateRange: { from, to, preset }
    }));
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_filters')
        .insert([{
          name: filterName,
          filter_type: 'analytics',
          filter_config: filters
        }]);

      if (error) throw error;
      toast.success('Filter saved successfully');
      setSaveDialogOpen(false);
      setFilterName('');
      fetchSavedFilters();
    } catch (error) {
      console.error('Error saving filter:', error);
      toast.error('Failed to save filter');
    }
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    setFilters({
      ...savedFilter.filter_config,
      dateRange: {
        ...savedFilter.filter_config.dateRange,
        from: savedFilter.filter_config.dateRange.from ? new Date(savedFilter.filter_config.dateRange.from) : undefined,
        to: savedFilter.filter_config.dateRange.to ? new Date(savedFilter.filter_config.dateRange.to) : undefined
      }
    });
    setLoadDialogOpen(false);
    toast.success(`Filter "${savedFilter.name}" applied`);
  };

  const handleDeleteFilter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Filter deleted');
      fetchSavedFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast.error('Failed to delete filter');
    }
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    toast.info('Filters reset to default');
  };

  const activeFilterCount = [
    filters.cameras.length > 0,
    filters.projects.length > 0,
    filters.alertTypes.length > 0,
    filters.severities.length > 0,
    filters.deliveryStatuses.length > 0,
    !filters.showResolved
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Load Saved Filters */}
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Load
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Load Saved Filter</DialogTitle>
                  <DialogDescription>Select a previously saved filter configuration</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[300px]">
                  {savedFilters.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No saved filters</p>
                  ) : (
                    <div className="space-y-2">
                      {savedFilters.map(sf => (
                        <div
                          key={sf.id}
                          className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent"
                          onClick={() => handleLoadFilter(sf)}
                        >
                          <div>
                            <p className="font-medium">{sf.name}</p>
                            {sf.description && (
                              <p className="text-sm text-muted-foreground">{sf.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteFilter(sf.id, e)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Save Current Filters */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Filter</DialogTitle>
                  <DialogDescription>Save current filter configuration for future use</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label>Filter Name</Label>
                  <Input
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="My Custom Filter"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveFilter}>Save Filter</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date Range - Always Visible */}
        <div className="flex flex-wrap gap-2">
          <Label className="w-full text-sm font-medium mb-1">Date Range</Label>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.slice(0, 5).map(preset => (
              <Button
                key={preset.value}
                variant={filters.dateRange.preset === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyDatePreset(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                  onSelect={(range: DateRange | undefined) => {
                    setFilters(prev => ({
                      ...prev,
                      dateRange: { from: range?.from, to: range?.to, preset: 'custom' }
                    }));
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          {filters.dateRange.from && filters.dateRange.to && (
            <p className="text-sm text-muted-foreground w-full">
              {format(filters.dateRange.from, 'MMM dd, yyyy')} - {format(filters.dateRange.to, 'MMM dd, yyyy')}
            </p>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Projects Filter */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1 mb-2">
                  <MapPin className="h-4 w-4" />
                  Projects
                </Label>
                <Select
                  value={filters.projects.join(',')}
                  onValueChange={(v) => setFilters(prev => ({
                    ...prev,
                    projects: v ? v.split(',') : []
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cameras Filter */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Camera className="h-4 w-4" />
                  Cameras
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {filters.cameras.length > 0 
                        ? `${filters.cameras.length} selected`
                        : 'All cameras'
                      }
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px]">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {cameras.map(camera => (
                          <div key={camera.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={camera.id}
                              checked={filters.cameras.includes(camera.id)}
                              onCheckedChange={(checked) => {
                                setFilters(prev => ({
                                  ...prev,
                                  cameras: checked
                                    ? [...prev.cameras, camera.id]
                                    : prev.cameras.filter(c => c !== camera.id)
                                }));
                              }}
                            />
                            <Label htmlFor={camera.id} className="text-sm cursor-pointer">
                              {camera.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Alert Types Filter */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Bell className="h-4 w-4" />
                  Alert Types
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {filters.alertTypes.length > 0 
                        ? `${filters.alertTypes.length} selected`
                        : 'All types'
                      }
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px]">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {ALERT_TYPES.map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={type}
                              checked={filters.alertTypes.includes(type)}
                              onCheckedChange={(checked) => {
                                setFilters(prev => ({
                                  ...prev,
                                  alertTypes: checked
                                    ? [...prev.alertTypes, type]
                                    : prev.alertTypes.filter(t => t !== type)
                                }));
                              }}
                            />
                            <Label htmlFor={type} className="text-sm cursor-pointer">
                              {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Severity Filter */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Severity</Label>
                <div className="flex flex-wrap gap-2">
                  {SEVERITIES.map(sev => (
                    <Badge
                      key={sev}
                      variant={filters.severities.includes(sev) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          severities: prev.severities.includes(sev)
                            ? prev.severities.filter(s => s !== sev)
                            : [...prev.severities, sev]
                        }));
                      }}
                    >
                      {sev}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Delivery Status Filter */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Truck className="h-4 w-4" />
                  Delivery Status
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_STATUSES.slice(0, 4).map(status => (
                    <Badge
                      key={status}
                      variant={filters.deliveryStatuses.includes(status) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          deliveryStatuses: prev.deliveryStatuses.includes(status)
                            ? prev.deliveryStatuses.filter(s => s !== status)
                            : [...prev.deliveryStatuses, status]
                        }));
                      }}
                    >
                      {status.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Show Resolved Toggle */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="showResolved"
                  checked={filters.showResolved}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({ ...prev, showResolved: !!checked }));
                  }}
                />
                <Label htmlFor="showResolved" className="cursor-pointer">
                  Include resolved alerts
                </Label>
              </div>
            </div>
          </>
        )}

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.cameras.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Camera className="h-3 w-3" />
                {filters.cameras.length} cameras
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, cameras: [] }))}
                />
              </Badge>
            )}
            {filters.projects.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {filters.projects.length} projects
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, projects: [] }))}
                />
              </Badge>
            )}
            {filters.alertTypes.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Bell className="h-3 w-3" />
                {filters.alertTypes.length} alert types
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, alertTypes: [] }))}
                />
              </Badge>
            )}
            {filters.severities.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                {filters.severities.length} severities
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, severities: [] }))}
                />
              </Badge>
            )}
            {filters.deliveryStatuses.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Truck className="h-3 w-3" />
                {filters.deliveryStatuses.length} statuses
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setFilters(prev => ({ ...prev, deliveryStatuses: [] }))}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsFilters;














