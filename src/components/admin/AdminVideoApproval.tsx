import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Video, Check, X, Eye, Clock, RefreshCw, Play, FileVideo } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';

interface VideoItem {
  id: string;
  builder_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'active' | 'approved' | 'rejected';
  created_at: string;
  builder_name?: string;
  builder_email?: string;
  source: 'posts' | 'portfolio';
}

export function AdminVideoApproval() {
  const [posts, setPosts] = useState<VideoItem[]>([]);
  const [portfolioVideos, setPortfolioVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [activeTab, setActiveTab] = useState<'posts' | 'portfolio'>('posts');
  const { toast } = useToast();

  const getAccessToken = () => {
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        return parsed.access_token || '';
      }
    } catch (e) {}
    return '';
  };

  const fetchPosts = async () => {
    try {
      const accessToken = getAccessToken();
      
      // Build query for posts with videos
      let url = `${SUPABASE_URL}/rest/v1/builder_posts?video_url=not.is.null&order=created_at.desc`;
      if (filter !== 'all') {
        const statusValue = filter === 'approved' ? 'active' : filter;
        url += `&status=eq.${statusValue}`;
      }
      
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        }
      });
      
      if (!res.ok) {
        console.log('builder_posts fetch error');
        setPosts([]);
        return;
      }
      
      const data = await res.json();
      
      // Fetch builder profiles
      const builderIds = [...new Set((data || []).map((p: any) => p.builder_id))];
      let profilesMap: Record<string, { name: string; email: string }> = {};
      
      if (builderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .or(`user_id.in.(${builderIds.join(',')}),id.in.(${builderIds.join(',')})`);
        (profilesData || []).forEach((p: any) => {
          const key = p.user_id ?? p.id;
          if (key) profilesMap[key] = { name: p.full_name || 'Unknown', email: p.email || '' };
        });
      }

      const formattedPosts: VideoItem[] = (data || []).map((post: any) => ({
        id: post.id,
        builder_id: post.builder_id,
        title: post.project_name || post.content?.substring(0, 50) || 'Video Post',
        description: post.content || '',
        video_url: post.video_url,
        thumbnail_url: post.thumbnail_url,
        status: post.status === 'active' ? 'approved' : post.status,
        created_at: post.created_at,
        builder_name: profilesMap[post.builder_id]?.name || 'Unknown Builder',
        builder_email: profilesMap[post.builder_id]?.email || '',
        source: 'posts' as const
      }));
      
      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    }
  };

  const fetchPortfolioVideos = async () => {
    try {
      const accessToken = getAccessToken();
      
      // Build query for portfolio videos
      let url = `${SUPABASE_URL}/rest/v1/builder_videos?order=created_at.desc`;
      
      // builder_videos uses is_published (boolean), not status
      // For filter: pending = is_published is null or false, approved = is_published true
      if (filter === 'pending') {
        url += `&or=(is_published.is.null,is_published.eq.false)`;
      } else if (filter === 'approved') {
        url += `&is_published=eq.true`;
      }
      // For 'rejected' and 'all', we'd need a status column - for now show all
      
      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        }
      });
      
      if (!res.ok) {
        console.log('builder_videos fetch error');
        setPortfolioVideos([]);
        return;
      }
      
      const data = await res.json();
      
      // Fetch builder profiles
      const builderIds = [...new Set((data || []).map((v: any) => v.builder_id))];
      let profilesMap: Record<string, { name: string; email: string }> = {};
      
      if (builderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .or(`user_id.in.(${builderIds.join(',')}),id.in.(${builderIds.join(',')})`);
        (profilesData || []).forEach((p: any) => {
          const key = p.user_id ?? p.id;
          if (key) profilesMap[key] = { name: p.full_name || 'Unknown', email: p.email || '' };
        });
      }
      
      const formattedVideos: VideoItem[] = (data || []).map((video: any) => ({
        id: video.id,
        builder_id: video.builder_id,
        title: video.title || 'Portfolio Video',
        description: video.description || '',
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url,
        status: video.is_published === true ? 'approved' : 'pending',
        created_at: video.created_at,
        builder_name: profilesMap[video.builder_id]?.name || 'Unknown Builder',
        builder_email: profilesMap[video.builder_id]?.email || '',
        source: 'portfolio' as const
      }));
      
      setPortfolioVideos(formattedVideos);
    } catch (error) {
      console.error('Error fetching portfolio videos:', error);
      setPortfolioVideos([]);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchPortfolioVideos()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [filter]);

  const handleApprove = async (video: VideoItem) => {
    try {
      const accessToken = getAccessToken();
      
      if (video.source === 'posts') {
        // Update builder_posts status to 'active' (which means approved)
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/builder_posts?id=eq.${video.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'active' })
          }
        );
        if (!res.ok) throw new Error('Failed to update post');
      } else {
        // Update builder_videos is_published to true
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/builder_videos?id=eq.${video.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_published: true })
          }
        );
        if (!res.ok) throw new Error('Failed to update video');
      }

      toast({
        title: "✅ Video Approved",
        description: "The video is now visible to the public.",
      });

      fetchAll();
      setSelectedVideo(null);
    } catch (error) {
      console.error('Error approving video:', error);
      toast({
        title: "Error",
        description: "Failed to approve video",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (video: VideoItem) => {
    try {
      const accessToken = getAccessToken();
      
      if (video.source === 'posts') {
        // Update builder_posts status to 'rejected'
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/builder_posts?id=eq.${video.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'rejected' })
          }
        );
        if (!res.ok) throw new Error('Failed to update post');
      } else {
        // Update builder_videos is_published to false
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/builder_videos?id=eq.${video.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_published: false })
          }
        );
        if (!res.ok) throw new Error('Failed to update video');
      }

      toast({
        title: "Video Rejected",
        description: "The video has been rejected and won't be shown publicly.",
      });

      fetchAll();
      setSelectedVideo(null);
    } catch (error) {
      console.error('Error rejecting video:', error);
      toast({
        title: "Error",
        description: "Failed to reject video",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'active':
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/50"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/20 text-red-600 border-red-500/50"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const VideoCard = ({ video }: { video: VideoItem }) => (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-500/50 transition-colors shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-gray-900 dark:text-white text-lg truncate">{video.title}</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              By {video.builder_name}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(video.status)}
            <Badge variant="outline" className="text-xs">
              {video.source === 'posts' ? <FileVideo className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
              {video.source === 'posts' ? 'Feed Post' : 'Portfolio'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 group cursor-pointer" onClick={() => setSelectedVideo(video)}>
          {video.thumbnail_url ? (
            <img 
              src={video.thumbnail_url} 
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <video 
              src={video.video_url} 
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{video.description || 'No description'}</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs">
          Submitted: {new Date(video.created_at).toLocaleDateString()} at {new Date(video.created_at).toLocaleTimeString()}
        </p>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedVideo(video)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          {(video.status === 'pending') && (
            <>
              <Button 
                size="sm" 
                onClick={() => handleApprove(video)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleReject(video)}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const currentVideos = activeTab === 'posts' ? posts : portfolioVideos;
  const pendingPostsCount = posts.filter(v => v.status === 'pending').length;
  const pendingPortfolioCount = portfolioVideos.filter(v => v.status === 'pending').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Video Approvals</h2>
          <p className="text-gray-500 dark:text-gray-400">Review and approve builder video content</p>
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs for Posts vs Portfolio */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'posts' | 'portfolio')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="posts" className="relative">
            <FileVideo className="w-4 h-4 mr-2" />
            Feed Posts
            {pendingPostsCount > 0 && (
              <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5">{pendingPostsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="relative">
            <Video className="w-4 h-4 mr-2" />
            Portfolio Videos
            {pendingPortfolioCount > 0 && (
              <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0.5">{pendingPortfolioCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              size="sm"
              className={filter === f ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              {f === 'pending' && <Clock className="w-3 h-3 mr-1" />}
              {f === 'approved' && <Check className="w-3 h-3 mr-1" />}
              {f === 'rejected' && <X className="w-3 h-3 mr-1" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        <TabsContent value="posts" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <CardContent className="py-12 text-center">
                <FileVideo className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No {filter !== 'all' ? filter : ''} feed posts with videos found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : portfolioVideos.length === 0 ? (
            <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <CardContent className="py-12 text-center">
                <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No {filter !== 'all' ? filter : ''} portfolio videos found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
            <DialogDescription>
              Submitted by {selectedVideo?.builder_name} • {selectedVideo?.source === 'posts' ? 'Feed Post' : 'Portfolio Video'}
            </DialogDescription>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video 
                  src={selectedVideo.video_url} 
                  controls 
                  autoPlay
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{selectedVideo.description || 'No description provided'}</p>
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedVideo.status)}
                {selectedVideo.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(selectedVideo)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleReject(selectedVideo)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
