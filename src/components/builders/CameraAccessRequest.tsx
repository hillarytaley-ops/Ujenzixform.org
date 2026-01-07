import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Camera, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Video,
  Shield,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CameraAccessRequest {
  id: string;
  project_name: string;
  reason: string;
  access_type: string;
  requested_duration: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  admin_notes?: string;
  rejection_reason?: string;
  access_starts_at?: string;
  access_expires_at?: string;
}

export const CameraAccessRequest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<CameraAccessRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    projectName: '',
    reason: '',
    accessType: 'view_only',
    requestedDuration: '30_days'
  });

  useEffect(() => {
    checkAuth();
    fetchRequests();

    // Real-time updates
    const channel = supabase
      .channel('my_camera_requests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'camera_access_requests' 
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('camera_access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectName.trim() || !formData.reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to submit a request');
        return;
      }

      const { error } = await supabase
        .from('camera_access_requests')
        .insert({
          requester_id: user.id,
          requester_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          requester_email: user.email,
          requester_role: 'builder',
          project_name: formData.projectName,
          reason: formData.reason,
          access_type: formData.accessType,
          requested_duration: formData.requestedDuration,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Camera access request submitted!', {
        description: 'An admin will review your request shortly.'
      });

      setFormData({
        projectName: '',
        reason: '',
        accessType: 'view_only',
        requestedDuration: '30_days'
      });
      setShowForm(false);
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Camera Access Requests
          </h2>
          <p className="text-muted-foreground">
            Request access to construction site camera feeds
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-50">
              <Clock className="h-3 w-3 mr-1" />
              {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" />
              {approvedCount} Active
            </Badge>
          </div>
          
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : (
              <>
                <Send className="h-4 w-4 mr-2" />
                New Request
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Eye className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> Submit a request to access camera feeds for your construction project. 
          An administrator will review your request and grant appropriate access levels.
        </AlertDescription>
      </Alert>

      {/* New Request Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Submit Access Request
            </CardTitle>
            <CardDescription>
              Fill in the details below to request camera access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g., Westlands Commercial Complex"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accessType">Access Type</Label>
                  <Select 
                    value={formData.accessType} 
                    onValueChange={(v) => setFormData({ ...formData, accessType: v })}
                  >
                    <SelectTrigger id="accessType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view_only">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          View Only
                        </div>
                      </SelectItem>
                      <SelectItem value="view_and_record">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          View & Record
                        </div>
                      </SelectItem>
                      <SelectItem value="full_control">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Full Control
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Requested Duration</Label>
                  <Select 
                    value={formData.requestedDuration} 
                    onValueChange={(v) => setFormData({ ...formData, requestedDuration: v })}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_day">1 Day</SelectItem>
                      <SelectItem value="7_days">7 Days</SelectItem>
                      <SelectItem value="30_days">30 Days</SelectItem>
                      <SelectItem value="90_days">90 Days</SelectItem>
                      <SelectItem value="permanent">Permanent (Project Duration)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason for Access *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Explain why you need access to the camera feeds..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
          <CardDescription>History of your camera access requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requests yet</p>
              <p className="text-sm">Submit a request to access project cameras</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id} className={
                    request.status === 'approved' ? 'border-green-200 bg-green-50/30' :
                    request.status === 'rejected' ? 'border-red-200 bg-red-50/30' :
                    request.status === 'pending' ? 'border-yellow-200 bg-yellow-50/30' : ''
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <span className="font-medium">{request.project_name}</span>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <p><strong>Access:</strong> {request.access_type?.replace('_', ' ')}</p>
                            <p><strong>Duration:</strong> {request.requested_duration?.replace('_', ' ')}</p>
                            <p><strong>Reason:</strong> {request.reason}</p>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Submitted: {format(new Date(request.created_at), 'PPp')}
                            {request.reviewed_at && (
                              <span className="ml-2">
                                • Reviewed: {format(new Date(request.reviewed_at), 'PPp')}
                              </span>
                            )}
                          </div>

                          {/* Show access period for approved requests */}
                          {request.status === 'approved' && request.access_expires_at && (
                            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 px-3 py-1 rounded-md w-fit">
                              <Calendar className="h-4 w-4" />
                              Access expires: {format(new Date(request.access_expires_at), 'PPP')}
                            </div>
                          )}

                          {/* Show rejection reason */}
                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="text-sm text-red-700 bg-red-100 px-3 py-2 rounded-md">
                              <strong>Reason:</strong> {request.rejection_reason}
                            </div>
                          )}

                          {/* Show admin notes */}
                          {request.admin_notes && (
                            <div className="text-sm text-muted-foreground italic">
                              Admin note: {request.admin_notes}
                            </div>
                          )}
                        </div>

                        {request.status === 'approved' && (
                          <Button variant="default" size="sm" asChild>
                            <a href="/monitoring">
                              <Eye className="h-4 w-4 mr-1" />
                              View Cameras
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraAccessRequest;














