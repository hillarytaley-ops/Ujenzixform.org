import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Eye, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Building2,
  Users,
  Filter,
  Search,
  Download,
  Send,
  AlertTriangle,
  Edit,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Layers
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Helper to get access token
const getAccessToken = (): string => {
  try {
    const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      return parsed?.access_token || SUPABASE_ANON_KEY;
    }
  } catch (e) {
    console.log('Using anon key for monitoring requests');
  }
  return SUPABASE_ANON_KEY;
};

interface MonitoringRequest {
  id: string;
  user_id: string;
  builder_type?: 'private' | 'professional';
  project_name: string;
  project_location: string;
  project_size?: string;
  project_type?: string;
  project_duration?: string;
  start_date?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name?: string;
  selected_services: string[];
  camera_count: number;
  drone_hours: number;
  security_level?: string;
  special_requirements?: string;
  budget_range?: string;
  urgency?: string;
  estimated_cost: number;
  additional_notes?: string;
  status: 'pending' | 'reviewing' | 'quoted' | 'approved' | 'rejected' | 'completed';
  admin_notes?: string;
  quote_amount?: number;
  quote_valid_until?: string;
  created_at: string;
  updated_at: string;
}

// Pricing reference for admin (Private clients get 50% discount)
const PRICING_REFERENCE = {
  professional: {
    'ai-cameras': 15000,
    'drone-surveillance': 25000,
    'security-monitoring': 50000,
    'analytics-reporting': 20000
  },
  private: {
    'ai-cameras': 7500,        // 50% off professional rate
    'drone-surveillance': 12500, // 50% off professional rate
    'security-monitoring': 25000, // 50% off professional rate
    'analytics-reporting': 10000  // 50% off professional rate
  }
};

