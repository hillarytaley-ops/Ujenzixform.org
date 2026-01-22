/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📹 CAMERA ASSIGNMENT - Assign cameras to monitoring requests                       ║
 * ║                                                                                      ║
 * ║   CREATED: January 23, 2026                                                          ║
 * ║   PURPOSE:                                                                           ║
 * ║   - Admin assigns specific cameras to approved monitoring requests                   ║
 * ║   - Client uses their access_code to view only their assigned cameras                ║
 * ║   - Links cameras table with monitoring_service_requests                             ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  Link2,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  Copy,
  ExternalLink,
  Building2,
  Calendar,
  Key
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MonitoringRequest {
  id: string;
  user_id: string;
  project_name: string;
  project_location: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name?: string;
  camera_count: number;
  status: string;
  access_code?: string;
  assigned_cameras?: string[];
  created_at: string;
}

interface CameraRecord {
  id: string;
  name: string;
  location: string | null;
  stream_url: string | null;
  is_active: boolean;
  camera_type: string;
  connection_type: string;
}

export const CameraAssignment: React.FC = () => {
  const [requests, setRequests] = useState<MonitoringRequest[]>([]);
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MonitoringRequest | null>(null);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('approved');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load approved monitoring requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('monitoring_service_requests')
        .select('*')
        .in('status', ['approved', 'completed'])
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);

      // Load all cameras
      const { data: camerasData, error: camerasError } = await supabase
        .from('cameras')
        .select('*')
        .order('name');

      if (camerasError) throw camerasError;
      setCameras(camerasData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (request: MonitoringRequest) => {
    setSelectedRequest(request);
    setSelectedCameras(request.assigned_cameras || []);
    setShowAssignModal(true);
  };

  const handleCameraToggle = (cameraId: string) => {
    setSelectedCameras(prev => 
      prev.includes(cameraId)
        ? prev.filter(id => id !== cameraId)
        : [...prev, cameraId]
    );
  };

  const saveAssignment = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    try {
      // Generate access code if not exists
      let accessCode = selectedRequest.access_code;
      if (!accessCode) {
        accessCode = generateAccessCode();
      }

      // Update the monitoring request with assigned cameras
      const { error } = await supabase
        .from('monitoring_service_requests')
        .update({
          assigned_cameras: selectedCameras,
          access_code: accessCode,
          status: selectedCameras.length > 0 ? 'approved' : selectedRequest.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: '✅ Cameras Assigned!',
        description: `${selectedCameras.length} camera(s) assigned to ${selectedRequest.project_name}. Access code: ${accessCode}`,
      });

      setShowAssignModal(false);
      loadData();

    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save camera assignment',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const generateAccessCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: '📋 Copied!',
      description: 'Access code copied to clipboard',
    });
  };

  const getMonitoringUrl = (accessCode: string, projectName: string) => {
    return `${window.location.origin}/monitoring?access_code=${accessCode}&project=${encodeURIComponent(projectName)}`;
  };

  const copyMonitoringLink = (request: MonitoringRequest) => {
    if (!request.access_code) return;
    const url = getMonitoringUrl(request.access_code, request.project_name);
    navigator.clipboard.writeText(url);
    toast({
      title: '🔗 Link Copied!',
      description: 'Monitoring link copied to clipboard. Share with the client.',
    });
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-purple-600" />
            Camera Assignment
          </h2>
          <p className="text-gray-500 mt-1">
            Assign cameras to approved monitoring requests
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by project, client name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved Requests</p>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Cameras</p>
              <p className="text-2xl font-bold">{cameras.filter(c => c.is_active).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Link2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">With Cameras Assigned</p>
              <p className="text-2xl font-bold">
                {requests.filter(r => r.assigned_cameras && r.assigned_cameras.length > 0).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No approved monitoring requests found</p>
              <p className="text-sm text-gray-400 mt-1">
                Approve monitoring requests first to assign cameras
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => {
            const assignedCount = request.assigned_cameras?.length || 0;
            const hasAccessCode = !!request.access_code;

            return (
              <Card key={request.id} className={assignedCount > 0 ? 'border-green-200 bg-green-50/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Request Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-lg">{request.project_name}</h3>
                        <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {request.contact_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {request.project_location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Camera className="h-4 w-4" />
                          Requested: {request.camera_count} camera(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>

                      {/* Access Code & Assigned Cameras */}
                      {assignedCount > 0 && (
                        <div className="flex flex-wrap items-center gap-3 mt-2 p-2 bg-white rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Access Code:</span>
                            <code className="bg-green-100 px-2 py-0.5 rounded font-mono text-green-700">
                              {request.access_code}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyAccessCode(request.access_code!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            {assignedCount} camera(s) assigned
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => copyMonitoringLink(request)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Copy Link
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openAssignModal(request)}
                        variant={assignedCount > 0 ? 'outline' : 'default'}
                        className={assignedCount > 0 ? '' : 'bg-purple-600 hover:bg-purple-700'}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        {assignedCount > 0 ? 'Edit Cameras' : 'Assign Cameras'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Assign Cameras Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Camera className="h-5 w-5 text-purple-400" />
              Assign Cameras to {selectedRequest?.project_name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Select cameras to assign to this monitoring request. The client will receive an access code to view these cameras.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Request Summary */}
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">Client:</span> <span className="text-white font-medium">{selectedRequest?.contact_name}</span></div>
                <div><span className="text-slate-400">Email:</span> <span className="text-white font-medium">{selectedRequest?.contact_email}</span></div>
                <div><span className="text-slate-400">Location:</span> <span className="text-white font-medium">{selectedRequest?.project_location}</span></div>
                <div><span className="text-slate-400">Requested:</span> <span className="text-white font-medium">{selectedRequest?.camera_count} camera(s)</span></div>
              </div>
            </div>

            {/* Camera Selection */}
            <div>
              <Label className="mb-2 block text-white">Select Cameras ({selectedCameras.length} selected)</Label>
              <ScrollArea className="h-[300px] border border-slate-700 rounded-lg p-3 bg-slate-900">
                {cameras.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No cameras available</p>
                    <p className="text-sm">Add cameras in the Monitoring tab first</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cameras.map((camera) => (
                      <div
                        key={camera.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedCameras.includes(camera.id)
                            ? 'bg-purple-900/50 border-purple-500'
                            : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                        }`}
                        onClick={() => handleCameraToggle(camera.id)}
                      >
                        <Checkbox
                          checked={selectedCameras.includes(camera.id)}
                          onCheckedChange={() => handleCameraToggle(camera.id)}
                          className="border-slate-500 data-[state=checked]:bg-purple-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-purple-400" />
                            <span className="font-medium text-white">{camera.name}</span>
                            <Badge 
                              variant={camera.is_active ? 'default' : 'secondary'} 
                              className={`text-xs ${camera.is_active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                            >
                              {camera.is_active ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                          {camera.location && (
                            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {camera.location}
                            </p>
                          )}
                        </div>
                        {selectedCameras.includes(camera.id) && (
                          <CheckCircle className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Access Code Preview */}
            {selectedCameras.length > 0 && (
              <div className="p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
                <div className="flex items-center gap-2 text-green-400">
                  <Key className="h-4 w-4" />
                  <span className="font-medium">
                    {selectedRequest?.access_code 
                      ? `Access Code: ${selectedRequest.access_code}` 
                      : 'A new access code will be generated'}
                  </span>
                </div>
                <p className="text-sm text-green-300 mt-1">
                  Share this code with the client so they can view their cameras on the Monitoring page.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-700 pt-4">
            <Button variant="outline" onClick={() => setShowAssignModal(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button 
              onClick={saveAssignment} 
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CameraAssignment;

