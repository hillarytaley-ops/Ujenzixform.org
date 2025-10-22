import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Plus,
  Edit,
  Eye,
  Trash2,
  FileText,
  Camera,
  Package,
  Truck,
  RefreshCw,
  Download,
  Send,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  location: z.string().min(5, "Location must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.string().min(1, "Budget is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  project_type: z.string().min(1, "Project type is required"),
  priority: z.enum(["low", "medium", "high", "urgent"])
});

type ProjectFormData = z.infer<typeof projectSchema>;

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
  project_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  team_size: number;
  materials_ordered: number;
  pending_deliveries: number;
  created_at: string;
  updated_at: string;
}

interface ProjectActivity {
  id: string;
  project_id: string;
  activity_type: 'milestone' | 'material_order' | 'delivery' | 'payment' | 'issue' | 'update';
  title: string;
  description: string;
  timestamp: string;
  user_name: string;
  status?: string;
}

const projectTypes = [
  "Residential Building",
  "Commercial Building", 
  "Industrial Facility",
  "Infrastructure",
  "Renovation",
  "Road Construction",
  "Bridge Construction",
  "Water Project"
];

export const BuilderProjectManager: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectActivities, setProjectActivities] = useState<ProjectActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema)
  });

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual Supabase queries
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Westlands Commercial Complex',
          location: 'Westlands, Nairobi',
          description: 'Modern commercial complex with retail and office spaces',
          status: 'active',
          progress: 65,
          budget: 2500000,
          spent: 1625000,
          start_date: '2024-08-01T00:00:00Z',
          end_date: '2024-12-15T00:00:00Z',
          project_type: 'Commercial Building',
          priority: 'high',
          team_size: 12,
          materials_ordered: 15,
          pending_deliveries: 3,
          created_at: '2024-08-01T00:00:00Z',
          updated_at: '2024-10-08T00:00:00Z'
        },
        {
          id: '2',
          name: 'Karen Residential Villas',
          location: 'Karen, Nairobi',
          description: 'Luxury residential villas with modern amenities',
          status: 'active',
          progress: 35,
          budget: 1800000,
          spent: 630000,
          start_date: '2024-09-15T00:00:00Z',
          end_date: '2025-02-28T00:00:00Z',
          project_type: 'Residential Building',
          priority: 'medium',
          team_size: 8,
          materials_ordered: 8,
          pending_deliveries: 2,
          created_at: '2024-09-15T00:00:00Z',
          updated_at: '2024-10-07T00:00:00Z'
        },
        {
          id: '3',
          name: 'Industrial Warehouse',
          location: 'Industrial Area, Nairobi',
          description: 'Large-scale industrial warehouse facility',
          status: 'planning',
          progress: 10,
          budget: 4200000,
          spent: 420000,
          start_date: '2024-11-01T00:00:00Z',
          end_date: '2025-06-30T00:00:00Z',
          project_type: 'Industrial Facility',
          priority: 'low',
          team_size: 0,
          materials_ordered: 2,
          pending_deliveries: 1,
          created_at: '2024-10-01T00:00:00Z',
          updated_at: '2024-10-05T00:00:00Z'
        }
      ];

      const mockActivities: ProjectActivity[] = [
        {
          id: 'act-1',
          project_id: '1',
          activity_type: 'milestone',
          title: 'Foundation Completed',
          description: 'Foundation work completed ahead of schedule',
          timestamp: '2024-10-08T10:00:00Z',
          user_name: 'Site Supervisor'
        },
        {
          id: 'act-2',
          project_id: '1',
          activity_type: 'material_order',
          title: 'Steel Bars Ordered',
          description: 'Ordered 50 pieces of 12mm steel bars',
          timestamp: '2024-10-07T14:30:00Z',
          user_name: 'Project Manager'
        },
        {
          id: 'act-3',
          project_id: '2',
          activity_type: 'delivery',
          title: 'Cement Delivered',
          description: '100 bags of cement delivered to site',
          timestamp: '2024-10-06T09:15:00Z',
          user_name: 'Delivery Team'
        }
      ];

      setProjects(mockProjects);
      setProjectActivities(mockActivities);
      
      if (mockProjects.length > 0) {
        setSelectedProject(mockProjects[0]);
      }

    } catch (error: unknown) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setCreating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const projectData = {
        ...data,
        budget: parseFloat(data.budget),
        builder_id: user.id,
        status: 'planning',
        progress: 0,
        spent: 0
      };

      // In production, this would create the project in the database
      console.log('Creating project:', projectData);

      toast({
        title: "Project Created",
        description: `Project "${data.name}" has been created successfully.`,
      });

      reset();
      setShowCreateForm(false);
      loadProjects();

    } catch (error: unknown) {
      console.error('Error creating project:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      // Update project status in database
      setProjects(projects.map(project => 
        project.id === projectId 
          ? { ...project, status: newStatus as any, updated_at: new Date().toISOString() }
          : project
      ));

      toast({
        title: "Status Updated",
        description: `Project status updated to ${newStatus}`,
      });

    } catch (error: unknown) {
      console.error('Error updating project status:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update project status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'material_order': return <Package className="h-4 w-4 text-blue-500" />;
      case 'delivery': return <Truck className="h-4 w-4 text-orange-500" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'issue': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'update': return <Edit className="h-4 w-4 text-gray-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-muted-foreground">Create and manage your construction projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadProjects}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Start a new construction project</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g., Westlands Commercial Complex"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="e.g., Westlands, Nairobi"
                  />
                  {errors.location && (
                    <p className="text-sm text-red-600">{errors.location.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_type">Project Type *</Label>
                  <Select onValueChange={(value) => register("project_type").onChange({ target: { value } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.project_type && (
                    <p className="text-sm text-red-600">{errors.project_type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (KES) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    {...register("budget")}
                    placeholder="e.g., 2500000"
                  />
                  {errors.budget && (
                    <p className="text-sm text-red-600">{errors.budget.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register("start_date")}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-red-600">{errors.start_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...register("end_date")}
                  />
                  {errors.end_date && (
                    <p className="text-sm text-red-600">{errors.end_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select onValueChange={(value) => register("priority").onChange({ target: { value } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.priority && (
                    <p className="text-sm text-red-600">{errors.priority.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Detailed description of the construction project"
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProject?.id === project.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{project.name}</span>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {project.location}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>{project.progress}% complete</span>
                      <Badge className={getPriorityColor(project.priority)} variant="outline">
                        {project.priority}
                      </Badge>
                    </div>
                    <Progress value={project.progress} className="mt-2 h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Details */}
        <div className="lg:col-span-2">
          {selectedProject ? (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{selectedProject.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(selectedProject.status)}>
                          {selectedProject.status}
                        </Badge>
                        <Badge className={getPriorityColor(selectedProject.priority)}>
                          {selectedProject.priority} priority
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {selectedProject.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Project Information</Label>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedProject.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedProject.project_type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedProject.team_size} team members</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Timeline & Budget</Label>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Start: {format(new Date(selectedProject.start_date), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>End: {format(new Date(selectedProject.end_date), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>Budget: KES {selectedProject.budget.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Project Progress</span>
                        <span className="text-sm">{selectedProject.progress}%</span>
                      </div>
                      <Progress value={selectedProject.progress} className="h-3" />
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Budget Utilization</span>
                        <span className="text-xl font-bold">
                          KES {selectedProject.spent.toLocaleString()} / {selectedProject.budget.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={(selectedProject.spent / selectedProject.budget) * 100} 
                        className="h-2 mt-2" 
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Project
                      </Button>
                      <Button variant="outline">
                        <Camera className="h-4 w-4 mr-2" />
                        Monitor Site
                      </Button>
                      <Button variant="outline">
                        <Package className="h-4 w-4 mr-2" />
                        Order Materials
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="materials" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Material Orders</CardTitle>
                    <CardDescription>Materials ordered for this project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orders
                        .filter(order => order.project_id === selectedProject.id)
                        .map((order) => (
                          <div key={order.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-medium">{order.material_type}</h3>
                                <p className="text-sm text-muted-foreground">{order.supplier_name}</p>
                              </div>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Quantity:</span>
                                <div className="font-medium">{order.quantity} units</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Unit Price:</span>
                                <div className="font-medium">KES {order.unit_price.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total:</span>
                                <div className="font-medium">KES {order.total_amount.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Delivery:</span>
                                <div className="font-medium">{format(new Date(order.delivery_date), 'MMM dd')}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Timeline</CardTitle>
                    <CardDescription>Recent activities and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {projectActivities
                        .filter(activity => activity.project_id === selectedProject.id)
                        .map((activity, index) => (
                          <div key={activity.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                                index === 0 ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-muted-foreground'
                              }`}>
                                {getActivityIcon(activity.activity_type)}
                              </div>
                              {index < projectActivities.filter(a => a.project_id === selectedProject.id).length - 1 && (
                                <div className="w-0.5 h-8 bg-muted mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{activity.title}</span>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                              <span className="text-xs text-muted-foreground">by {activity.user_name}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="monitoring" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Site Monitoring</CardTitle>
                    <CardDescription>Monitor construction site activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button className="h-20 flex-col">
                        <Camera className="h-8 w-8 mb-2" />
                        View Live Cameras
                      </Button>
                      <Button variant="outline" className="h-20 flex-col">
                        <Truck className="h-8 w-8 mb-2" />
                        Track Deliveries
                      </Button>
                    </div>
                    
                    <Alert className="mt-4">
                      <Eye className="h-4 w-4" />
                      <AlertTitle>Monitoring Access</AlertTitle>
                      <AlertDescription>
                        You have view-only access to camera feeds from your construction sites. 
                        Camera controls are managed by UjenziPro administrators.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Project</h3>
                  <p className="text-muted-foreground">Choose a project from the list to view details and manage workflow</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

