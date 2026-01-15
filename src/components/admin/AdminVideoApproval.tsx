import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Video, Check, X, Eye, Clock, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BuilderVideo {
  id: string;
  builder_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  builder_name?: string;
  builder_email?: string;
}

export function AdminVideoApproval() {
  const [videos, setVideos] = useState<BuilderVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<BuilderVideo | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { toast } = useToast();

  const fetchVideos = async () => {
    setLoading(true);
    try {
      // Note: builder_videos table may not exist yet - handle gracefully
      // Fetch videos without join (profiles table doesn't have proper FK relationship)
      let query = supabase
        .from('builder_videos' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      // If table doesn't exist, just show empty state
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('builder_videos table not yet created - showing empty state');
          setVideos([]);
          return;
        }
        throw error;
      }

      // Fetch builder names separately if we have videos
      let profilesMap: Record<string, string> = {};
      if (data && data.length > 0) {
        const builderIds = [...new Set(data.map((v: any) => v.builder_id).filter(Boolean))];
        if (builderIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, user_id, full_name')
            .in('id', builderIds);
          
          if (profilesData) {
            profilesData.forEach((p: any) => {
              profilesMap[p.id] = p.full_name || 'Unknown';
              if (p.user_id) profilesMap[p.user_id] = p.full_name || 'Unknown';
            });
          }
        }
      }

      const formattedVideos = (data || []).map((video: any) => ({
        ...video,
        builder_name: profilesMap[video.builder_id] || 'Unknown Builder',
        builder_email: '' // Email not available in profiles table
      }));

      setVideos(formattedVideos);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      // Don't show error toast for missing table - just show empty state
      if (!error.message?.includes('does not exist')) {
        toast({
          title: "Error",
          description: "Failed to fetch videos",
          variant: "destructive"
        });
      }
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [filter]);

  const handleApprove = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('builder_videos')
        .update({ status: 'approved' })
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video Approved",
        description: "The video has been approved and is now visible to the public.",
      });

      fetchVideos();
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

  const handleReject = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('builder_videos')
        .update({ status: 'rejected' })
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video Rejected",
        description: "The video has been rejected.",
      });

      fetchVideos();
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
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
        <Button variant="outline" onClick={fetchVideos} className="ml-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : videos.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-12 text-center">
            <Video className="w-12 h-12 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No {filter !== 'all' ? filter : ''} videos found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="bg-gray-800/50 border-gray-700 hover:border-orange-500/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">{video.title}</CardTitle>
                    <CardDescription className="text-gray-400">
                      By {video.builder_name}
                    </CardDescription>
                  </div>
                  {getStatusBadge(video.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {video.thumbnail_url && (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <p className="text-gray-300 text-sm line-clamp-2">{video.description}</p>
                <p className="text-gray-500 text-xs">
                  Submitted: {new Date(video.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedVideo(video)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {video.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(video.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReject(video.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedVideo?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Submitted by {selectedVideo?.builder_name} ({selectedVideo?.builder_email})
            </DialogDescription>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video 
                  src={selectedVideo.video_url} 
                  controls 
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-gray-300">{selectedVideo.description}</p>
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedVideo.status)}
                {selectedVideo.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(selectedVideo.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleReject(selectedVideo.id)}
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

