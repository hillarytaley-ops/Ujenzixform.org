import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, MapPin, Calendar, DollarSign, Users, Building2,
  TrendingUp, Eye, Edit, Trash2, MoreVertical, Clock,
  CheckCircle, AlertTriangle, Loader2, Target, FileText, ShoppingCart
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  location: string;
  progress: number;
  budget: number;
  spent: number;
  status: 'planning' | 'on_track' | 'ahead' | 'delayed' | 'completed' | 'on_hold';
  start_date: string;
  end_date?: string;
  team_members: number;
  description?: string;
  client_name?: string;
  project_type?: string;
}

interface ProjectsTabProps {
  userId?: string;
  isDarkMode?: boolean;
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ 
  userId, 
  isDarkMode = false 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    budget: '',
    description: '',
    client_name: '',
    project_type: 'residential',
    start_date: '',
    end_date: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    // For now, use mock data
    // In production, this would fetch from Supabase
    setProjects(mockProjects);
    setLoading(false);
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.location || !newProject.budget) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in project name, location, and budget."
      });
      return;
    }

    setCreating(true);

    try {
      // Create new project object
      const project: Project = {
        id: `PRJ-${Date.now()}`,
        name: newProject.name,
        location: newProject.location,
        progress: 0,
        budget: parseFloat(newProject.budget),
        spent: 0,
        status: 'planning',
        start_date: newProject.start_date || new Date().toISOString().split('T')[0],
        end_date: newProject.end_date || undefined,
        team_members: 0,
        description: newProject.description,
        client_name: newProject.client_name,
        project_type: newProject.project_type
      };

      // Add to local state
      setProjects(prev => [project, ...prev]);

      toast({
        title: "🏗️ Project Created!",
        description: `${newProject.name} has been added to your projects.`,
      });

      // Reset form
      setNewProject({
        name: '',
        location: '',
        budget: '',
        description: '',
        client_name: '',
        project_type: 'residential',
        start_date: '',
        end_date: ''
      });
      setShowCreateDialog(false);

    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create project. Please try again."
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'bg-green-600 text-white';
      case 'on_track': return 'bg-blue-600 text-white';
      case 'planning': return 'bg-purple-600 text-white';
      case 'delayed': return 'bg-amber-600 text-white';
      case 'on_hold': return 'bg-gray-600 text-white';
      case 'completed': return 'bg-emerald-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead': return <TrendingUp className="h-3 w-3" />;
      case 'on_track': return <CheckCircle className="h-3 w-3" />;
      case 'planning': return <Target className="h-3 w-3" />;
      case 'delayed': return <AlertTriangle className="h-3 w-3" />;
      case 'on_hold': return <Clock className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'bg-green-600';
      case 'on_track': return 'bg-blue-600';
      case 'delayed': return 'bg-amber-600';
      case 'completed': return 'bg-emerald-600';
      default: return 'bg-blue-600';
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`;
    }
    return `KES ${(amount / 1000).toFixed(0)}K`;
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const headerClass = isDarkMode ? 'text-white' : 'text-gray-900';

  if (loading) {
    return (
      <Card className={cardClass}>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
          <p className={textClass}>Loading projects...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className={`text-xl ${headerClass}`}>My Projects</CardTitle>
              <CardDescription className={textClass}>
                Manage your construction projects and track progress
              </CardDescription>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Project Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-blue-700'}`}>Active</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-blue-800'}`}>
                {projects.filter(p => ['on_track', 'ahead', 'delayed'].includes(p.status)).length}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-green-700'}`}>Completed</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-green-800'}`}>
                {projects.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-purple-700'}`}>Planning</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-purple-800'}`}>
                {projects.filter(p => p.status === 'planning').length}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-emerald-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-emerald-700'}`}>Total Budget</p>
              <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-emerald-800'}`}>
                {formatCurrency(projects.reduce((sum, p) => sum + p.budget, 0))}
              </p>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className={`border-2 hover:shadow-lg transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 hover:border-blue-500' 
                    : 'hover:border-blue-300'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className={`font-bold text-lg ${headerClass}`}>{project.name}</h3>
                      <p className={`text-sm flex items-center gap-1 ${textClass}`}>
                        <MapPin className="h-3 w-3" /> {project.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(project.status)} flex items-center gap-1`}>
                        {getStatusIcon(project.status)}
                        {formatStatus(project.status)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={textClass}>Progress</span>
                        <span className={`font-semibold ${headerClass}`}>{project.progress}%</span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-2.5 rounded-full transition-all ${getProgressColor(project.status)}`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${textClass}`}>Budget</p>
                      <p className={`font-semibold text-sm ${headerClass}`}>{formatCurrency(project.budget)}</p>
                    </div>
                    <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${textClass}`}>Spent</p>
                      <p className={`font-semibold text-sm ${headerClass}`}>{formatCurrency(project.spent)}</p>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className={`flex items-center justify-between pt-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className={`flex items-center gap-1 text-sm ${textClass}`}>
                      <Users className="h-4 w-4" />
                      {project.team_members} members
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${textClass}`}>
                      <Calendar className="h-4 w-4" />
                      {project.start_date}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add New Project Card */}
            <Card 
              className={`border-2 border-dashed cursor-pointer transition-colors ${
                isDarkMode 
                  ? 'border-gray-600 hover:border-blue-500 bg-gray-800/50' 
                  : 'border-gray-300 hover:border-blue-400 bg-gray-50/50'
              }`}
              onClick={() => setShowCreateDialog(true)}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center min-h-[280px]">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'
                }`}>
                  <Plus className={`h-8 w-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h3 className={`font-semibold text-lg mb-1 ${headerClass}`}>Start New Project</h3>
                <p className={`text-sm text-center ${textClass}`}>
                  Create a new construction project
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className={`max-w-2xl ${isDarkMode ? 'bg-gray-800 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Create New Project
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-400' : ''}>
              Fill in the details to create a new construction project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Kilimani Apartment Complex"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Nairobi, Kenya"
                  value={newProject.location}
                  onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (KES) *</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="e.g., 45000000"
                  value={newProject.budget}
                  onChange={(e) => setNewProject(prev => ({ ...prev, budget: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_type">Project Type</Label>
                <Select 
                  value={newProject.project_type} 
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, project_type: value }))}
                >
                  <SelectTrigger className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  placeholder="e.g., ABC Development Ltd"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, client_name: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newProject.start_date}
                  onChange={(e) => setNewProject(prev => ({ ...prev, start_date: e.target.value }))}
                  className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project..."
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                className={isDarkMode ? 'bg-gray-700 border-gray-600' : ''}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleCreateProject}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Mock data
const mockProjects: Project[] = [
  { 
    id: 'PRJ-001', 
    name: 'Kilimani Apartment Complex', 
    location: 'Nairobi', 
    progress: 65, 
    budget: 45000000, 
    spent: 29250000,
    status: 'on_track',
    start_date: '2024-01-01',
    team_members: 12,
    project_type: 'residential'
  },
  { 
    id: 'PRJ-002', 
    name: 'Karen Villa Development', 
    location: 'Nairobi', 
    progress: 30, 
    budget: 12000000, 
    spent: 3600000,
    status: 'on_track',
    start_date: '2024-02-15',
    team_members: 8,
    project_type: 'residential'
  },
  { 
    id: 'PRJ-003', 
    name: 'Mombasa Office Block', 
    location: 'Mombasa', 
    progress: 85, 
    budget: 28000000, 
    spent: 23800000,
    status: 'ahead',
    start_date: '2023-09-01',
    team_members: 15,
    project_type: 'commercial'
  },
  { 
    id: 'PRJ-004', 
    name: 'Nakuru Shopping Mall', 
    location: 'Nakuru', 
    progress: 15, 
    budget: 65000000, 
    spent: 9750000,
    status: 'delayed',
    start_date: '2024-03-01',
    team_members: 20,
    project_type: 'commercial'
  },
  { 
    id: 'PRJ-005', 
    name: 'Kisumu Warehouse', 
    location: 'Kisumu', 
    progress: 100, 
    budget: 18000000, 
    spent: 17500000,
    status: 'completed',
    start_date: '2023-06-01',
    end_date: '2024-01-15',
    team_members: 10,
    project_type: 'industrial'
  },
];

export default ProjectsTab;




