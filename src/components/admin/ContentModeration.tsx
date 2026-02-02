import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Flag,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Ban,
  Search,
  Filter,
  Video,
  Image as ImageIcon,
  MessageCircle,
  Clock,
  User,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Users,
  FileText,
  Play
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description?: string;
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  action_taken?: string;
  created_at: string;
  reporter?: {
    full_name: string;
    email?: string;
  };
}

interface Post {
  id: string;
  builder_id: string;
  post_type: string;
  media_url?: string;
  caption?: string;
  location?: string;
  likes_count: number;
  comments_count: number;
  status: string;
  created_at: string;
  builder?: {
    full_name: string;
    company_name?: string;
    email?: string;
  };
}

interface Story {
  id: string;
  builder_id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  views_count: number;
  is_active: boolean;
  created_at: string;
  builder?: {
    full_name: string;
    company_name?: string;
  };
}

export const ContentModeration: React.FC = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    pendingReports: 0,
    totalPosts: 0,
    totalStories: 0,
    flaggedContent: 0,
    resolvedToday: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('content_reports')
        .select(`
          *,
          reporter:profiles!reporter_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // Load recent posts
      const { data: postsData, error: postsError } = await supabase
        .from('builder_posts')
        .select(`
          *,
          builder:profiles!builder_id(full_name, company_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!postsError) {
        setPosts(postsData || []);
      }

      // Load recent stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('builder_stories')
        .select(`
          *,
          builder:profiles!builder_id(full_name, company_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!storiesError) {
        setStories(storiesData || []);
      }

      // Calculate stats
      const pendingReports = (reportsData || []).filter(r => r.status === 'pending').length;
      const flaggedContent = (postsData || []).filter(p => p.status === 'reported').length;
      const today = new Date().toISOString().split('T')[0];
      const resolvedToday = (reportsData || []).filter(r => 
        r.status === 'resolved' && r.reviewed_at?.startsWith(today)
      ).length;

      setStats({
        pendingReports,
        totalPosts: (postsData || []).length,
        totalStories: (storiesData || []).length,
        flaggedContent,
        resolvedToday
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load moderation data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async () => {
    if (!selectedReport || !reviewAction) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update report status
      const { error: reportError } = await supabase
        .from('content_reports')
        .update({
          status: 'resolved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          action_taken: reviewAction
        })
        .eq('id', selectedReport.id);

      if (reportError) throw reportError;

      // Take action on content if needed
      if (reviewAction === 'remove' || reviewAction === 'hide') {
        if (selectedReport.content_type === 'post') {
          await supabase
            .from('builder_posts')
            .update({ status: reviewAction === 'remove' ? 'deleted' : 'hidden' })
            .eq('id', selectedReport.content_id);
        } else if (selectedReport.content_type === 'story') {
          await supabase
            .from('builder_stories')
            .update({ is_active: false })
            .eq('id', selectedReport.content_id);
        } else if (selectedReport.content_type === 'comment') {
          await supabase
            .from('post_comments')
            .update({ status: reviewAction === 'remove' ? 'deleted' : 'hidden' })
            .eq('id', selectedReport.content_id);
        }
      }

      toast({
        title: 'Success',
        description: 'Report reviewed successfully'
      });

      setShowReviewDialog(false);
      setSelectedReport(null);
      setReviewAction('');
      setReviewNotes('');
      loadData();

    } catch (error) {
      console.error('Error reviewing report:', error);
      toast({
        title: 'Error',
        description: 'Failed to review report',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickAction = async (postId: string, action: 'hide' | 'delete' | 'feature') => {
    try {
      if (action === 'feature') {
        await supabase
          .from('builder_posts')
          .update({ is_featured: true })
          .eq('id', postId);
      } else {
        await supabase
          .from('builder_posts')
          .update({ status: action === 'delete' ? 'deleted' : 'hidden' })
          .eq('id', postId);
      }

      toast({
        title: 'Success',
        description: `Post ${action}d successfully`
      });

      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} post`,
        variant: 'destructive'
      });
    }
  };

  const filteredReports = reports.filter(report => {
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (reasonFilter !== 'all' && report.reason !== reasonFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        report.reporter?.full_name?.toLowerCase().includes(query) ||
        report.description?.toLowerCase().includes(query) ||
        report.reason.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      spam: 'bg-yellow-100 text-yellow-800',
      harassment: 'bg-red-100 text-red-800',
      hate_speech: 'bg-red-100 text-red-800',
      violence: 'bg-red-100 text-red-800',
      nudity: 'bg-pink-100 text-pink-800',
      false_information: 'bg-orange-100 text-orange-800',
      scam: 'bg-purple-100 text-purple-800',
      copyright: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[reason] || colors.other;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'reviewing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Reviewing</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.pendingReports}</div>
                <div className="text-xs text-muted-foreground">Pending Reports</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalPosts}</div>
                <div className="text-xs text-muted-foreground">Total Posts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalStories}</div>
                <div className="text-xs text-muted-foreground">Active Stories</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.flaggedContent}</div>
                <div className="text-xs text-muted-foreground">Flagged Content</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.resolvedToday}</div>
                <div className="text-xs text-muted-foreground">Resolved Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="reports" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="h-4 w-4" />
              Reports ({reports.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <Video className="h-4 w-4" />
              All Posts
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2">
              <Clock className="h-4 w-4" />
              Stories
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content Reports</CardTitle>
                  <CardDescription>Review and moderate reported content</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={reasonFilter} onValueChange={setReasonFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reasons</SelectItem>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="hate_speech">Hate Speech</SelectItem>
                      <SelectItem value="violence">Violence</SelectItem>
                      <SelectItem value="false_information">False Info</SelectItem>
                      <SelectItem value="scam">Scam</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Loading reports...</div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reports found</h3>
                  <p className="text-muted-foreground">All clear! No content reports to review.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {report.content_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              #{report.content_id.slice(0, 8)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getReasonBadge(report.reason)}>
                            {report.reason.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {report.reporter?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{report.reporter?.full_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimeAgo(report.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowReviewDialog(true);
                            }}
                            disabled={report.status === 'resolved'}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle>All Builder Posts</CardTitle>
              <CardDescription>Manage and moderate builder video posts</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Loading posts...</div>
              ) : (
                <div className="grid gap-4">
                  {posts.slice(0, 20).map((post) => (
                    <div key={post.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      {/* Media Preview */}
                      <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {post.media_url ? (
                          post.post_type === 'video' ? (
                            <div className="relative w-full h-full">
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="h-6 w-6 text-white" fill="white" />
                              </div>
                            </div>
                          ) : (
                            <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-1">{post.caption || 'No caption'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{post.builder?.company_name || post.builder?.full_name}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(post.created_at)}</span>
                          <span>•</span>
                          <span>{post.likes_count} likes</span>
                        </div>
                      </div>

                      {/* Status */}
                      <Badge variant={post.status === 'active' ? 'default' : 'secondary'}>
                        {post.status}
                      </Badge>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleQuickAction(post.id, 'feature')}>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Feature Post
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleQuickAction(post.id, 'hide')}>
                            <Eye className="h-4 w-4 mr-2" />
                            Hide Post
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleQuickAction(post.id, 'delete')}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stories Tab */}
        <TabsContent value="stories">
          <Card>
            <CardHeader>
              <CardTitle>Active Stories</CardTitle>
              <CardDescription>Monitor builder stories (24-hour content)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Loading stories...</div>
              ) : stories.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active stories</h3>
                  <p className="text-muted-foreground">No stories are currently active.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {stories.map((story) => (
                    <div key={story.id} className="relative group">
                      <div className="aspect-[9/16] rounded-lg overflow-hidden bg-gray-100">
                        {story.media_type === 'video' ? (
                          <video src={story.media_url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                        
                        {/* Builder info */}
                        <div className="absolute top-2 left-2 right-2">
                          <p className="text-white text-xs font-medium truncate">
                            {story.builder?.company_name || story.builder?.full_name}
                          </p>
                        </div>

                        {/* Views */}
                        <div className="absolute bottom-2 left-2">
                          <span className="text-white text-xs flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {story.views_count}
                          </span>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            await supabase
                              .from('builder_stories')
                              .update({ is_active: false })
                              .eq('id', story.id);
                            loadData();
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Take action on this reported content
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Content Type</span>
                  <Badge variant="outline" className="capitalize">{selectedReport.content_type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Reason</span>
                  <Badge className={getReasonBadge(selectedReport.reason)}>
                    {selectedReport.reason.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Reported By</span>
                  <span className="text-sm">{selectedReport.reporter?.full_name}</span>
                </div>
                {selectedReport.description && (
                  <div>
                    <span className="text-sm font-medium">Description</span>
                    <p className="text-sm text-muted-foreground mt-1">{selectedReport.description}</p>
                  </div>
                )}
              </div>

              <div>
                <Label>Action</Label>
                <Select value={reviewAction} onValueChange={setReviewAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dismiss">Dismiss Report (No violation)</SelectItem>
                    <SelectItem value="warn">Warn User</SelectItem>
                    <SelectItem value="hide">Hide Content</SelectItem>
                    <SelectItem value="remove">Remove Content</SelectItem>
                    <SelectItem value="ban">Ban User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add notes about this review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReviewReport} disabled={processing || !reviewAction}>
              {processing ? 'Processing...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentModeration;
