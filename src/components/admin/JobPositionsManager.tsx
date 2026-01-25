/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💼 JOB POSITIONS MANAGER - Admin Career Management                                ║
 * ║                                                                                      ║
 * ║   Created: December 27, 2025                                                         ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   FEATURES:                                                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ Create, edit, and delete job positions                                  │   ║
 * ║   │  ✅ View and manage job applications                                        │   ║
 * ║   │  ✅ Toggle position active/featured status                                  │   ║
 * ║   │  ✅ Rich text requirements and benefits                                     │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Users,
  MapPin,
  Clock,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
  FileText as FileTextIcon,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  Calendar,
  Building2,
  Code,
  Truck,
  Headphones,
  BarChart3,
  Settings,
  TrendingUp
} from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string;
  description: string;
  requirements: string[];
  benefits: string[];
  responsibilities: string[];
  icon_name: string;
  is_active: boolean;
  is_featured: boolean;
  application_deadline?: string;
  positions_available: number;
  created_at: string;
  updated_at: string;
}

interface JobApplication {
  id: string;
  job_id: string;
  job_title: string;
  full_name: string;
  email: string;
  phone: string;
  linkedin_url?: string;
  portfolio_url?: string;
  resume_url?: string;
  cover_letter?: string;
  cover_letter_file_url?: string;
  status: string;
  created_at: string;
  // Legacy field mappings (for backwards compatibility)
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
}

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Operations',
  'Sales',
  'Marketing',
  'Customer Success',
  'Finance',
  'Human Resources',
  'Legal'
];

const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Remote',
  'Internship'
];

const ICON_OPTIONS = [
  { name: 'Briefcase', icon: <Briefcase className="h-4 w-4" /> },
  { name: 'Code', icon: <Code className="h-4 w-4" /> },
  { name: 'BarChart3', icon: <BarChart3 className="h-4 w-4" /> },
  { name: 'Truck', icon: <Truck className="h-4 w-4" /> },
  { name: 'Headphones', icon: <Headphones className="h-4 w-4" /> },
  { name: 'Users', icon: <Users className="h-4 w-4" /> },
  { name: 'Settings', icon: <Settings className="h-4 w-4" /> },
  { name: 'TrendingUp', icon: <TrendingUp className="h-4 w-4" /> },
  { name: 'Building2', icon: <Building2 className="h-4 w-4" /> },
];

const APPLICATION_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'reviewing', label: 'Reviewing', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'interview', label: 'Interview', color: 'bg-purple-100 text-purple-800' },
  { value: 'offered', label: 'Offered', color: 'bg-green-100 text-green-800' },
  { value: 'hired', label: 'Hired', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];

const emptyPosition: Partial<JobPosition> = {
  title: '',
  department: 'Engineering',
  location: 'Nairobi, Kenya',
  job_type: 'Full-time',
  experience_level: '',
  salary_range: '',
  description: '',
  requirements: [],
  benefits: [],
  responsibilities: [],
  icon_name: 'Briefcase',
  is_active: true,
  is_featured: false,
  positions_available: 1
};

