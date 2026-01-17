import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { EnhancedVideoPlayer } from "@/components/builders/EnhancedVideoPlayer";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Award,
  Star,
  CheckCircle,
  Shield,
  Briefcase,
  Play,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  Users,
  FileText,
  ExternalLink,
  Share2,
  ArrowLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BuilderProfile {
  id: string;
  full_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  location?: string;
  description?: string;
  specialties?: string[];
  years_experience?: number;
  portfolio_url?: string;
  insurance_details?: string;
  registration_number?: string;
  license_number?: string;
  avatar_url?: string;
  company_logo_url?: string;
  approved?: boolean;
  created_at?: string;
  builder_category?: string;
}

interface BuilderVideo {
  id: string;
  builder_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  project_type: string | null;
  project_location: string | null;
  project_duration: string | null;
  project_cost_range: string | null;
  views_count: number;
  likes_count: number;
  dislikes_count?: number;
  comments_count: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
}

interface BuilderStats {
  totalProjects: number;
  totalViews: number;
  totalLikes: number;
  avgRating: number;
}

const PublicBuilderProfile = () => {
  const { builderId } = useParams<{ builderId: string }>();
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [videos, setVideos] = useState<BuilderVideo[]>([]);
  const [stats, setStats] = useState<BuilderStats>({
    totalProjects: 0,
    totalViews: 0,
    totalLikes: 0,
    avgRating: 4.8
  });
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<BuilderVideo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (builderId) {
      fetchBuilderProfile();
      fetchBuilderVideos();
    }
  }, [builderId]);

  const fetchBuilderProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', builderId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching builder profile:', error);
      toast({
        title: "Error",
        description: "Failed to load builder profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBuilderVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('builder_videos')
        .select('*')
        .eq('builder_id', builderId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Videos not available:', error.message);
        return;
      }

      setVideos(data || []);

      // Calculate stats
      if (data && data.length > 0) {
        const totalViews = data.reduce((sum, v) => sum + (v.views_count || 0), 0);
        const totalLikes = data.reduce((sum, v) => sum + (v.likes_count || 0), 0);
        setStats({
          totalProjects: data.length,
          totalViews,
          totalLikes,
          avgRating: 4.8
        });
      }
    } catch (error) {
      console.warn('Error fetching videos:', error);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.company_name || profile?.full_name} - Professional Builder`,
          text: `Check out ${profile?.company_name || profile?.full_name} on MradiPro`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Profile link has been copied to clipboard',
      });
    }
  };

  const handleVideoClick = (video: BuilderVideo) => {
    setSelectedVideo({
      ...video,
      builder_profile: {
        full_name: profile?.full_name || '',
        company_name: profile?.company_name || '',
        avatar_url: profile?.avatar_url
      }
    } as any);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Builder Not Found</h1>
          <p className="text-muted-foreground mb-6">The builder profile you're looking for doesn't exist.</p>
          <Link to="/builders">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builders
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navigation />

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="container mx-auto px-4 py-12 relative">
          {/* Back Button */}
          <Link to="/builders" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Builders Directory
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Image */}
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-white/20 shadow-2xl">
                <AvatarImage src={profile.avatar_url || profile.company_logo_url} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {(profile.company_name || profile.full_name)?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {profile.approved && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-2 border-white">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">
                  {profile.company_name || profile.full_name}
                </h1>
                {profile.approved && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              {profile.company_name && (
                <p className="text-white/80 mb-3">{profile.full_name}</p>
              )}

              <div className="flex flex-wrap gap-4 text-white/80 mb-4">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
                {profile.years_experience && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {profile.years_experience} years experience
                  </div>
                )}
                {profile.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Member since {new Date(profile.created_at).getFullYear()}
                  </div>
                )}
              </div>

              {/* Specialties */}
              {profile.specialties && profile.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.slice(0, 5).map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="bg-white/10 text-white border-white/20">
                      {specialty}
                    </Badge>
                  ))}
                  {profile.specialties.length > 5 && (
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                      +{profile.specialties.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button className="bg-white text-blue-900 hover:bg-gray-100">
                <Phone className="h-4 w-4 mr-2" />
                Contact Builder
              </Button>
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Profile
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <div className="text-sm text-white/70">Project Videos</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <div className="text-sm text-white/70">Total Views</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalLikes}</div>
              <div className="text-sm text-white/70">Total Likes</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                {stats.avgRating}
              </div>
              <div className="text-sm text-white/70">Average Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="bg-white shadow-sm border">
            <TabsTrigger value="videos" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Play className="h-4 w-4 mr-2" />
              Project Videos
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              About
            </TabsTrigger>
            <TabsTrigger value="credentials" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Award className="h-4 w-4 mr-2" />
              Credentials
            </TabsTrigger>
          </TabsList>

          {/* Videos Tab */}
          <TabsContent value="videos">
            {videos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Play className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Videos Yet</h3>
                  <p className="text-muted-foreground">
                    This builder hasn't uploaded any project videos yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <Card 
                    key={video.id} 
                    className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => handleVideoClick(video)}
                  >
                    {/* Video Thumbnail */}
                    <div className="relative aspect-video bg-gray-900">
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
                        />
                      )}
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                          <Play className="h-8 w-8 text-blue-600 ml-1" />
                        </div>
                      </div>
                      {/* Duration/Featured Badge */}
                      {video.is_featured && (
                        <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      )}
                      {video.project_type && (
                        <Badge className="absolute top-2 right-2 bg-black/60 text-white">
                          {video.project_type}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {video.title}
                      </h3>
                      
                      {video.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {video.description}
                        </p>
                      )}

                      {/* Video Meta */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {video.project_location && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {video.project_location}
                          </Badge>
                        )}
                        {video.project_duration && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {video.project_duration}
                          </Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {video.views_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {video.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {video.comments_count || 0}
                          </span>
                        </div>
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Description */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>About {profile.company_name || profile.full_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.description ? (
                    <p className="text-muted-foreground whitespace-pre-wrap">{profile.description}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No description provided.</p>
                  )}

                  {/* Specialties */}
                  {profile.specialties && profile.specialties.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Specialties</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.specialties.map((specialty, index) => (
                          <Badge key={index} variant="secondary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{profile.location}, Kenya</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{profile.phone}</p>
                      </div>
                    </div>
                  )}

                  {profile.portfolio_url && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a 
                          href={profile.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  <Button className="w-full mt-4">
                    <Phone className="h-4 w-4 mr-2" />
                    Contact Builder
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Experience */}
              {profile.years_experience && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Briefcase className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{profile.years_experience} Years</p>
                        <p className="text-sm text-muted-foreground">Industry Experience</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Registration */}
              {profile.registration_number && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <Shield className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold">{profile.registration_number}</p>
                        <p className="text-sm text-muted-foreground">NCA Registration</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* License */}
              {profile.license_number && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <Award className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold">{profile.license_number}</p>
                        <p className="text-sm text-muted-foreground">Business License</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Insurance */}
              {profile.insurance_details && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 rounded-xl">
                        <FileText className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold">Insured</p>
                        <p className="text-sm text-muted-foreground">{profile.insurance_details}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Verified Badge */}
              {profile.approved && (
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500 rounded-xl">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-green-800">Verified Builder</p>
                        <p className="text-sm text-green-600">Identity & credentials verified by MradiPro</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <EnhancedVideoPlayer
          video={selectedVideo as any}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onVideoUpdate={fetchBuilderVideos}
        />
      )}

      <Footer />
    </div>
  );
};

export default PublicBuilderProfile;

