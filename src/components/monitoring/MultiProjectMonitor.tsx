import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Search, 
  Filter, 
  Eye, 
  EyeOff,
  Grid3X3,
  List,
  MapPin,
  Calendar,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  RefreshCw,
  Plus,
  Maximize2,
  Minimize2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  location: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  builder_id: string;
  created_at: string;
  updated_at: string;
  // Monitoring specific fields
  cameras_count: number;
  active_cameras: number;
  drones_assigned: number;
  deliveries_pending: number;
  last_activity: string;
  alerts_count: number;
  team_size: number;
}

interface ProjectMonitoringData {
  project: Project;
  cameras: CameraStatus[];
  drones: DroneStatus[];
  deliveries: DeliveryStatus[];
  alerts: ProjectAlert[];
  activities: RecentActivity[];
}

interface CameraStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'recording' | 'maintenance';
  location: string;
  uptime: number;
  viewers: number;
}

interface DroneStatus {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'maintenance' | 'offline';
  battery: number;
  altitude: number;
  signal: number;
}

interface DeliveryStatus {
  id: string;
  vehicle: string;
  status: 'loading' | 'in_transit' | 'delivering' | 'completed';
  eta: string;
  progress: number;
}

interface ProjectAlert {
  id: string;
  type: 'security' | 'safety' | 'delivery' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface RecentActivity {
  id: string;
  type: 'camera' | 'drone' | 'delivery' | 'alert';
  description: string;
  timestamp: string;
  user?: string;
}

interface MultiProjectMonitorProps {
  userRole?: string;
  userId?: string;
}

export const MultiProjectMonitor: React.FC<MultiProjectMonitorProps> = ({ 
  userRole, 
  userId 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [monitoringData, setMonitoringData] = useState<Map<string, ProjectMonitoringData>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Check permissions
  const isAdmin = userRole === 'admin';
  const canViewAllProjects = isAdmin;

  useEffect(() => {
    loadProjects();
    
    if (autoRefresh) {
      const interval = setInterval(loadMonitoringData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, userId]);

  useEffect(() => {
    if (selectedProjects.length > 0) {
      loadMonitoringData();
    }
  }, [selectedProjects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      
      // In production, this would fetch from the database
      // For now, using mock data with proper filtering
      const mockProjects: Project[] = [
        {
          id: 'proj-001',
          name: 'Westlands Commercial Complex',
          location: 'Westlands, Nairobi',
          description: 'Modern office complex with retail spaces',
          status: 'active',
          progress: 65,
          budget: 50000000,
          spent: 32500000,
          start_date: '2024-01-15',
          end_date: '2024-12-15',
          builder_id: userId || 'builder-001',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: new Date().toISOString(),
          cameras_count: 8,
          active_cameras: 7,
          drones_assigned: 2,
          deliveries_pending: 3,
          last_activity: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          alerts_count: 1,
          team_size: 25
        },
        {
          id: 'proj-002',
          name: 'Kilimani Residential Project',
          location: 'Kilimani, Nairobi',
          description: 'Luxury apartment complex',
          status: 'active',
          progress: 45,
          budget: 75000000,
          spent: 33750000,
          start_date: '2024-02-01',
          end_date: '2025-01-31',
          builder_id: userId || 'builder-001',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: new Date().toISOString(),
          cameras_count: 12,
          active_cameras: 11,
          drones_assigned: 3,
          deliveries_pending: 5,
          last_activity: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
          alerts_count: 0,
          team_size: 35
        },
        {
          id: 'proj-003',
          name: 'Karen Shopping Mall',
          location: 'Karen, Nairobi',
          description: 'Regional shopping center',
          status: 'on_hold',
          progress: 30,
          budget: 120000000,
          spent: 36000000,
          start_date: '2024-03-01',
          end_date: '2025-06-30',
          builder_id: userId || 'builder-001',
          created_at: '2024-03-01T00:00:00Z',
          updated_at: new Date().toISOString(),
          cameras_count: 6,
          active_cameras: 0,
          drones_assigned: 1,
          deliveries_pending: 0,
          last_activity: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          alerts_count: 3,
          team_size: 15
        },
        {
          id: 'proj-004',
          name: 'Riverside Office Tower',
          location: 'Riverside, Nairobi',
          description: '20-story office building',
          status: 'planning',
          progress: 5,
          budget: 200000000,
          spent: 10000000,
          start_date: '2024-06-01',
          end_date: '2026-05-31',
          builder_id: userId || 'builder-001',
          created_at: '2024-05-01T00:00:00Z',
          updated_at: new Date().toISOString(),
          cameras_count: 0,
          active_cameras: 0,
          drones_assigned: 0,
          deliveries_pending: 1,
          last_activity: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          alerts_count: 0,
          team_size: 5
        }
      ];

      // Filter projects based on user role
      let filteredProjects = mockProjects;
      if (!canViewAllProjects && userId) {
        filteredProjects = mockProjects.filter(p => p.builder_id === userId);
      }

      setProjects(filteredProjects);
      
      // Auto-select active projects
      const activeProjects = filteredProjects
        .filter(p => p.status === 'active')
        .map(p => p.id);
      setSelectedProjects(activeProjects);

    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoringData = async () => {
    try {
      const newMonitoringData = new Map<string, ProjectMonitoringData>();
      
      for (const projectId of selectedProjects) {
        const project = projects.find(p => p.id === projectId);
        if (!project) continue;

        // Mock monitoring data for each project
        const mockData: ProjectMonitoringData = {
          project,
          cameras: generateMockCameras(project.cameras_count, project.active_cameras),
          drones: generateMockDrones(project.drones_assigned),
          deliveries: generateMockDeliveries(project.deliveries_pending),
          alerts: generateMockAlerts(project.alerts_count),
          activities: generateMockActivities()
        };

        newMonitoringData.set(projectId, mockData);
      }
      
      setMonitoringData(newMonitoringData);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    }
  };

  // Helper functions to generate mock data
  const generateMockCameras = (total: number, active: number): CameraStatus[] => {
    const cameras: CameraStatus[] = [];
    for (let i = 0; i < total; i++) {
      cameras.push({
        id: `cam-${i + 1}`,
        name: `Camera ${i + 1}`,
        status: i < active ? 'online' : 'offline',
        location: `Zone ${String.fromCharCode(65 + i)}`,
        uptime: i < active ? 95 + Math.random() * 5 : 0,
        viewers: i < active ? Math.floor(Math.random() * 5) : 0
      });
    }
    return cameras;
  };

  const generateMockDrones = (count: number): DroneStatus[] => {
    const drones: DroneStatus[] = [];
    for (let i = 0; i < count; i++) {
      drones.push({
        id: `drone-${i + 1}`,
        name: `Sky Guardian ${i + 1}`,
        status: Math.random() > 0.3 ? 'active' : 'standby',
        battery: 60 + Math.random() * 40,
        altitude: Math.random() > 0.5 ? Math.floor(Math.random() * 150) : 0,
        signal: 80 + Math.random() * 20
      });
    }
    return drones;
  };

  const generateMockDeliveries = (count: number): DeliveryStatus[] => {
    const deliveries: DeliveryStatus[] = [];
    const statuses: DeliveryStatus['status'][] = ['loading', 'in_transit', 'delivering'];
    
    for (let i = 0; i < count; i++) {
      deliveries.push({
        id: `del-${i + 1}`,
        vehicle: `Vehicle ${i + 1}`,
        status: statuses[i % statuses.length],
        eta: format(new Date(Date.now() + (i + 1) * 3600000), 'HH:mm'),
        progress: Math.floor(Math.random() * 100)
      });
    }
    return deliveries;
  };

  const generateMockAlerts = (count: number): ProjectAlert[] => {
    const alerts: ProjectAlert[] = [];
    const types: ProjectAlert['type'][] = ['security', 'safety', 'delivery', 'system'];
    const severities: ProjectAlert['severity'][] = ['low', 'medium', 'high', 'critical'];
    
    for (let i = 0; i < count; i++) {
      alerts.push({
        id: `alert-${i + 1}`,
        type: types[i % types.length],
        severity: severities[i % severities.length],
        message: `Alert ${i + 1}: Sample monitoring alert`,
        timestamp: new Date(Date.now() - i * 600000).toISOString(),
        acknowledged: Math.random() > 0.5
      });
    }
    return alerts;
  };

  const generateMockActivities = (): RecentActivity[] => {
    return [
      {
        id: 'act-1',
        type: 'camera',
        description: 'Camera 3 came online',
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 'act-2',
        type: 'delivery',
        description: 'Material delivery completed',
        timestamp: new Date(Date.now() - 600000).toISOString()
      }
    ];
  };

  // Filter projects based on search and status
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAllProjects = () => {
    setSelectedProjects(filteredProjects.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedProjects([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Multi-Project Monitoring
          </h2>
          <p className="text-muted-foreground">
            Monitor multiple construction projects simultaneously
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4 mr-2" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-2" />
            )}
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Selection</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllProjects}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <CardDescription>
            Select projects to monitor. {selectedProjects.length} of {filteredProjects.length} projects selected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Grid/List */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {filteredProjects.map((project) => {
              const isSelected = selectedProjects.includes(project.id);
              const data = monitoringData.get(project.id);
              
              return (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleProjectSelection(project.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{project.name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <Eye className="h-4 w-4 text-primary" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {isSelected && data && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>{data.cameras.filter(c => c.status === 'online').length}/{data.cameras.length} Cameras</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{project.team_size} Team</span>
                          </div>
                          {data.alerts.length > 0 && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{data.alerts.length} Alerts</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(project.last_activity), 'HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Dashboard */}
      {selectedProjects.length > 0 && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cameras">Cameras</TabsTrigger>
            <TabsTrigger value="drones">Drones</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Overview content will be implemented */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from(monitoringData.entries()).map(([projectId, data]) => (
                <Card key={projectId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{data.project.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span>{data.cameras.filter(c => c.status === 'online').length} Cameras</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                        <span>{data.drones.filter(d => d.status === 'active').length} Drones</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>{data.deliveries.length} Deliveries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span>{data.alerts.length} Alerts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Other tabs content would be implemented similarly */}
          <TabsContent value="cameras">
            <Card>
              <CardHeader>
                <CardTitle>Camera Status Across Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Camera monitoring interface for selected projects...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drones">
            <Card>
              <CardHeader>
                <CardTitle>Drone Fleet Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Drone monitoring interface for selected projects...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle>Active Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Delivery tracking interface for selected projects...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Project Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(monitoringData.entries()).map(([projectId, data]) => 
                    data.alerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-muted-foreground">{data.project.name}</p>
                          </div>
                        </div>
                        <Badge className={getAlertSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedProjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Projects Selected</h3>
            <p className="text-muted-foreground mb-4">
              Select one or more projects above to start monitoring their status, cameras, drones, and deliveries.
            </p>
            <Button onClick={selectAllProjects}>
              <Plus className="h-4 w-4 mr-2" />
              Select All Active Projects
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiProjectMonitor;



