export const JobPositionsManager: React.FC = () => {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Partial<JobPosition> | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state for requirements/benefits/responsibilities
  const [newRequirement, setNewRequirement] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newResponsibility, setNewResponsibility] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('job_positions')
        .select('*')
        .order('created_at', { ascending: false });

      if (positionsError) throw positionsError;
      setPositions((positionsData || []) as any);

      // Load applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!applicationsError) {
        setApplications((applicationsData || []) as any);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job positions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePosition = async () => {
    if (!editingPosition?.title || !editingPosition?.description) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the title and description.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      if (editingPosition.id) {
        // Update existing
        const { error } = await supabase
          .from('job_positions')
          .update({
            title: editingPosition.title,
            department: editingPosition.department,
            location: editingPosition.location,
            job_type: editingPosition.job_type,
            experience_level: editingPosition.experience_level,
            salary_range: editingPosition.salary_range,
            description: editingPosition.description,
            requirements: editingPosition.requirements,
            benefits: editingPosition.benefits,
            responsibilities: editingPosition.responsibilities,
            icon_name: editingPosition.icon_name,
            is_active: editingPosition.is_active,
            is_featured: editingPosition.is_featured,
            positions_available: editingPosition.positions_available
          } as any)
          .eq('id', editingPosition.id);

        if (error) throw error;
        toast({ title: 'Position Updated', description: 'Job position has been updated successfully.' });
      } else {
        // Create new
        const { error } = await supabase
          .from('job_positions')
          .insert({
            title: editingPosition.title,
            department: editingPosition.department,
            location: editingPosition.location,
            job_type: editingPosition.job_type,
            experience_level: editingPosition.experience_level,
            salary_range: editingPosition.salary_range,
            description: editingPosition.description,
            requirements: editingPosition.requirements || [],
            benefits: editingPosition.benefits || [],
            responsibilities: editingPosition.responsibilities || [],
            icon_name: editingPosition.icon_name,
            is_active: editingPosition.is_active,
            is_featured: editingPosition.is_featured,
            positions_available: editingPosition.positions_available
          } as any);

        if (error) throw error;
        toast({ title: 'Position Created', description: 'New job position has been created successfully.' });
      }

      setShowDialog(false);
      setEditingPosition(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving position:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save position.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Position Deleted', description: 'Job position has been deleted.' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete position.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (position: JobPosition) => {
    try {
      const { error } = await supabase
        .from('job_positions')
        .update({ is_active: !position.is_active } as any)
        .eq('id', position.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };

  const handleToggleFeatured = async (position: JobPosition) => {
    try {
      const { error } = await supabase
        .from('job_positions')
        .update({ is_featured: !position.is_featured } as any)
        .eq('id', position.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status, reviewed_at: new Date().toISOString() } as any)
        .eq('id', applicationId);

      if (error) throw error;
      toast({ title: 'Status Updated', description: `Application status changed to ${status}.` });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        variant: 'destructive'
      });
    }
  };

  const addListItem = (field: 'requirements' | 'benefits' | 'responsibilities', value: string) => {
    if (!value.trim()) return;
    setEditingPosition(prev => ({
      ...prev,
      [field]: [...(prev?.[field] || []), value.trim()]
    }));
    if (field === 'requirements') setNewRequirement('');
    if (field === 'benefits') setNewBenefit('');
    if (field === 'responsibilities') setNewResponsibility('');
  };

  const removeListItem = (field: 'requirements' | 'benefits' | 'responsibilities', index: number) => {
    setEditingPosition(prev => ({
      ...prev,
      [field]: (prev?.[field] || []).filter((_, i) => i !== index)
    }));
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Briefcase': <Briefcase className="h-5 w-5" />,
      'Code': <Code className="h-5 w-5" />,
      'BarChart3': <BarChart3 className="h-5 w-5" />,
      'Truck': <Truck className="h-5 w-5" />,
      'Headphones': <Headphones className="h-5 w-5" />,
      'Users': <Users className="h-5 w-5" />,
      'Settings': <Settings className="h-5 w-5" />,
      'TrendingUp': <TrendingUp className="h-5 w-5" />,
      'Building2': <Building2 className="h-5 w-5" />,
    };
    return iconMap[iconName] || <Briefcase className="h-5 w-5" />;
  };

  const filteredPositions = positions.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || p.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = APPLICATION_STATUSES.find(s => s.value === status);
    return statusConfig || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="positions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="positions" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Job Positions ({positions.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-2">
            <FileText className="h-4 w-4" />
            Applications ({applications.length})
          </TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Job Positions</h2>
              <p className="text-muted-foreground">Manage career opportunities on the website</p>
            </div>
            <Button onClick={() => { setEditingPosition({ ...emptyPosition }); setShowDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Position
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Positions Grid */}
          <div className="grid gap-4">
            {filteredPositions.map((position) => (
              <Card key={position.id} className={`${!position.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${position.is_featured ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary'}`}>
                        {getIconComponent(position.icon_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{position.title}</h3>
                          {position.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {!position.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {position.department}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {position.location}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {position.job_type}
                          </span>
                          {position.salary_range && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-green-600">
                                <DollarSign className="h-3 w-3" />
                                {position.salary_range}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {position.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2 mr-4">
                        <Switch
                          checked={position.is_active}
                          onCheckedChange={() => handleToggleActive(position)}
                        />
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFeatured(position)}
                        className={position.is_featured ? 'text-yellow-600' : ''}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingPosition(position); setShowDialog(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Position?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{position.title}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePosition(position.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredPositions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No job positions found</p>
                <Button variant="link" onClick={() => { setEditingPosition({ ...emptyPosition }); setShowDialog(true); }}>
                  Create your first position
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Applications</h2>
              <p className="text-muted-foreground">Review and manage job applications</p>
            </div>
            <Button variant="outline" onClick={loadData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {applications.map((application) => {
              // Support both old and new field names
              const name = application.full_name || application.applicant_name || 'Unknown';
              const email = application.email || application.applicant_email || '';
              const phone = application.phone || application.applicant_phone || '';
              
              return (
                <Card key={application.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold">{name}</h3>
                          <Badge className={getStatusBadge(application.status).color}>
                            {getStatusBadge(application.status).label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Applied for: <strong>{application.job_title}</strong>
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {email}
                          </span>
                          {phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(application.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Document Links */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {application.resume_url && (
                            <Button variant="outline" size="sm" className="gap-1 h-8" asChild>
                              <a href={application.resume_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3" />
                                Resume
                              </a>
                            </Button>
                          )}
                          {application.cover_letter_file_url && (
                            <Button variant="outline" size="sm" className="gap-1 h-8" asChild>
                              <a href={application.cover_letter_file_url} target="_blank" rel="noopener noreferrer">
                                <FileTextIcon className="h-3 w-3" />
                                Cover Letter
                              </a>
                            </Button>
                          )}
                          {application.linkedin_url && (
                            <Button variant="outline" size="sm" className="gap-1 h-8" asChild>
                              <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                                LinkedIn
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={application.status}
                          onValueChange={(value) => handleUpdateApplicationStatus(application.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUSES.map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApplication(application)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {applications.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No applications received yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Position Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPosition?.id ? 'Edit Position' : 'Create New Position'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for this job position
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Job Title *</Label>
                <Input
                  value={editingPosition?.title || ''}
                  onChange={(e) => setEditingPosition(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
              
              <div>
                <Label>Department</Label>
                <Select
                  value={editingPosition?.department || 'Engineering'}
                  onValueChange={(value) => setEditingPosition(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Job Type</Label>
                <Select
                  value={editingPosition?.job_type || 'Full-time'}
                  onValueChange={(value) => setEditingPosition(prev => ({ ...prev, job_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Location</Label>
                <Input
                  value={editingPosition?.location || ''}
                  onChange={(e) => setEditingPosition(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Nairobi, Kenya"
                />
              </div>
              
              <div>
                <Label>Experience Level</Label>
                <Input
                  value={editingPosition?.experience_level || ''}
                  onChange={(e) => setEditingPosition(prev => ({ ...prev, experience_level: e.target.value }))}
                  placeholder="e.g., 3+ years"
                />
              </div>
              
              <div>
                <Label>Salary Range</Label>
                <Input
                  value={editingPosition?.salary_range || ''}
                  onChange={(e) => setEditingPosition(prev => ({ ...prev, salary_range: e.target.value }))}
                  placeholder="e.g., KES 200,000 - 350,000"
                />
              </div>
              
              <div>
                <Label>Icon</Label>
                <Select
                  value={editingPosition?.icon_name || 'Briefcase'}
                  onValueChange={(value) => setEditingPosition(prev => ({ ...prev, icon_name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(opt => (
                      <SelectItem key={opt.name} value={opt.name}>
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          {opt.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description *</Label>
              <Textarea
                value={editingPosition?.description || ''}
                onChange={(e) => setEditingPosition(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the role and what the candidate will be doing..."
                rows={4}
              />
            </div>

            {/* Requirements */}
            <div>
              <Label>Requirements</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  placeholder="Add a requirement..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('requirements', newRequirement))}
                />
                <Button type="button" onClick={() => addListItem('requirements', newRequirement)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(editingPosition?.requirements || []).map((req, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {req}
                    <button onClick={() => removeListItem('requirements', i)} className="ml-1 hover:text-red-600">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <Label>Benefits</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add a benefit..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('benefits', newBenefit))}
                />
                <Button type="button" onClick={() => addListItem('benefits', newBenefit)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(editingPosition?.benefits || []).map((ben, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 bg-green-100 text-green-800">
                    {ben}
                    <button onClick={() => removeListItem('benefits', i)} className="ml-1 hover:text-red-600">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Responsibilities */}
            <div>
              <Label>Responsibilities</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newResponsibility}
                  onChange={(e) => setNewResponsibility(e.target.value)}
                  placeholder="Add a responsibility..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addListItem('responsibilities', newResponsibility))}
                />
                <Button type="button" onClick={() => addListItem('responsibilities', newResponsibility)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(editingPosition?.responsibilities || []).map((resp, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
                    {resp}
                    <button onClick={() => removeListItem('responsibilities', i)} className="ml-1 hover:text-red-600">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingPosition?.is_active ?? true}
                  onCheckedChange={(checked) => setEditingPosition(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active (visible on website)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingPosition?.is_featured ?? false}
                  onCheckedChange={(checked) => setEditingPosition(prev => ({ ...prev, is_featured: checked }))}
                />
                <Label>Featured (highlighted)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePosition} disabled={saving}>
              {saving ? 'Saving...' : (editingPosition?.id ? 'Update Position' : 'Create Position')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Details Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Application for {selectedApplication?.job_title}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (() => {
            // Support both old and new field names
            const name = selectedApplication.full_name || selectedApplication.applicant_name || 'Unknown';
            const email = selectedApplication.email || selectedApplication.applicant_email || '';
            const phone = selectedApplication.phone || selectedApplication.applicant_phone || '';
            
            return (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Applied On</Label>
                    <p className="font-medium">{new Date(selectedApplication.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <Label className="text-muted-foreground mb-3 block">Uploaded Documents</Label>
                  <div className="flex flex-wrap gap-3">
                    {selectedApplication.resume_url ? (
                      <Button variant="default" size="sm" className="gap-2" asChild>
                        <a href={selectedApplication.resume_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                          Download Resume
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">No resume uploaded</Badge>
                    )}
                    
                    {selectedApplication.cover_letter_file_url ? (
                      <Button variant="default" size="sm" className="gap-2" asChild>
                        <a href={selectedApplication.cover_letter_file_url} target="_blank" rel="noopener noreferrer">
                          <FileTextIcon className="h-4 w-4" />
                          Download Cover Letter
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">No cover letter file</Badge>
                    )}
                  </div>
                </div>

                {selectedApplication.linkedin_url && (
                  <div>
                    <Label className="text-muted-foreground">LinkedIn</Label>
                    <a href={selectedApplication.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      {selectedApplication.linkedin_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {selectedApplication.portfolio_url && (
                  <div>
                    <Label className="text-muted-foreground">Portfolio</Label>
                    <a href={selectedApplication.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      {selectedApplication.portfolio_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {selectedApplication.cover_letter && (
                  <div>
                    <Label className="text-muted-foreground">Cover Letter / Message</Label>
                    <p className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {selectedApplication.cover_letter}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">Update Status</Label>
                  <Select
                    value={selectedApplication.status}
                    onValueChange={(value) => {
                      handleUpdateApplicationStatus(selectedApplication.id, value);
                      setSelectedApplication({ ...selectedApplication, status: value });
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobPositionsManager;