export const MonitoringRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<MonitoringRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MonitoringRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<MonitoringRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Quote form state
  const [quoteAmount, setQuoteAmount] = useState<number>(0);
  const [quoteValidUntil, setQuoteValidUntil] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isEditingQuote, setIsEditingQuote] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  // Load existing quote data when editing
  const loadExistingQuote = (request: MonitoringRequest) => {
    setQuoteAmount(request.quote_amount || 0);
    setQuoteValidUntil(request.quote_valid_until || '');
    setAdminNotes(request.admin_notes || '');
    setIsEditingQuote(true);
  };

  // Reset quote form
  const resetQuoteForm = () => {
    setQuoteAmount(0);
    setQuoteValidUntil('');
    setAdminNotes('');
    setIsEditingQuote(false);
  };

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter, searchTerm]);

  // Group requests by project name
  const groupedRequests = useMemo(() => {
    const groups: { [projectName: string]: MonitoringRequest[] } = {};
    
    filteredRequests.forEach(request => {
      const projectKey = request.project_name || 'Unnamed Project';
      if (!groups[projectKey]) {
        groups[projectKey] = [];
      }
      groups[projectKey].push(request);
    });
    
    // Sort requests within each group by date (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    
    // Convert to array and sort groups by most recent request
    return Object.entries(groups)
      .map(([projectName, projectRequests]) => ({
        projectName,
        requests: projectRequests,
        totalEstimatedCost: projectRequests.reduce((sum, r) => sum + r.estimated_cost, 0),
        location: projectRequests[0]?.project_location || 'Unknown',
        latestDate: projectRequests[0]?.created_at || '',
        pendingCount: projectRequests.filter(r => r.status === 'pending').length,
        quotedCount: projectRequests.filter(r => r.status === 'quoted').length,
        approvedCount: projectRequests.filter(r => r.status === 'approved').length,
      }))
      .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [filteredRequests]);

  // Toggle project expansion
  const toggleProject = (projectName: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectName)) {
        newSet.delete(projectName);
      } else {
        newSet.add(projectName);
      }
      return newSet;
    });
  };

  // Expand all projects
  const expandAllProjects = () => {
    setExpandedProjects(new Set(groupedRequests.map(g => g.projectName)));
  };

  // Collapse all projects
  const collapseAllProjects = () => {
    setExpandedProjects(new Set());
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      console.log('📹 Loading monitoring requests via REST API...');
      
      const accessToken = getAccessToken();
      
      // Use direct REST API with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/monitoring_service_requests?order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Failed to load: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Monitoring requests loaded:', data?.length || 0);
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      if (error.name !== 'AbortError') {
        toast({
          title: 'Error',
          description: 'Failed to load monitoring requests',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.project_location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const updateRequestStatus = async (requestId: string, newStatus: string, additionalData?: any) => {
    try {
      setIsUpdating(true);
      console.log('📹 Updating monitoring request status...');

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      const accessToken = getAccessToken();
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/monitoring_service_requests?id=eq.${requestId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updateData),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Update failed: ${response.status}`);
      }

      console.log('✅ Monitoring request status updated');
      toast({
        title: 'Status Updated',
        description: `Request status changed to ${newStatus}`,
      });

      loadRequests();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update request status',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const submitQuote = async () => {
    if (!selectedRequest || !quoteAmount || !quoteValidUntil) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in quote amount and validity date',
        variant: 'destructive'
      });
      return;
    }

    // If editing an existing quote, keep the status as 'quoted'
    const newStatus = isEditingQuote ? 'quoted' : 'quoted';
    
    await updateRequestStatus(selectedRequest.id, newStatus, {
      quote_amount: quoteAmount,
      quote_valid_until: quoteValidUntil,
      admin_notes: adminNotes
    });

    toast({
      title: isEditingQuote ? 'Quote Updated' : 'Quote Sent',
      description: isEditingQuote 
        ? 'The quote has been updated successfully. The builder will see the new quote.'
        : 'Quote has been sent to the builder.',
    });

    // Reset form
    resetQuoteForm();
    setSelectedRequest(null);
  };

  // Update existing quote without changing status
  const updateQuote = async () => {
    if (!selectedRequest || !quoteAmount || !quoteValidUntil) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in quote amount and validity date',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUpdating(true);
      console.log('📹 Updating quote...');

      const accessToken = getAccessToken();
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/monitoring_service_requests?id=eq.${selectedRequest.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            quote_amount: quoteAmount,
            quote_valid_until: quoteValidUntil,
            admin_notes: adminNotes,
            updated_at: new Date().toISOString()
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Update failed: ${response.status}`);
      }

      console.log('✅ Quote updated');
      toast({
        title: 'Quote Updated',
        description: 'The quote has been updated successfully.',
      });

      loadRequests();
      resetQuoteForm();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error('Error updating quote:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update the quote',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewing': return 'bg-blue-100 text-blue-800';
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBuilderTypeColor = (builderType?: string) => {
    switch (builderType) {
      case 'private': return 'bg-green-100 text-green-800';
      case 'professional': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBuilderTypeLabel = (builderType?: string) => {
    switch (builderType) {
      case 'private': return '🏠 Private Builder';
      case 'professional': return '🏢 Professional';
      default: return 'Not Specified';
    }
  };

  // Calculate suggested quote based on builder type
  const calculateSuggestedQuote = (request: MonitoringRequest): number => {
    const pricing = request.builder_type === 'private' 
      ? PRICING_REFERENCE.private 
      : PRICING_REFERENCE.professional;
    
    let total = 0;
    request.selected_services.forEach(serviceId => {
      const basePrice = pricing[serviceId as keyof typeof pricing];
      if (!basePrice) return;
      
      switch (serviceId) {
        case 'ai-cameras':
          total += basePrice * Math.max(request.camera_count, 1);
          break;
        case 'drone-surveillance':
          total += basePrice * Math.max(request.drone_hours, 1);
          break;
        case 'security-monitoring':
        case 'analytics-reporting':
          total += basePrice;
          break;
      }
    });
    
    return total;
  };

  // Render the request dialog content (shared between grouped and list views)
  const renderRequestDialog = (request: MonitoringRequest) => (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Request Details - {request.project_name}</DialogTitle>
        <DialogDescription>
          Submitted on {format(new Date(request.created_at), 'MMMM dd, yyyy')}
        </DialogDescription>
      </DialogHeader>
      
      {selectedRequest && (
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Project Details</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="quote">Quote & Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Name:</strong> {selectedRequest.project_name}</div>
                  <div><strong>Location:</strong> {selectedRequest.project_location}</div>
                  {selectedRequest.project_type && (
                    <div><strong>Type:</strong> {selectedRequest.project_type}</div>
                  )}
                  {selectedRequest.project_size && (
                    <div><strong>Size:</strong> {selectedRequest.project_size}</div>
                  )}
                  {selectedRequest.project_duration && (
                    <div><strong>Duration:</strong> {selectedRequest.project_duration}</div>
                  )}
                  {selectedRequest.start_date && (
                    <div><strong>Start Date:</strong> {format(new Date(selectedRequest.start_date), 'MMMM dd, yyyy')}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{selectedRequest.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{selectedRequest.contact_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{selectedRequest.contact_phone}</span>
                  </div>
                  {selectedRequest.company_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{selectedRequest.company_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {selectedRequest.additional_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedRequest.additional_notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedRequest.selected_services.map((serviceId, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{serviceId}</div>
                  </div>
                ))}
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {selectedRequest.camera_count > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium">Cameras Needed</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedRequest.camera_count}
                      </div>
                    </div>
                  )}
                  
                  {selectedRequest.drone_hours > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium">Drone Hours/Month</div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedRequest.drone_hours}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="font-medium">Estimated Cost</div>
                  <div className="text-2xl font-bold text-primary">
                    KES {selectedRequest.estimated_cost.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quote" className="space-y-4">
            {/* Show current quote if exists */}
            {selectedRequest.status === 'quoted' && selectedRequest.quote_amount && !isEditingQuote && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                      Current Quote (Sent to Builder)
                    </CardTitle>
                    <Badge className="bg-purple-100 text-purple-800">Awaiting Response</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Quote Amount</div>
                      <div className="text-2xl font-bold text-purple-600">
                        KES {selectedRequest.quote_amount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Valid Until</div>
                      <div className="text-lg font-semibold">
                        {selectedRequest.quote_valid_until 
                          ? format(new Date(selectedRequest.quote_valid_until), 'MMMM dd, yyyy')
                          : 'Not set'}
                      </div>
                    </div>
                  </div>
                  
                  {selectedRequest.admin_notes && (
                    <div className="mb-4 p-3 bg-white rounded-lg border">
                      <div className="text-sm text-muted-foreground mb-1">Admin Notes</div>
                      <p className="text-sm">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => loadExistingQuote(selectedRequest)}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Quote
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Builder Type & Suggested Pricing Card */}
            <Card className={selectedRequest.builder_type === 'private' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Builder Type</div>
                    <Badge className={getBuilderTypeColor(selectedRequest.builder_type)} variant="secondary">
                      {getBuilderTypeLabel(selectedRequest.builder_type)}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Suggested Quote</div>
                    <div className={`text-xl font-bold ${selectedRequest.builder_type === 'private' ? 'text-green-600' : 'text-blue-600'}`}>
                      KES {calculateSuggestedQuote(selectedRequest).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  {selectedRequest.builder_type === 'private' ? (
                    <span className="text-green-700">
                      💡 Private Builder pricing applied (40% lower than professional rates)
                    </span>
                  ) : (
                    <span className="text-blue-700">
                      💼 Professional/Company pricing applied (standard commercial rates)
                    </span>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setQuoteAmount(calculateSuggestedQuote(selectedRequest))}
                >
                  Use Suggested Amount
                </Button>
              </CardContent>
            </Card>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isEditingQuote ? (
                      <>
                        <Edit className="h-5 w-5 text-amber-500" />
                        Edit Quote
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Create Quote
                      </>
                    )}
                  </CardTitle>
                  {isEditingQuote && (
                    <CardDescription className="text-amber-600">
                      Editing existing quote - changes will be visible to the builder
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quoteAmount">Quote Amount (KES)</Label>
                    <Input
                      id="quoteAmount"
                      type="number"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Enter quote amount"
                    />
                    {quoteAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {quoteAmount !== calculateSuggestedQuote(selectedRequest) && (
                          <span className="text-amber-600">
                            ⚠️ Different from suggested: KES {calculateSuggestedQuote(selectedRequest).toLocaleString()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quoteValidUntil">Quote Valid Until</Label>
                    <Input
                      id="quoteValidUntil"
                      type="date"
                      value={quoteValidUntil}
                      onChange={(e) => setQuoteValidUntil(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">Admin Notes (visible to builder)</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Notes about this quote (e.g., payment terms, included services)..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    {isEditingQuote ? (
                      <>
                        <Button 
                          onClick={updateQuote} 
                          disabled={isUpdating}
                          className="flex-1"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update Quote
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={resetQuoteForm}
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={submitQuote} 
                        disabled={isUpdating}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Quote to Builder
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'reviewing')}
                    disabled={isUpdating}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark as Reviewing
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-green-600 hover:text-green-700"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'approved')}
                    disabled={isUpdating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Request (Grant Access)
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => updateRequestStatus(selectedRequest.id, 'rejected')}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Request
                  </Button>

                  {selectedRequest.status === 'quoted' && (
                    <div className="pt-2 mt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        ⏳ Waiting for builder to accept or decline the quote
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </DialogContent>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitoring Service Requests</h2>
          <p className="text-muted-foreground">
            Manage and respond to monitoring service requests from builders
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {filteredRequests.length} Requests
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grouped' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grouped')}
                className="flex items-center gap-1"
              >
                <Layers className="h-4 w-4" />
                Grouped
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                List
              </Button>
            </div>
          </div>
          
          {/* Expand/Collapse controls for grouped view */}
          {viewMode === 'grouped' && groupedRequests.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {groupedRequests.length} project{groupedRequests.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" onClick={expandAllProjects}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAllProjects}>
                Collapse All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouped View */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {groupedRequests.map((group) => (
            <Card key={group.projectName} className="overflow-hidden">
              {/* Project Header - Clickable to expand/collapse */}
              <div 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleProject(group.projectName)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedProjects.has(group.projectName) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{group.projectName}</CardTitle>
                          <Badge variant="secondary" className="ml-2">
                            {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {group.location}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Status Summary Badges */}
                      <div className="flex items-center gap-1">
                        {group.pendingCount > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {group.pendingCount} pending
                          </Badge>
                        )}
                        {group.quotedCount > 0 && (
                          <Badge className="bg-purple-100 text-purple-800">
                            {group.quotedCount} quoted
                          </Badge>
                        )}
                        {group.approvedCount > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            {group.approvedCount} approved
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          KES {group.totalEstimatedCost.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total estimated
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </div>
              
              {/* Expanded Content - Individual Requests */}
              {expandedProjects.has(group.projectName) && (
                <CardContent className="pt-0 border-t bg-muted/20">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                    {group.requests.map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow bg-background">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">
                                Request #{request.id.slice(0, 8)}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(request.created_at), 'MMM dd, yyyy')}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Badge className={getBuilderTypeColor(request.builder_type)} variant="secondary">
                            {getBuilderTypeLabel(request.builder_type)}
                          </Badge>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="truncate">{request.contact_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>KES {request.estimated_cost.toLocaleString()}</span>
                            </div>
                          </div>

                          {request.urgency && (
                            <Badge className={getUrgencyColor(request.urgency)} variant="secondary">
                              {request.urgency}
                            </Badge>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Services: {request.selected_services.length} selected
                          </div>

                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              {renderRequestDialog(request)}
                            </Dialog>

                            {request.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateRequestStatus(request.id, 'reviewing');
                                }}
                                disabled={isUpdating}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* List View (Original) */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.project_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {request.project_location}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Builder Type Badge */}
                <Badge className={getBuilderTypeColor(request.builder_type)} variant="secondary">
                  {getBuilderTypeLabel(request.builder_type)}
                </Badge>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{request.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>KES {request.estimated_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(request.created_at), 'MMM dd')}</span>
                  </div>
                  {request.urgency && (
                    <Badge className={getUrgencyColor(request.urgency)} variant="secondary">
                      {request.urgency}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Services: {request.selected_services.length} selected
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    {renderRequestDialog(request)}
                  </Dialog>

                  {request.status === 'pending' && (
                    <Button 
                      size="sm" 
                      onClick={() => updateRequestStatus(request.id, 'reviewing')}
                      disabled={isUpdating}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Requests Found</h3>
            <p className="text-muted-foreground">
              {requests.length === 0 
                ? "No monitoring service requests have been submitted yet."
                : "No requests match your current filters."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonitoringRequestsManager;



















