import React, { useState, useEffect } from 'react';
import { sanitizeCameraEmbedHtml } from '@/utils/sanitizeHtml';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Camera,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  Settings,
  MoreVertical,
  Download,
  AlertTriangle,
  Database,
  Link,
  Wifi,
  Globe,
  Smartphone,
  Monitor,
  Video,
  Lock,
  Play,
  Pause,
  ExternalLink,
  Code,
  Server,
  Radio,
  HelpCircle,
  Mic,
  Sun,
  Copy,
} from 'lucide-react';
import { CameraRecord, CameraFormData, CameraConnectionType } from '../types';
import { StatsCard, StatsGrid } from '../components/StatsCard';
import { CameraPermissionGuide, CameraSetupBanner } from '@/components/camera/CameraPermissionGuide';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DOCS_CAMERAS_HIKVISION,
  DOCS_MEDIAMTX_RTSP_TO_HLS,
  DOCS_MONITORING_STREAMING_STEPS,
} from '@/config/docsLinks';
import { useToast } from '@/hooks/use-toast';
import { CameraGridSkeleton } from '@/components/ui/loading-skeleton';
import { FriendlyError } from '@/components/ui/friendly-error';
import { DataTable, StatusBadge, Column, RowAction } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { useConfirmDialog } from '../components/ConfirmDialog';

interface MonitoringTabProps {
  cameras: CameraRecord[];
  loading: boolean;
  onRefresh: () => void;
  onAddCamera: (data: CameraFormData) => Promise<boolean>;
  onUpdateCamera: (id: string, data: Partial<CameraFormData>) => Promise<boolean>;
  onDeleteCamera: (id: string) => Promise<boolean>;
  onToggleStatus: (id: string, currentStatus: boolean) => Promise<boolean>;
}

// Connection type configurations - Simplified to 4 main options
const connectionTypes: {
  value: CameraConnectionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  fields: string[];
}[] = [
  {
    value: 'url',
    label: 'Web Link',
    icon: Link,
    description: 'Paste any camera URL or web viewer link',
    fields: ['stream_url'],
  },
  {
    value: 'ip_camera',
    label: 'IP Camera',
    icon: Wifi,
    description: 'Connect using IP address with login credentials',
    fields: ['ip_address', 'port', 'username', 'password'],
  },
  {
    value: 'embedded',
    label: 'Embed Code',
    icon: Code,
    description: 'Paste embed code from your camera provider',
    fields: ['embed_code'],
  },
  {
    value: 'mobile',
    label: 'Mobile Phone',
    icon: Smartphone,
    description: 'Use your phone as a camera with IP Webcam app',
    fields: ['stream_url'],
  },
  {
    value: 'vendor_cellular',
    label: 'Solar / 4G IP',
    icon: Sun,
    description:
      'Cellular or solar IP camera (e.g. Hikvision): HLS URL for the dashboard; optional RTMP/SRT ingest for the camera to push to MediaMTX.',
    fields: ['stream_url'],
  },
];

