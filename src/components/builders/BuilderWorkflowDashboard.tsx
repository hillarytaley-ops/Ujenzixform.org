import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Building2, 
  Calculator, 
  FileText, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Users,
  Star,
  ArrowRight,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Send,
  Plus,
  Search,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalSpent: number;
  avgProjectDuration: number;
  onTimeCompletion: number;
  materialOrders: number;
  pendingDeliveries: number;
}

interface Project {
  id: string;
  name: string;
  location: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  estimated_completion: string;
  materials_ordered: number;
  pending_deliveries: number;
  team_size: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface MaterialOrder {
  id: string;
  project_id: string;
  project_name: string;
  supplier_name: string;
  material_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed';
  order_date: string;
  delivery_date: string;
  tracking_number?: string;
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'blocked';
  icon: React.ReactNode;
  estimatedTime?: string;
  actualTime?: string;
  dependencies?: string[];
}

export const BuilderWorkflowDashboard: React.FC = () => {
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    avgProjectDuration: 0,
    onTimeCompletion: 0,
    materialOrders: 0,
    pendingDeliveries: 0
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load builder stats and projects
      // This would be replaced with actual database queries
      const mockStats: ProjectStats = {
        totalProjects: 12,
        activeProjects: 4,
        completedProjects: 8,
        totalSpent: 3450000,
        avgProjectDuration: 45,
        onTimeCompletion: 87,
        materialOrders: 34,
        pendingDeliveries: 6
      };

      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'Westlands Commercial Complex',
          location: 'Westlands, Nairobi',
          status: 'active',
          progress: 65,
          budget: 2500000,
          spent: 1625000,
          start_date: '2024-08-01T00:00:00Z',
          end_date: '2024-12-15T00:00:00Z',
          estimated_completion: '2024-12-10T00:00:00Z',
          materials_ordered: 15,
          pending_deliveries: 3,
          team_size: 12,
          priority: 'high'
        },
        {
          id: '2',
          name: 'Karen Residential Villas',
          location: 'Karen, Nairobi',
          status: 'active',
          progress: 35,
          budget: 1800000,
          spent: 630000,
          start_date: '2024-09-15T00:00:00Z',
          end_date: '2025-02-28T00:00:00Z',
          estimated_completion: '2025-03-05T00:00:00Z',
          materials_ordered: 8,
          pending_deliveries: 2,
          team_size: 8,
          priority: 'medium'
        },
        {
          id: '3',
          name: 'Industrial Warehouse',
          location: 'Industrial Area, Nairobi',
          status: 'planning',
          progress: 10,
          budget: 4200000,
          spent: 420000,
          start_date: '2024-11-01T00:00:00Z',
          end_date: '2025-06-30T00:00:00Z',
          estimated_completion: '2025-07-15T00:00:00Z',
          materials_ordered: 2,
          pending_deliveries: 1,
          team_size: 0,
          priority: 'low'
        }
      ];

      const mockOrders: MaterialOrder[] = [
        {
          id: 'order-1',
          project_id: '1',
          project_name: 'Westlands Commercial Complex',
          supplier_name: 'Nairobi Building Supplies',
          material_type: 'Cement',
          quantity: 100,
          unit_price: 850,
          total_amount: 85000,
          status: 'shipped',
          order_date: '2024-10-05T00:00:00Z',
          delivery_date: '2024-10-08T00:00:00Z',
          tracking_number: 'TRK-001'
        },
        {
          id: 'order-2',
          project_id: '1',
          project_name: 'Westlands Commercial Complex',
          supplier_name: 'Steel Masters Ltd',
          material_type: 'Steel Bars',
          quantity: 50,
          unit_price: 1200,
          total_amount: 60000,
          status: 'processing',
          order_date: '2024-10-06T00:00:00Z',
          delivery_date: '2024-10-10T00:00:00Z'
        },
        {
          id: 'order-3',
          project_id: '2',
          project_name: 'Karen Residential Villas',
          supplier_name: 'Roofing Solutions',
          material_type: 'Roofing Sheets',
          quantity: 200,
          unit_price: 2500,
          total_amount: 500000,
          status: 'pending',
          order_date: '2024-10-07T00:00:00Z',
          delivery_date: '2024-10-12T00:00:00Z'
        }
      ];

      setStats(mockStats);
      setProjects(mockProjects);
      setOrders(mockOrders);
      
      if (mockProjects.length > 0) {
        setSelectedProject(mockProjects[0]);
      }

    } catch (error: unknown) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'shipped': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
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

  const getProjectWorkflowSteps = (project: Project): WorkflowStep[] => {
    const steps: WorkflowStep[] = [
      {
        id: 'planning',
        title: 'Project Planning',
        description: 'Initial planning and design phase',
        status: 'completed',
        icon: <Calculator className="h-4 w-4" />,
        actualTime: '2 weeks'
      },
      {
        id: 'approvals',
        title: 'Permits & Approvals',
        description: 'Obtain necessary permits and approvals',
        status: project.status === 'planning' ? 'current' : 'completed',
        icon: <CheckCircle className="h-4 w-4" />,
        estimatedTime: '3-4 weeks'
      },
      {
        id: 'sourcing',
        title: 'Material Sourcing',
        description: 'Source materials and get quotations',
        status: ['active', 'completed'].includes(project.status) ? 'completed' : 
               project.status === 'planning' ? 'current' : 'pending',
        icon: <Search className="h-4 w-4" />,
        estimatedTime: '1-2 weeks'
      },
      {
        id: 'procurement',
        title: 'Procurement',
        description: 'Purchase orders and material procurement',
        status: ['active', 'completed'].includes(project.status) ? 'completed' : 'pending',
        icon: <Package className="h-4 w-4" />,
        estimatedTime: '1 week'
      },
      {
        id: 'construction',
        title: 'Construction',
        description: 'Active construction phase',
        status: project.status === 'active' ? 'current' : 
               project.status === 'completed' ? 'completed' : 'pending',
        icon: <Building2 className="h-4 w-4" />,
        estimatedTime: `${Math.round((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks`
      },
      {
        id: 'completion',
        title: 'Project Completion',
        description: 'Final inspections and handover',
        status: project.status === 'completed' ? 'completed' : 'pending',
        icon: <CheckCircle className="h-4 w-4" />,
        estimatedTime: '1 week'
      }
    ];

    return steps;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading builder dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Builder Workflow Dashboard</h1>
          <p className="text-muted-foreground">Manage projects, track progress, and coordinate construction activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProjects} total projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {stats.totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTimeCompletion}%</div>
            <p className="text-xs text-muted-foreground">
              Project completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Plus className="h-6 w-6 mb-2" />
                  New Project
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Package className="h-6 w-6 mb-2" />
                  Order Materials
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  Create PO
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Eye className="h-6 w-6 mb-2" />
                  Monitor Sites
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>Projects currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.filter(p => p.status === 'active').map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-sm text-muted-foreground">{project.location}</span>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <Badge className={getPriorityColor(project.priority)}>
                        {project.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{project.progress}% Complete</div>
                        <div className="text-sm text-muted-foreground">
                          KES {project.spent.toLocaleString()} / {project.budget.toLocaleString()}
                        </div>
                      </div>
                      <Progress value={project.progress} className="w-20" />
                      <Button size="sm" onClick={() => setSelectedProject(project)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Material Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Material Orders</CardTitle>
              <CardDescription>Latest material orders and deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-medium">{order.material_type}</span>
                        <p className="text-sm text-muted-foreground">{order.supplier_name}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">KES {order.total_amount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(order.delivery_date), 'MMM dd')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Management</CardTitle>
              <CardDescription>View and manage all construction projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">{project.location}</p>
                        </div>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                        <Badge className={getPriorityColor(project.priority)}>
                          {project.priority} priority
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Monitor
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Progress:</span>
                        <div className="font-medium">{project.progress}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget:</span>
                        <div className="font-medium">KES {project.budget.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Spent:</span>
                        <div className="font-medium">KES {project.spent.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Team Size:</span>
                        <div className="font-medium">{project.team_size} workers</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Progress value={project.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Started: {format(new Date(project.start_date), 'MMM dd')}</span>
                        <span>Due: {format(new Date(project.end_date), 'MMM dd')}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Badge variant="outline">{project.materials_ordered} materials ordered</Badge>
                        <Badge variant="outline">{project.pending_deliveries} pending deliveries</Badge>
                      </div>
                      <Button size="sm" onClick={() => setSelectedProject(project)}>
                        View Workflow
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Orders</CardTitle>
              <CardDescription>Track material orders and deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium">{order.material_type}</h3>
                          <p className="text-sm text-muted-foreground">{order.supplier_name}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">KES {order.total_amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.quantity} units @ KES {order.unit_price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Project:</span>
                        <div className="font-medium">{order.project_name}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Order Date:</span>
                        <div className="font-medium">{format(new Date(order.order_date), 'MMM dd, yyyy')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delivery Date:</span>
                        <div className="font-medium">{format(new Date(order.delivery_date), 'MMM dd, yyyy')}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tracking:</span>
                        <div className="font-medium">{order.tracking_number || 'Not available'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          {selectedProject ? (
            <Card>
              <CardHeader>
                <CardTitle>Project Workflow: {selectedProject.name}</CardTitle>
                <CardDescription>Track progress through the construction process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {getProjectWorkflowSteps(selectedProject).map((step, index) => (
                    <div key={step.id} className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        step.status === 'completed' ? 'bg-green-100 border-green-500 text-green-700' :
                        step.status === 'current' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                        step.status === 'blocked' ? 'bg-red-100 border-red-500 text-red-700' :
                        'bg-gray-100 border-gray-300 text-gray-500'
                      }`}>
                        {step.icon}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${
                            step.status === 'completed' ? 'text-green-700' :
                            step.status === 'current' ? 'text-blue-700' :
                            step.status === 'blocked' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {step.title}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {step.actualTime || step.estimatedTime}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.dependencies && step.dependencies.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Depends on: {step.dependencies.join(', ')}
                          </p>
                        )}
                      </div>
                      
                      {index < getProjectWorkflowSteps(selectedProject).length - 1 && (
                        <div className="absolute left-5 mt-10 w-0.5 h-6 bg-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex gap-2">
                  <Button>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Next Phase
                  </Button>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Project</h3>
                  <p className="text-muted-foreground">Choose a project from the Projects tab to view its workflow</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>On-time Completion</span>
                    <span>{stats.onTimeCompletion}%</span>
                  </div>
                  <Progress value={stats.onTimeCompletion} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Budget Adherence</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Quality Score</span>
                    <span>95%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Project Starts</span>
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +15%
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Material Costs</span>
                    <div className="flex items-center text-red-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +8%
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Delivery Time</span>
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      -12%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

