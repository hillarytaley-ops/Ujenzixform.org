import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Type helper for tables not yet in generated types
const db = supabase as any;
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  History,
  Search,
  RefreshCw,
  Filter,
  Download,
  Loader2,
  User,
  Clock,
  Activity,
  Shield,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  UserPlus,
  Settings,
  Database,
  Globe,
  Package,
  Truck,
  Store,
  Building2,
  Calendar
} from "lucide-react";

interface ActivityLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  category: string;
  details: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const ACTIVITY_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'admin', label: 'Admin Actions' },
  { value: 'user', label: 'User Management' },
  { value: 'content', label: 'Content Changes' },
  { value: 'order', label: 'Orders' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'system', label: 'System' },
];

const ACTION_ICONS: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  signup: UserPlus,
  staff_created: UserPlus,
  staff_deleted: Trash2,
  staff_status_changed: Edit,
  user_approved: CheckCircle,
  user_rejected: XCircle,
  settings_changed: Settings,
  content_updated: Edit,
  order_created: Package,
  delivery_assigned: Truck,
  default: Activity
};

export const ActivityLogViewer = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7days');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Fetch activity logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = db
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply date filter
      const now = new Date();
      let startDate: Date;
      switch (dateFilter) {
        case '24hours':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      query = query.gte('created_at', startDate.toISOString());

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching logs:', error);
        setLogs([]);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      console.error('Logs fetch error:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter, dateFilter]);

  // Filter logs by search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.category?.toLowerCase().includes(query)
    );
  });

  // Export logs to CSV
  const exportLogs = () => {
    const headers = ['Date', 'User', 'Action', 'Category', 'Details', 'IP Address'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user_email || 'System',
      log.action,
      log.category,
      log.details,
      log.ip_address || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported!",
      description: `${filteredLogs.length} log entries exported to CSV.`
    });
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      auth: 'bg-blue-600',
      admin: 'bg-purple-600',
      user: 'bg-green-600',
      content: 'bg-yellow-600',
      order: 'bg-orange-600',
      delivery: 'bg-teal-600',
      system: 'bg-gray-600'
    };
    return <Badge className={colors[category] || 'bg-gray-600'}>{category}</Badge>;
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || ACTION_ICONS.default;
    return <Icon className="h-4 w-4" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-800/50">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5 text-amber-400" />
                Activity Log
              </CardTitle>
              <CardDescription className="text-gray-400">
                Track all staff and system activities within the dashboard
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                className="border-slate-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                className="border-slate-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="24hours">Last 24 Hours</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{filteredLogs.length}</p>
                <p className="text-sm text-gray-400">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <LogIn className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {filteredLogs.filter(l => l.action === 'login').length}
                </p>
                <p className="text-sm text-gray-400">Logins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {filteredLogs.filter(l => l.category === 'admin').length}
                </p>
                <p className="text-sm text-gray-400">Admin Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {filteredLogs.filter(l => l.category === 'system').length}
                </p>
                <p className="text-sm text-gray-400">System Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            Activity Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activity logs found.</p>
              <p className="text-sm">Activities will appear here as they occur.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">Category</TableHead>
                    <TableHead className="text-gray-400">Details</TableHead>
                    <TableHead className="text-gray-400">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="text-gray-400 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          {log.user_email || 'System'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-white">
                          {getActionIcon(log.action)}
                          <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(log.category)}</TableCell>
                      <TableCell className="text-gray-400 max-w-[300px] truncate">
                        {log.details}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="text-white flex items-center gap-2">
                                {getActionIcon(log.action)}
                                Activity Details
                              </DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Full details of this activity log entry
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-gray-400 text-sm">Date & Time</p>
                                  <p className="text-white">
                                    {new Date(log.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-sm">Category</p>
                                  {getCategoryBadge(log.category)}
                                </div>
                                <div>
                                  <p className="text-gray-400 text-sm">User</p>
                                  <p className="text-white">{log.user_email || 'System'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-sm">Action</p>
                                  <p className="text-white font-medium">
                                    {log.action.replace(/_/g, ' ')}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm mb-1">Details</p>
                                <p className="text-white bg-slate-800 rounded p-3">
                                  {log.details}
                                </p>
                              </div>
                              {log.ip_address && (
                                <div>
                                  <p className="text-gray-400 text-sm">IP Address</p>
                                  <p className="text-white font-mono">{log.ip_address}</p>
                                </div>
                              )}
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div>
                                  <p className="text-gray-400 text-sm mb-1">Metadata</p>
                                  <pre className="text-xs text-gray-300 bg-slate-800 rounded p-3 overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredLogs.length > 100 && (
                <p className="text-center text-gray-400 text-sm py-4">
                  Showing 100 of {filteredLogs.length} entries. Use filters to narrow results.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogViewer;

