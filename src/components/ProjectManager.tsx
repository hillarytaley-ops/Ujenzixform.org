import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building, Calendar, MapPin, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface ProjectManagerProps {
  onProjectSelect?: (project: Project) => void;
  selectedProject?: Project | null;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ onProjectSelect, selectedProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    status: 'active'
  });
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      // The RLS policies will automatically filter projects based on user role and access
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Error",
          description: "Failed to fetch projects",
          variant: "destructive",
        });
      } else {
        setProjects(data?.map(p => ({
          ...p,
          owner_id: p.builder_id
        })) as Project[]);
        // Show message if no projects are available for this user
        if (data.length === 0) {
          toast({
            title: "No Projects",
            description: "You don't have access to any projects yet.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const createProject = async () => {
    if (!user) {
      toast({
        title: "Access Denied",
        description: "You must be logged in to create projects",
        variant: "destructive",
      });
      return;
    }

    try {
      const projectData = {
        name: newProject.name,
        description: newProject.description || null,
        location: newProject.location || null,
        start_date: newProject.start_date || null,
        end_date: newProject.end_date || null,
        status: newProject.status,
        owner_id: user.id
      };

      const { error } = await supabase
        .from('projects')
        .insert([projectData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Project created successfully",
      });

      setShowCreateDialog(false);
      setNewProject({
        name: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        status: 'active'
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      fetchProjects();
      if (selectedProject?.id === projectId) {
        onProjectSelect?.(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'on_hold':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="p-6">Loading projects...</div>;
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Management</CardTitle>
          <CardDescription>
            Please log in to manage construction projects
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-6 w-6" />
                Construction Projects
              </CardTitle>
              <CardDescription>
                Manage multiple construction projects and their deliveries
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                      placeholder="e.g., Office Building Construction"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newProject.location}
                      onChange={(e) => setNewProject({...newProject, location: e.target.value})}
                      placeholder="e.g., 123 Main St, City"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      placeholder="Project description and details"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={newProject.end_date}
                      onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={createProject} className="w-full">
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No projects available. 
                {user ? ' As a builder, you only see projects with deliveries assigned to you.' : ' Please log in to view projects.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow 
                    key={project.id}
                    className={selectedProject?.id === project.id ? 'bg-muted/50' : 'cursor-pointer hover:bg-muted/20'}
                    onClick={() => onProjectSelect?.(project)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      {project.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.location}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(project.status)} text-white`}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.start_date)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {project.end_date && formatDate(project.end_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectSelect?.(project);
                          }}
                        >
                          Select
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManager;