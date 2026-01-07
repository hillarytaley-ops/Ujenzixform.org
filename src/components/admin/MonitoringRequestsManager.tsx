import React, { useState, useEffect } from 'react';
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
  AlertTriangle
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

// Pricing reference for admin
const PRICING_REFERENCE = {
  professional: {
    'ai-cameras': 15000,
    'drone-surveillance': 25000,
    'security-monitoring': 50000,
    'analytics-reporting': 20000
  },
  private: {
    'ai-cameras': 9000,
    'drone-surveillance': 15000,
    'security-monitoring': 30000,
    'analytics-reporting': 12000
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
  const { toast } = useToast();

  // Quote form state
  const [quoteAmount, setQuoteAmount] = useState<number>(0);
  const [quoteValidUntil, setQuoteValidUntil] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, statusFilter, searchTerm]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('monitoring_service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monitoring requests',
        variant: 'destructive'
      });
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

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      const { error } = await supabase
        .from('monitoring_service_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Request status changed to ${newStatus}`,
      });

      loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update request status',
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

    await updateRequestStatus(selectedRequest.id, 'quoted', {
      quote_amount: quoteAmount,
      quote_valid_until: quoteValidUntil,
      admin_notes: adminNotes
    });

    // Reset form
    setQuoteAmount(0);
    setQuoteValidUntil('');
    setAdminNotes('');
    setSelectedRequest(null);
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
      case 'private': return '🏠 Private Client';
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
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
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
                                    💡 Private client pricing applied (40% lower than professional rates)
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
                                <CardTitle className="text-lg">Create Quote</CardTitle>
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
                                  <Label htmlFor="adminNotes">Admin Notes</Label>
                                  <Textarea
                                    id="adminNotes"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Internal notes about this quote..."
                                    rows={3}
                                  />
                                </div>

                                <Button 
                                  onClick={submitQuote} 
                                  disabled={isUpdating}
                                  className="w-full"
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Submit Quote
                                </Button>
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
                                  className="w-full justify-start"
                                  onClick={() => updateRequestStatus(selectedRequest.id, 'approved')}
                                  disabled={isUpdating}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Request
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
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </DialogContent>
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



