export const MonitoringTab: React.FC<MonitoringTabProps> = ({
  cameras,
  loading,
  onRefresh,
  onAddCamera,
  onUpdateCamera,
  onDeleteCamera,
  onToggleStatus,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraRecord | null>(null);
  const [formData, setFormData] = useState<CameraFormData>({
    name: '',
    location: '',
    stream_url: '',
    ingest_rtmp_url: '',
    ingest_srt_url: '',
    camera_type: 'ip',
    connection_type: 'url',
    recording_enabled: false,
    motion_detection: false,
    supports_ptz: false,
    supports_two_way_audio: false,
    is_active: true,
  });
  const { openDialog, DialogComponent } = useConfirmDialog();

  const onlineCameras = cameras.filter((c) => c.is_active).length;
  const offlineCameras = cameras.filter((c) => !c.is_active).length;

  const handleAddCamera = async () => {
    const success = await onAddCamera(formData);
    if (success) {
      setShowAddModal(false);
      resetForm();
    }
  };

  const handleUpdateCamera = async () => {
    if (!editingCamera) return;
    const success = await onUpdateCamera(editingCamera.id, formData);
    if (success) {
      setEditingCamera(null);
      resetForm();
    }
  };

  const handleDeleteCamera = (camera: CameraRecord) => {
    openDialog({
      title: 'Delete Camera',
      description: `Are you sure you want to delete "${camera.name}"? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await onDeleteCamera(camera.id);
      },
    });
  };

  const openEditModal = (camera: CameraRecord) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      location: camera.location || '',
      stream_url: camera.stream_url || '',
      ingest_rtmp_url: camera.ingest_rtmp_url || '',
      ingest_srt_url: camera.ingest_srt_url || '',
      camera_type: camera.camera_type || 'ip',
      connection_type: camera.connection_type || 'url',
      ip_address: camera.ip_address || '',
      port: camera.credentials?.port,
      username: camera.credentials?.username || '',
      password: camera.credentials?.password || '',
      embed_code: camera.embed_code || '',
      resolution: camera.resolution || '',
      recording_enabled: camera.recording_enabled,
      motion_detection: camera.motion_detection,
      supports_ptz: camera.supports_ptz ?? false,
      supports_two_way_audio: camera.supports_two_way_audio ?? false,
      is_active: camera.is_active,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      stream_url: '',
      ingest_rtmp_url: '',
      ingest_srt_url: '',
      camera_type: 'ip',
      connection_type: 'url',
      recording_enabled: false,
      motion_detection: false,
      supports_ptz: false,
      supports_two_way_audio: false,
      is_active: true,
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCamera(null);
    resetForm();
  };

  // Get connection type icon
  const getConnectionIcon = (type: CameraConnectionType) => {
    const config = connectionTypes.find((c) => c.value === type);
    return config?.icon || Link;
  };

  // Table columns
  const columns: Column<CameraRecord>[] = [
    {
      key: 'name',
      label: 'Camera Name',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-blue-400" />
          <span className="text-white font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: 'location', label: 'Location', sortable: true },
    {
      key: 'ingest_rtmp_url',
      label: 'Camera push',
      render: (_, row) =>
        row.ingest_rtmp_url || row.ingest_srt_url ? (
          <Badge variant="outline" className="border-cyan-600/50 text-cyan-300 text-[10px] uppercase tracking-wide">
            RTMP / SRT
          </Badge>
        ) : (
          <span className="text-gray-600 text-xs">—</span>
        ),
    },
    {
      key: 'connection_type',
      label: 'Connection',
      render: (_, row) => {
        const Icon = getConnectionIcon(row.connection_type || 'url');
        const config = connectionTypes.find((c) => c.value === (row.connection_type || 'url'));
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-purple-400" />
            <span className="text-gray-300">{config?.label || 'URL'}</span>
          </div>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, row) => <StatusBadge status={row.is_active ? 'online' : 'offline'} />,
    },
    {
      key: 'created_at',
      label: 'Added',
      render: (v) => new Date(v as string).toLocaleDateString(),
    },
  ];

  // Table actions
  const actions: RowAction<CameraRecord>[] = [
    {
      label: 'Edit',
      icon: Settings,
      onClick: openEditModal,
    },
    {
      label: 'Toggle Status',
      icon: Activity,
      onClick: (row) => onToggleStatus(row.id, row.is_active),
    },
    {
      label: 'Delete',
      icon: XCircle,
      variant: 'danger',
      onClick: handleDeleteCamera,
    },
  ];

  // Check if there are USB cameras that might need permission guidance
  const hasUSBCameras = cameras.some(c => c.connection_type === 'usb' || c.camera_type === 'usb');
  const [showSetupBanner, setShowSetupBanner] = useState(true);

  return (
    <div className="space-y-6">
      {DialogComponent}

      {/* First-time camera setup banner */}
      {hasUSBCameras && showSetupBanner && (
        <CameraSetupBanner onDismiss={() => setShowSetupBanner(false)} />
      )}

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Cameras"
          value={cameras.length}
          icon={Camera}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Online"
          value={onlineCameras}
          icon={CheckCircle}
          iconColor="text-green-500"
        />
        <StatsCard
          title="Offline"
          value={offlineCameras}
          icon={XCircle}
          iconColor="text-red-500"
        />
        <StatsCard
          title="Recording"
          value={cameras.filter((c) => c.recording_enabled).length}
          icon={Activity}
          iconColor="text-orange-500"
        />
      </StatsGrid>

      {/* Camera Grid View */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-red-500" />
                Site Camera Monitoring
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                Real-time CCTV feeds from construction sites and warehouses
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                LIVE
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-gray-400"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowAddModal(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CameraGridSkeleton count={6} />
          ) : cameras.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No Cameras Configured"
              description="Add your first camera to start monitoring your construction sites"
              action={{
                label: 'Add First Camera',
                onClick: () => setShowAddModal(true),
              }}
            />
          ) : (
            <>
              {/* Camera Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cameras.map((camera, index) => (
                  <CameraCard
                    key={camera.id}
                    camera={camera}
                    index={index}
                    onEdit={() => openEditModal(camera)}
                    onToggle={() => onToggleStatus(camera.id, camera.is_active)}
                    onDelete={() => handleDeleteCamera(camera)}
                  />
                ))}

                {/* Add Camera Card */}
                <div
                  className="relative bg-slate-800/50 rounded-lg overflow-hidden border border-dashed border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => setShowAddModal(true)}
                >
                  <div className="aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl text-gray-400">+</span>
                      </div>
                      <p className="text-gray-400 text-sm">Add Camera</p>
                      <p className="text-xs text-gray-500">Multiple connection options</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Camera Controls
                </h4>
                <div className="grid md:grid-cols-4 gap-3">
                  <Button variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Eye className="h-4 w-4 mr-2" />
                    Full Screen
                  </Button>
                  <Button variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Download className="h-4 w-4 mr-2" />
                    Export Footage
                  </Button>
                  <Button variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
                    <Activity className="h-4 w-4 mr-2" />
                    Motion Alerts
                  </Button>
                  <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-900/30">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Emergency
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Connection Types Overview */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" />
            Supported Connection Types
          </CardTitle>
          <CardDescription className="text-gray-400">
            Multiple ways to connect your cameras to the monitoring system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {connectionTypes.map((type) => (
              <div
                key={type.value}
                className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <type.icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <h4 className="text-white font-medium">{type.label}</h4>
                </div>
                <p className="text-sm text-gray-400">{type.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Camera Table View */}
      <DataTable
        title="Camera Management"
        description="View and manage all registered cameras"
        icon={Database}
        data={cameras}
        columns={columns}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search cameras..."
        emptyState={{
          icon: Camera,
          title: 'No Cameras Found',
          description: 'Add your first camera to get started',
          action: {
            label: 'Add Camera',
            onClick: () => setShowAddModal(true),
          },
        }}
        onRefresh={onRefresh}
        headerActions={
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowAddModal(true)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Add
          </Button>
        }
      />

      {/* Add/Edit Camera Modal */}
      {(showAddModal || editingCamera) && (
        <CameraModal
          isEditing={!!editingCamera}
          formData={formData}
          setFormData={setFormData}
          onSubmit={editingCamera ? handleUpdateCamera : handleAddCamera}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

// Camera Card Component with Live USB Streaming
interface CameraCardProps {
  camera: CameraRecord;
  index: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const CameraCard: React.FC<CameraCardProps> = ({
  camera,
  index,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamError, setStreamError] = React.useState<string | null>(null);
  const [mediaStream, setMediaStream] = React.useState<MediaStream | null>(null);

  const connectionType = camera.connection_type || 'url';
  const config = connectionTypes.find((c) => c.value === connectionType);
  const ConnectionIcon = config?.icon || Link;

  // Check if this is a USB camera type
  const isUSBCamera = connectionType === 'usb' || camera.camera_type === 'usb';

  // Start USB camera stream
  const startUSBStream = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎥 Starting USB camera stream...');
    
    try {
      setStreamError(null);
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStreamError('Camera API not supported in this browser');
        console.error('getUserMedia not supported');
        return;
      }
      
      console.log('🎥 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        },
        audio: false
      });
      
      console.log('🎥 Camera access granted, stream:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setMediaStream(stream);
        setIsStreaming(true);
        console.log('🎥 Video stream started successfully!');
      }
    } catch (error: unknown) {
      console.error('🎥 Failed to access USB camera:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : '';
      
      if (errorName === 'NotAllowedError' || errorMessage.includes('Permission denied')) {
        setStreamError('Camera permission denied. Please allow camera access in your browser.');
      } else if (errorName === 'NotFoundError' || errorMessage.includes('DevicesNotFoundError')) {
        setStreamError('No camera found. Please connect your USB camera.');
      } else if (errorName === 'NotReadableError') {
        setStreamError('Camera is in use by another application.');
      } else if (errorName === 'OverconstrainedError') {
        setStreamError('Camera does not support the requested resolution.');
      } else {
        setStreamError(`Camera error: ${errorName || errorMessage}`);
      }
    }
  };

  // Stop USB camera stream
  const stopUSBStream = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎥 Stopping USB camera stream...');
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    console.log('🎥 Stream stopped');
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // Render camera preview based on connection type
  const renderCameraPreview = () => {
    // For USB cameras, show live video or start button
    if (isUSBCamera) {
      if (isStreaming) {
        return (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => stopUSBStream(e)}
              className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1 cursor-pointer z-10"
            >
              <Pause className="h-3 w-3" />
              Stop
            </button>
          </div>
        );
      }
      
      return (
        <div className="text-center p-2">
          {streamError ? (
            <div className="space-y-2">
              {streamError.includes('permission') || streamError.includes('denied') ? (
                <>
                  <Lock className="h-8 w-8 text-amber-500 mx-auto" />
                  <p className="text-amber-400 text-xs font-medium">Permission Required</p>
                  <p className="text-gray-500 text-[10px] px-2">Click Allow when browser asks for camera access</p>
                </>
              ) : streamError.includes('found') ? (
                <>
                  <HelpCircle className="h-8 w-8 text-blue-500 mx-auto" />
                  <p className="text-blue-400 text-xs font-medium">Camera Not Found</p>
                  <p className="text-gray-500 text-[10px] px-2">Check USB connection</p>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                  <p className="text-red-400 text-xs">{streamError}</p>
                </>
              )}
              <button
                type="button"
                onClick={(e) => startUSBStream(e)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 mx-auto cursor-pointer z-10 mt-2"
              >
                <RefreshCw className="h-3 w-3" />
                Try Again
              </button>
            </div>
          ) : (
            <>
              <Monitor className="h-10 w-10 text-cyan-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm mb-1">USB Camera Ready</p>
              <p className="text-gray-600 text-[10px] mb-2">Click to start live feed</p>
              <button
                type="button"
                onClick={(e) => startUSBStream(e)}
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 mx-auto cursor-pointer z-10 relative"
              >
                <Play className="h-3 w-3" />
                Start Live Feed
              </button>
            </>
          )}
        </div>
      );
    }

    // For embedded viewers, show the embed code
    if (connectionType === 'embedded' && camera.embed_code) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div 
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: sanitizeCameraEmbedHtml(camera.embed_code) }}
          />
        </div>
      );
    }

    // For streams with URL, show play button
    if (camera.stream_url) {
      return (
        <div className="text-center">
          <div className="relative">
            <Eye className="h-12 w-12 text-blue-500 mx-auto mb-2" />
            <div className="absolute -top-1 -right-1">
              <ConnectionIcon className="h-4 w-4 text-purple-400" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">{config?.label || 'Stream'} Available</p>
          <a
            href={camera.stream_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open Stream
          </a>
        </div>
      );
    }

    // For IP cameras, show connection info
    if (connectionType === 'ip_camera' && camera.ip_address) {
      return (
        <div className="text-center">
          <ConnectionIcon className="h-12 w-12 text-purple-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">{config?.label}</p>
          <p className="text-xs text-gray-500 mt-1">
            {camera.ip_address}
            {camera.credentials?.port && `:${camera.credentials.port}`}
          </p>
          {camera.credentials?.username && (
            <div className="flex items-center justify-center gap-1 mt-1 text-xs text-green-400">
              <Lock className="h-3 w-3" />
              Authenticated
            </div>
          )}
        </div>
      );
    }

    // Default: no stream configured
    return (
      <div className="text-center">
        <Eye className="h-12 w-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No Stream Configured</p>
        <p className="text-xs text-gray-600">Click to configure</p>
      </div>
    );
  };

  return (
    <div className="relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        {renderCameraPreview()}
      </div>
      
      {/* Status Indicators */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            camera.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        ></div>
        <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded">
          CAM-{String(index + 1).padStart(2, '0')}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/50 text-purple-400 bg-black/30">
          {config?.label || 'URL'}
        </Badge>
      </div>
      
      {/* Recording & Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {camera.recording_enabled && (
          <span className="text-xs text-white bg-red-600/80 px-2 py-0.5 rounded flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            REC
          </span>
        )}
        {camera.is_active && !camera.recording_enabled && (
          <span className="text-xs text-white bg-green-600/80 px-2 py-0.5 rounded">LIVE</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70"
            >
              <MoreVertical className="h-3 w-3 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
            <DropdownMenuItem
              className="text-gray-300 hover:text-white cursor-pointer"
              onClick={onEdit}
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-gray-300 hover:text-white cursor-pointer"
              onClick={onToggle}
            >
              {camera.is_active ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Enable
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              className="text-red-400 hover:text-red-300 cursor-pointer"
              onClick={onDelete}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Camera Info */}
      <div className="p-3 bg-slate-900/80">
        <p className="text-white text-sm font-medium">{camera.name}</p>
        <p className="text-xs text-gray-400">{camera.location || 'No location set'}</p>
        {camera.project_name && (
          <p className="text-xs text-blue-400 mt-1">Project: {camera.project_name}</p>
        )}
        {camera.resolution && (
          <p className="text-xs text-gray-500 mt-1">{camera.resolution}</p>
        )}
      </div>
    </div>
  );
};

/** RTMP/SRT publish targets for Case 2 (camera → MediaMTX). Dashboard still uses Stream URL (HLS) above. */
function StreamIngestFields({
  formData,
  setFormData,
}: {
  formData: CameraFormData;
  setFormData: React.Dispatch<React.SetStateAction<CameraFormData>>;
}) {
  const { toast } = useToast();

  const copy = async (label: string, text: string) => {
    const t = text.trim();
    if (!t) {
      toast({ title: 'Nothing to copy', description: `Enter a ${label} URL first.`, variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      toast({ title: 'Copied', description: `${label} URL copied to clipboard.` });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Clipboard is not available in this context.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-700/80 bg-slate-900/60 p-4">
      <div className="flex items-start gap-2">
        <Server className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-200">Camera push → MediaMTX (optional)</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Paste these into the camera or NVR as the <strong>publish / server</strong> addresses. The monitoring player
            does not use RTMP or SRT — it uses the <strong>HLS Stream URL</strong> you set above (output from MediaMTX,
            often <code className="text-[11px] bg-slate-800 px-1 rounded">…/index.m3u8</code>).
          </p>
          <p className="text-xs text-slate-500 mt-2">
            <a
              href={DOCS_MEDIAMTX_RTSP_TO_HLS}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              MediaMTX example (README)
            </a>
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-gray-300">RTMP ingest URL</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-400 hover:text-white"
            onClick={() => void copy('RTMP ingest', formData.ingest_rtmp_url || '')}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
        </div>
        <Input
          placeholder="rtmp://your-vps-public-ip:1935/your_path"
          className="bg-slate-800 border-slate-700 text-white mt-1 font-mono text-xs"
          value={formData.ingest_rtmp_url || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, ingest_rtmp_url: e.target.value }))}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-gray-300">SRT ingest URL</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-400 hover:text-white"
            onClick={() => void copy('SRT ingest', formData.ingest_srt_url || '')}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
        </div>
        <Input
          placeholder="srt://your-vps-public-ip:8890?streamid=publish:path:user:pass"
          className="bg-slate-800 border-slate-700 text-white mt-1 font-mono text-xs"
          value={formData.ingest_srt_url || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, ingest_srt_url: e.target.value }))}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          UDP <strong>8890</strong> must be open on the VPS for SRT. Match streamid format to your MediaMTX version.
        </p>
      </div>
    </div>
  );
}

// Enhanced Camera Modal Component
interface CameraModalProps {
  isEditing: boolean;
  formData: CameraFormData;
  setFormData: React.Dispatch<React.SetStateAction<CameraFormData>>;
  onSubmit: () => void;
  onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({
  isEditing,
  formData,
  setFormData,
  onSubmit,
  onClose,
}) => {
  const selectedConnectionType = connectionTypes.find((c) => c.value === formData.connection_type);
  const requiredFields = selectedConnectionType?.fields || ['stream_url'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-500" />
            {isEditing ? 'Edit Camera' : 'Add New Camera'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isEditing ? 'Update camera connection and details' : 'Configure a new camera for monitoring'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Camera Name *</Label>
                <Input
                  placeholder="e.g., Main Warehouse Camera"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-gray-300">Location</Label>
                <Input
                  placeholder="e.g., Nairobi Industrial Area"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Camera Type</Label>
                <Select
                  value={formData.camera_type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, camera_type: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="ip">IP Camera</SelectItem>
                    <SelectItem value="analog">Analog Camera</SelectItem>
                    <SelectItem value="ptz">PTZ Camera</SelectItem>
                    <SelectItem value="dome">Dome Camera</SelectItem>
                    <SelectItem value="bullet">Bullet Camera</SelectItem>
                    <SelectItem value="thermal">Thermal Camera</SelectItem>
                    <SelectItem value="360">360° Camera</SelectItem>
                    <SelectItem value="solar_4g">Solar / 4G IP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Resolution</Label>
                <Select
                  value={formData.resolution || ''}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, resolution: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="480p">480p (SD)</SelectItem>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="1440p">1440p (2K)</SelectItem>
                    <SelectItem value="2160p">2160p (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Connection Type Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Connection Type
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {connectionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, connection_type: type.value }))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.connection_type === type.value
                      ? 'border-blue-500 bg-blue-600/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <type.icon className={`h-4 w-4 ${
                      formData.connection_type === type.value ? 'text-blue-400' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      formData.connection_type === type.value ? 'text-white' : 'text-gray-300'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Connection Details
              <Badge variant="outline" className="ml-2 text-xs border-purple-500/50 text-purple-400">
                {selectedConnectionType?.label}
              </Badge>
            </h3>

            {/* URL/Stream URL */}
            {requiredFields.includes('stream_url') && (
              <div>
                <Label className="text-gray-300">
                  {formData.connection_type === 'mobile'
                    ? 'IP Webcam URL'
                    : formData.connection_type === 'vendor_cellular'
                      ? 'Stream URL (HTTPS / HLS)'
                      : 'Camera URL'}
                </Label>
                <Input
                  placeholder={
                    formData.connection_type === 'mobile'
                      ? 'http://192.168.1.100:8080/video'
                      : formData.connection_type === 'vendor_cellular'
                        ? 'https://your-relay.example.com/cam1/index.m3u8'
                        : 'https://camera.example.com/stream'
                  }
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  value={formData.stream_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stream_url: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.connection_type === 'mobile' && 'Get this URL from your IP Webcam app'}
                  {formData.connection_type === 'url' && 'Paste the link to your camera viewer or stream'}
                  {formData.connection_type === 'vendor_cellular' &&
                    'Use an HLS (.m3u8) or direct HTTPS video URL — not rtsp:// (browsers cannot play RTSP). For vendor iframe viewers, switch to Embed code.'}
                </p>
                {requiredFields.includes('stream_url') &&
                  formData.stream_url.trim().toLowerCase().startsWith('http://') && (
                    <Alert className="mt-3 border-amber-500/50 bg-slate-900/80 text-slate-200 [&>svg]:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="text-amber-100 text-sm">Use HTTPS for production Web Link streams</AlertTitle>
                      <AlertDescription className="text-xs text-slate-400 leading-relaxed space-y-2">
                        <p>
                          On <strong>https://</strong> (e.g. Vercel), the browser blocks <code className="text-[11px] bg-slate-800 px-1 rounded">http://</code>{' '}
                          HLS playlists — you will see mixed-content or connection errors, not live video.
                        </p>
                        <p>
                          Put TLS in front of MediaMTX, or run a tunnel on the PC that hosts port <strong>8888</strong> (install{' '}
                          <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer" className="text-amber-300 underline">
                            ngrok
                          </a>
                          , then <code className="text-[11px] bg-slate-800 px-1 rounded">ngrok http 8888</code>) and paste the{' '}
                          <strong>https://…</strong> <code className="text-[11px] bg-slate-800 px-1">.m3u8</code> URL here.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                {formData.connection_type === 'vendor_cellular' && (
                  <Alert className="mt-3 border-cyan-500/40 bg-slate-900/80 text-slate-200 [&>svg]:text-cyan-400">
                    <Sun className="h-4 w-4" />
                    <AlertTitle className="text-cyan-100 text-sm">Hikvision-style solar / 4G kits</AlertTitle>
                    <AlertDescription className="text-xs text-slate-400 leading-relaxed space-y-2">
                      <p>
                        UjenziXform Monitoring matches what works in a normal browser: HLS, HTTPS video, YouTube/Vimeo, or
                        pasted iframe embed. Raw camera RTSP belongs behind MediaMTX or your vendor relay.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={DOCS_CAMERAS_HIKVISION}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Hikvision / 4G checklist
                        </a>
                        <span className="text-slate-600">·</span>
                        <a
                          href={DOCS_MONITORING_STREAMING_STEPS}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Streaming implementation steps
                        </a>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* IP Address & Port */}
            {requiredFields.includes('ip_address') && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">IP Address</Label>
                  <Input
                    placeholder="192.168.1.100"
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    value={formData.ip_address || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ip_address: e.target.value }))}
                  />
                </div>
                {requiredFields.includes('port') && (
                  <div>
                    <Label className="text-gray-300">Port</Label>
                    <Input
                      type="number"
                      placeholder="80"
                      className="bg-slate-800 border-slate-700 text-white mt-1"
                      value={formData.port || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, port: parseInt(e.target.value) || undefined }))}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Credentials */}
            {(requiredFields.includes('username') || requiredFields.includes('password')) && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Username</Label>
                  <Input
                    placeholder="admin"
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    value={formData.username || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    value={formData.password || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Embed Code */}
            {requiredFields.includes('embed_code') && (
              <div>
                <Label className="text-gray-300">Embed Code</Label>
                <Textarea
                  placeholder='<iframe src="https://camera.example.com/embed" ...></iframe>'
                  className="bg-slate-800 border-slate-700 text-white mt-1 font-mono text-sm"
                  rows={4}
                  value={formData.embed_code || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, embed_code: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste the embed code provided by your camera system or cloud service (e.g. Hik-Connect / vendor iframe).
                  See{' '}
                  <a
                    href={DOCS_CAMERAS_HIKVISION}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline"
                  >
                    Hikvision / 4G notes
                  </a>
                  .
                </p>
              </div>
            )}

            {requiredFields.includes('stream_url') && (
              <StreamIngestFields formData={formData} setFormData={setFormData} />
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Options
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  id="camera-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded bg-slate-700 border-slate-600 text-blue-500"
                />
                <Label htmlFor="camera-active" className="text-gray-300 cursor-pointer">
                  Camera Active
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  id="recording-enabled"
                  checked={formData.recording_enabled || false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, recording_enabled: e.target.checked }))}
                  className="rounded bg-slate-700 border-slate-600 text-red-500"
                />
                <Label htmlFor="recording-enabled" className="text-gray-300 cursor-pointer">
                  Enable Recording
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  id="motion-detection"
                  checked={formData.motion_detection || false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, motion_detection: e.target.checked }))}
                  className="rounded bg-slate-700 border-slate-600 text-orange-500"
                />
                <Label htmlFor="motion-detection" className="text-gray-300 cursor-pointer">
                  Motion Detection
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 md:col-span-1">
                <input
                  type="checkbox"
                  id="supports-ptz"
                  checked={formData.supports_ptz || false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, supports_ptz: e.target.checked }))}
                  className="rounded bg-slate-700 border-slate-600 text-cyan-500"
                />
                <Label htmlFor="supports-ptz" className="text-gray-300 cursor-pointer">
                  PTZ capable (pan/tilt/zoom)
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 md:col-span-1">
                <input
                  type="checkbox"
                  id="supports-two-way-audio"
                  checked={formData.supports_two_way_audio || false}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, supports_two_way_audio: e.target.checked }))
                  }
                  className="rounded bg-slate-700 border-slate-600 text-emerald-500"
                />
                <Label htmlFor="supports-two-way-audio" className="text-gray-300 cursor-pointer flex items-center gap-1">
                  <Mic className="h-3.5 w-3.5 text-emerald-400" />
                  Two-way audio (speaker/mic)
                </Label>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PTZ and talk-back still require a future camera gateway or vendor API; checking these only marks intent for
              the monitoring UI.
            </p>
          </div>
        </CardContent>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <Button variant="outline" className="border-slate-600 text-gray-300" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={onSubmit}
            disabled={!formData.name}
          >
            {isEditing ? 'Update Camera' : 'Add Camera'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
