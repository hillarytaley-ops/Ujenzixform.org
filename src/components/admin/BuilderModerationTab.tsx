import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, 
  Check, 
  X, 
  Eye, 
  Clock, 
  RefreshCw, 
  Users, 
  Shield, 
  MessageSquare, 
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Ban,
  UserCheck,
  Building2,
  MapPin,
  Star,
  FileText,
  TrendingUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminVideoApproval } from "./AdminVideoApproval";

interface BuilderProfile {
  id: string;
  user_id: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  bio?: string;
  is_verified?: boolean;
  is_professional?: boolean;
  specialties?: string[];
  years_experience?: number;
  total_projects?: number;
  rating?: number;
  created_at: string;
  updated_at?: string;
}

interface BuilderPost {
  id: string;
  builder_id: string;
  caption?: string;
  media_url?: string;
  location?: string;
  status: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  builder_name?: string;
  builder_avatar?: string;
}

interface ReportedContent {
  id: string;
  content_type: 'post' | 'comment' | 'profile';
  content_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  reporter_name?: string;
  content_preview?: string;
}

export function BuilderModerationTab() {
  const [activeSubTab, setActiveSubTab] = useState('videos');
  const [builders, setBuilders] = useState<BuilderProfile[]>([]);
  const [posts, setPosts] = useState<BuilderPost[]>([]);
  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [postStatusFilter, setPostStatusFilter] = useState<'all' | 'active' | 'hidden' | 'reported'>('all');
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderProfile | null>(null);
  const [selectedPost, setSelectedPost] = useState<BuilderPost | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    totalBuilders: 0,
    verifiedBuilders: 0,
    pendingVerification: 0,
    totalPosts: 0,
    activePosts: 0,
    reportedContent: 0
  });

  useEffect(() => {
    if (activeSubTab === 'profiles') {
      fetchBuilders();
    } else if (activeSubTab === 'posts') {
      fetchPosts();
    } else if (activeSubTab === 'reports') {
      fetchReports();
    }
    fetchStats();
  }, [activeSubTab, verificationFilter, postStatusFilter]);

  const fetchStats = async () => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'professional_builder');

      const builderUserIds = (roleData || []).map(r => r.user_id).filter(Boolean);

      if (builderUserIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, user_id, is_verified')
          .in('user_id', builderUserIds);

        if (profilesErr) {
          if (profilesErr.message?.includes('is_verified') || profilesErr.code === '42703') {
            const { data: fallbackData } = await supabase
              .from('profiles')
              .select('id, user_id')
              .in('user_id', builderUserIds);
            setStats(prev => ({
              ...prev,
              totalBuilders: fallbackData?.length || 0,
              verifiedBuilders: 0,
              pendingVerification: fallbackData?.length || 0
            }));
          } else {
            console.warn('Builder stats: profiles fetch failed', profilesErr);
          }
        } else {
          const verified = (profilesData || []).filter(p => p.is_verified).length;
          setStats(prev => ({
            ...prev,
            totalBuilders: profilesData?.length || 0,
            verifiedBuilders: verified,
            pendingVerification: (profilesData?.length || 0) - verified
          }));
        }
      }

      // Get post counts
      const { data: postsData } = await supabase
        .from('builder_posts')
        .select('status');

      if (postsData) {
        const active = postsData.filter(p => p.status === 'active').length;
        const reported = postsData.filter(p => p.status === 'reported').length;
        
        setStats(prev => ({
          ...prev,
          totalPosts: postsData.length,
          activePosts: active,
          reportedContent: reported
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBuilders = async () => {
    setLoading(true);
    try {
      // Get professional builder user IDs
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'professional_builder');

      const builderUserIds = (roleData || []).map(r => r.user_id);

      if (builderUserIds.length === 0) {
        setBuilders([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('profiles')
        .select('*')
        .in('user_id', builderUserIds)
        .order('created_at', { ascending: false });

      if (verificationFilter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (verificationFilter === 'unverified') {
        query = query.or('is_verified.is.null,is_verified.eq.false');
      }

      let { data, error } = await query;
      if (error && (error.message?.includes('is_verified') || (error as { code?: string }).code === '42703')) {
        query = supabase
          .from('profiles')
          .select('*')
          .in('user_id', builderUserIds)
          .order('created_at', { ascending: false });
        const res = await query;
        data = res.data;
        error = res.error;
      }
      if (error) throw error;

      // Apply search filter
      let filtered = data || [];
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter(b => 
          b.full_name?.toLowerCase().includes(search) ||
          b.company_name?.toLowerCase().includes(search) ||
          b.location?.toLowerCase().includes(search)
        );
      }

      setBuilders(filtered);
    } catch (error) {
      console.error('Error fetching builders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch builders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('builder_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postStatusFilter !== 'all') {
        query = query.eq('status', postStatusFilter);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          setPosts([]);
          return;
        }
        throw error;
      }

      const builderIds = [...new Set((data || []).map(p => p.builder_id).filter(Boolean))];
      let profilesMap = new Map<string, { user_id?: string; full_name?: string; avatar_url?: string }>();
      if (builderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, avatar_url')
          .or(`user_id.in.(${builderIds.join(',')}),id.in.(${builderIds.join(',')})`);
        (profiles || []).forEach(p => {
          const key = p.user_id ?? p.id;
          if (key) profilesMap.set(key, p);
        });
      }

      const postsWithBuilders = (data || []).map(post => {
        const prof = profilesMap.get(post.builder_id);
        return {
          ...post,
          builder_name: prof?.full_name || 'Unknown',
          builder_avatar: prof?.avatar_url
        };
      });

      setPosts(postsWithBuilders);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      // For now, show posts with 'reported' status as reported content
      const { data, error } = await supabase
        .from('builder_posts')
        .select('*')
        .eq('status', 'reported')
        .order('created_at', { ascending: false });

      if (error) {
        setReports([]);
        return;
      }

      const reportedContent = (data || []).map(post => ({
        id: post.id,
        content_type: 'post' as const,
        content_id: post.id,
        reporter_id: '',
        reason: 'Flagged for review',
        status: 'pending' as const,
        created_at: post.created_at,
        content_preview: post.caption?.substring(0, 100) || 'No caption'
      }));

      setReports(reportedContent);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBuilder = async (builderId: string, verify: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: verify, updated_at: new Date().toISOString() })
        .eq('id', builderId);

      if (error) {
        if (error.message?.includes('is_verified') || (error as { code?: string }).code === '42703') {
          toast({
            title: "Database Update Required",
            description: "Run the migration in supabase/RUN_THESE_MIGRATIONS.sql to add profiles.is_verified.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: verify ? "Builder Verified!" : "Verification Removed",
        description: verify 
          ? "The builder is now verified and will display a verified badge."
          : "The builder's verification has been removed."
      });

      fetchBuilders();
      fetchStats();
      setShowVerifyDialog(false);
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive"
      });
    }
  };

  const handlePostAction = async (postId: string, action: 'approve' | 'hide' | 'delete') => {
    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('builder_posts')
          .delete()
          .eq('id', postId);

        if (error) throw error;
        toast({ title: "Post Deleted", description: "The post has been permanently removed." });
      } else {
        const status = action === 'approve' ? 'active' : 'hidden';
        const { error } = await supabase
          .from('builder_posts')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', postId);

        if (error) throw error;
        toast({ 
          title: action === 'approve' ? "Post Approved" : "Post Hidden",
          description: action === 'approve' 
            ? "The post is now visible to the public."
            : "The post has been hidden from public view."
        });
      }

      fetchPosts();
      fetchStats();
      setShowPostDialog(false);
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-blue-900/30 border-blue-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalBuilders}</p>
                <p className="text-xs text-blue-300">Total Builders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-900/30 border-green-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.verifiedBuilders}</p>
                <p className="text-xs text-green-300">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-yellow-900/30 border-yellow-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.pendingVerification}</p>
                <p className="text-xs text-yellow-300">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-900/30 border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Video className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
                <p className="text-xs text-purple-300">Total Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-cyan-900/30 border-cyan-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.activePosts}</p>
                <p className="text-xs text-cyan-300">Active Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-900/30 border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Flag className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.reportedContent}</p>
                <p className="text-xs text-red-300">Reported</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/60">
          <TabsTrigger value="videos" className="data-[state=active]:bg-orange-600">
            <Video className="h-4 w-4 mr-2" />
            Video Approval
          </TabsTrigger>
          <TabsTrigger value="profiles" className="data-[state=active]:bg-blue-600">
            <UserCheck className="h-4 w-4 mr-2" />
            Profile Verification
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-purple-600">
            <FileText className="h-4 w-4 mr-2" />
            Posts Moderation
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-red-600">
            <Flag className="h-4 w-4 mr-2" />
            Reported Content
          </TabsTrigger>
        </TabsList>

        {/* Video Approval Tab - Reuse existing component */}
        <TabsContent value="videos" className="mt-6">
          <Card className="bg-slate-800/40 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-orange-400" />
                Builder Video Approval
              </CardTitle>
              <CardDescription className="text-gray-400">
                Review and approve builder portfolio videos before they are visible to the public
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <AdminVideoApproval />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Verification Tab */}
        <TabsContent value="profiles" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search builders by name, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Select value={verificationFilter} onValueChange={(v) => setVerificationFilter(v as any)}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Builders</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified Only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchBuilders} variant="outline" className="border-slate-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Builders List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : builders.length === 0 ? (
            <Card className="bg-slate-800/40 border-slate-700/50">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No builders found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {builders.map((builder) => (
                <Card key={builder.id} className="bg-slate-800/40 border-slate-700/50 hover:border-slate-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Cover & Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-12 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600">
                          {builder.cover_photo_url && (
                            <img src={builder.cover_photo_url} alt="Cover" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <Avatar className="absolute -bottom-2 left-2 h-10 w-10 border-2 border-slate-800">
                          <AvatarImage src={builder.avatar_url} />
                          <AvatarFallback className="bg-blue-600 text-white text-sm">
                            {getInitials(builder.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white truncate">
                            {builder.company_name || builder.full_name}
                          </h3>
                          {builder.is_verified && (
                            <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{builder.full_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {builder.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {builder.location}
                            </span>
                          )}
                          {builder.years_experience && (
                            <span>{builder.years_experience}+ years</span>
                          )}
                          {builder.specialties && builder.specialties.length > 0 && (
                            <span>{builder.specialties.length} specialties</span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge className={builder.is_verified 
                        ? "bg-green-500/20 text-green-400 border-green-500/30" 
                        : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }>
                        {builder.is_verified ? 'Verified' : 'Unverified'}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={builder.is_verified ? "outline" : "default"}
                          className={builder.is_verified 
                            ? "border-red-500/50 text-red-400 hover:bg-red-500/20" 
                            : "bg-green-600 hover:bg-green-700"
                          }
                          onClick={() => {
                            setSelectedBuilder(builder);
                            setShowVerifyDialog(true);
                          }}
                        >
                          {builder.is_verified ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Unverify
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Verify
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400">
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend Builder
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Posts Moderation Tab */}
        <TabsContent value="posts" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={postStatusFilter} onValueChange={(v) => setPostStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posts</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchPosts} variant="outline" className="border-slate-600">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="bg-slate-800/40 border-slate-700/50">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">No posts found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <Card key={post.id} className="bg-slate-800/40 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Media Preview */}
                      <div className="w-24 h-24 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                        {post.media_url ? (
                          <video src={post.media_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={post.builder_avatar} />
                            <AvatarFallback className="text-xs">
                              {getInitials(post.builder_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-white">{post.builder_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">{post.caption || 'No caption'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{post.likes_count} likes</span>
                          <span>{post.comments_count} comments</span>
                          {post.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {post.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge className={
                        post.status === 'active' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        post.status === 'hidden' ? "bg-gray-500/20 text-gray-400 border-gray-500/30" :
                        post.status === 'reported' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }>
                        {post.status}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {post.status !== 'active' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handlePostAction(post.id, 'approve')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {post.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                            onClick={() => handlePostAction(post.id, 'hide')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Hide
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          onClick={() => handlePostAction(post.id, 'delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reported Content Tab */}
        <TabsContent value="reports" className="mt-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-red-400" />
            </div>
          ) : reports.length === 0 ? (
            <Card className="bg-slate-800/40 border-slate-700/50">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-gray-400">No reported content - all clear!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="bg-red-900/20 border-red-800/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Flag className="h-8 w-8 text-red-400 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-red-400 border-red-500/30">
                            {report.content_type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{report.content_preview}</p>
                        <p className="text-xs text-red-400 mt-1">Reason: {report.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Check className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/50 text-red-400">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove Content
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedBuilder?.is_verified ? 'Remove Verification' : 'Verify Builder'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedBuilder?.is_verified 
                ? `Are you sure you want to remove verification from ${selectedBuilder?.company_name || selectedBuilder?.full_name}?`
                : `Verify ${selectedBuilder?.company_name || selectedBuilder?.full_name} as a trusted professional builder?`
              }
            </DialogDescription>
          </DialogHeader>
          {selectedBuilder && (
            <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedBuilder.avatar_url} />
                <AvatarFallback className="bg-blue-600 text-white">
                  {getInitials(selectedBuilder.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-white">{selectedBuilder.company_name || selectedBuilder.full_name}</p>
                <p className="text-sm text-gray-400">{selectedBuilder.location}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button
              className={selectedBuilder?.is_verified ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              onClick={() => selectedBuilder && handleVerifyBuilder(selectedBuilder.id, !selectedBuilder.is_verified)}
            >
              {selectedBuilder?.is_verified ? 'Remove Verification' : 'Verify Builder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BuilderModerationTab;
