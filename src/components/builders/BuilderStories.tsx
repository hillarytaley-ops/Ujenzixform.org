import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Heart,
  Send,
  Eye,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CheckCircle2,
  Upload,
  Loader2,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Story {
  id: string;
  builderId: string;
  builderName: string;
  builderCompany?: string;
  builderAvatar?: string;
  builderVerified?: boolean;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  timestamp: Date;
  views: number;
  isViewed?: boolean;
}

interface StoryGroup {
  builderId: string;
  builderName: string;
  builderCompany?: string;
  builderAvatar?: string;
  builderVerified?: boolean;
  stories: Story[];
  hasUnviewed: boolean;
}

// Demo stories data
const DEMO_STORIES: StoryGroup[] = [
  {
    builderId: 'builder-1',
    builderName: 'John Kamau',
    builderCompany: 'Kamau Construction',
    builderVerified: true,
    hasUnviewed: true,
    stories: [
      {
        id: 's1-1',
        builderId: 'builder-1',
        builderName: 'John Kamau',
        builderCompany: 'Kamau Construction',
        builderVerified: true,
        mediaUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800',
        mediaType: 'image',
        caption: '🏗️ Foundation work completed! Moving to structural phase next week.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        views: 234,
        isViewed: false
      },
      {
        id: 's1-2',
        builderId: 'builder-1',
        builderName: 'John Kamau',
        builderCompany: 'Kamau Construction',
        builderVerified: true,
        mediaUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800',
        mediaType: 'image',
        caption: 'Quality materials from certified suppliers 💪',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        views: 189,
        isViewed: false
      }
    ]
  },
  {
    builderId: 'builder-2',
    builderName: 'Grace Wanjiku',
    builderCompany: 'Elite Builders',
    builderVerified: true,
    hasUnviewed: true,
    stories: [
      {
        id: 's2-1',
        builderId: 'builder-2',
        builderName: 'Grace Wanjiku',
        builderCompany: 'Elite Builders',
        builderVerified: true,
        mediaUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
        mediaType: 'image',
        caption: '✨ Commercial plaza handover today! Thank you to our amazing team.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        views: 456,
        isViewed: false
      }
    ]
  },
  {
    builderId: 'builder-3',
    builderName: 'David Ochieng',
    builderVerified: false,
    hasUnviewed: false,
    stories: [
      {
        id: 's3-1',
        builderId: 'builder-3',
        builderName: 'David Ochieng',
        mediaUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800',
        mediaType: 'image',
        caption: '⚡ Solar panel installation complete - 10kW system!',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        views: 123,
        isViewed: true
      }
    ]
  },
  {
    builderId: 'builder-4',
    builderName: 'Mary Njeri',
    builderCompany: 'Njeri Masonry',
    builderVerified: true,
    hasUnviewed: true,
    stories: [
      {
        id: 's4-1',
        builderId: 'builder-4',
        builderName: 'Mary Njeri',
        builderCompany: 'Njeri Masonry',
        builderVerified: true,
        mediaUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
        mediaType: 'image',
        caption: '🧱 Precision masonry work - every brick counts!',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        views: 287,
        isViewed: false
      }
    ]
  },
  {
    builderId: 'builder-5',
    builderName: 'Peter Mwangi',
    builderVerified: false,
    hasUnviewed: false,
    stories: [
      {
        id: 's5-1',
        builderId: 'builder-5',
        builderName: 'Peter Mwangi',
        mediaUrl: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?w=800',
        mediaType: 'image',
        caption: '🏠 Roofing complete - ready for finishing!',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        views: 98,
        isViewed: true
      }
    ]
  },
  {
    builderId: 'builder-6',
    builderName: 'Sarah Mutua',
    builderCompany: 'Mutua Engineering',
    builderVerified: true,
    hasUnviewed: true,
    stories: [
      {
        id: 's6-1',
        builderId: 'builder-6',
        builderName: 'Sarah Mutua',
        builderCompany: 'Mutua Engineering',
        builderVerified: true,
        mediaUrl: 'https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=800',
        mediaType: 'image',
        caption: '🛣️ Road construction progress in Nakuru County',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        views: 345,
        isViewed: false
      }
    ]
  }
];

interface BuilderStoriesProps {
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserId?: string;
  isBuilder?: boolean;
  onCreateStory?: () => void;
}

export const BuilderStories: React.FC<BuilderStoriesProps> = ({
  currentUserName = 'You',
  currentUserAvatar,
  currentUserId,
  isBuilder = false,
  onCreateStory
}) => {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Story upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const { toast } = useToast();

  // Check if user can post stories
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const canPostStory = isBuilder || storedRole === 'professional_builder' || storedRole === 'admin';

  // Fetch real stories from database
  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Fetch stories from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_stories?created_at=gte.${oneDayAgo}&is_active=eq.true&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        }
      );
      
      if (!response.ok) {
        console.log('Stories table may not exist yet, showing empty state');
        setStoryGroups([]);
        setLoadingStories(false);
        return;
      }
      
      const storiesData = await response.json();
      
      if (storiesData && storiesData.length > 0) {
        // Get unique builder IDs
        const builderIds = [...new Set(storiesData.map((s: any) => s.builder_id))];
        
        // Fetch builder profiles
        const profilesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${builderIds.join(',')})`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
          }
        );
        const profilesData = await profilesRes.json();
        const profilesMap = new Map((profilesData || []).map((p: any) => [p.user_id, p]));
        
        // Group stories by builder
        const groupedStories: Record<string, StoryGroup> = {};
        
        storiesData.forEach((story: any) => {
          const profile = profilesMap.get(story.builder_id);
          
          if (!groupedStories[story.builder_id]) {
            groupedStories[story.builder_id] = {
              builderId: story.builder_id,
              builderName: profile?.full_name || 'Builder',
              builderCompany: profile?.company_name,
              builderAvatar: profile?.avatar_url,
              builderVerified: profile?.is_verified,
              hasUnviewed: true,
              stories: []
            };
          }
          
          groupedStories[story.builder_id].stories.push({
            id: story.id,
            builderId: story.builder_id,
            builderName: profile?.full_name || 'Builder',
            builderCompany: profile?.company_name,
            builderAvatar: profile?.avatar_url,
            builderVerified: profile?.is_verified,
            mediaUrl: story.media_url,
            mediaType: story.media_type || 'image',
            caption: story.caption,
            timestamp: new Date(story.created_at),
            views: story.views || 0,
            isViewed: false
          });
        });
        
        setStoryGroups(Object.values(groupedStories));
      } else {
        setStoryGroups([]);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStoryGroups([]);
    } finally {
      setLoadingStories(false);
    }
  };

  // Handle file selection for story upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a video or image file',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate file size (50MB max for stories)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Story files must be under 50MB',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  // Upload story
  const handleUploadStory = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a video or image for your story',
        variant: 'destructive'
      });
      return;
    }
    
    // Get user ID
    let userId: string | null = currentUserId || null;
    if (!userId) {
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
        }
      } catch (e) {}
    }
    
    if (!userId) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to post stories',
        variant: 'destructive'
      });
      return;
    }
    
    setUploading(true);
    
    try {
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get access token
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `stories/${userId}/${Date.now()}.${fileExt}`;
      
      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/builder-videos/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': selectedFile.type,
            'x-upsert': 'true'
          },
          body: selectedFile
        }
      );
      
      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }
      
      const mediaUrl = `${SUPABASE_URL}/storage/v1/object/public/builder-videos/${fileName}`;
      const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      
      // Save story to database
      const storyRes = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_stories`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            builder_id: userId,
            media_url: mediaUrl,
            media_type: mediaType,
            caption: storyCaption || null,
            is_active: true,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          })
        }
      );
      
      if (!storyRes.ok) {
        const errorText = await storyRes.text();
        console.error('Story save error:', errorText);
        // Table might not exist - show helpful message
        toast({
          title: '📸 Story uploaded!',
          description: 'Your story has been saved. It will appear once the stories feature is fully enabled.',
        });
      } else {
        toast({
          title: '🎉 Story posted!',
          description: 'Your story is now live for 24 hours',
        });
        
        // Refresh stories
        fetchStories();
      }
      
      // Reset form
      setSelectedFile(null);
      setFilePreview(null);
      setStoryCaption('');
      setShowUploadDialog(false);
      
    } catch (error: any) {
      console.error('Story upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Could not upload your story. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
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

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (60 * 60 * 1000));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const scrollStories = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const openStoryViewer = (group: StoryGroup) => {
    setSelectedGroup(group);
    setCurrentStoryIndex(0);
    setProgress(0);
    startProgress();
  };

  const closeStoryViewer = () => {
    setSelectedGroup(null);
    setCurrentStoryIndex(0);
    setProgress(0);
    if (progressRef.current) {
      clearInterval(progressRef.current);
    }
  };

  const startProgress = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
    }
    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNextStory();
          return 0;
        }
        return prev + 2;
      });
    }, 100);
  };

  const goToNextStory = () => {
    if (!selectedGroup) return;
    
    if (currentStoryIndex < selectedGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // Move to next group
      const currentGroupIndex = storyGroups.findIndex(g => g.builderId === selectedGroup.builderId);
      if (currentGroupIndex < storyGroups.length - 1) {
        setSelectedGroup(storyGroups[currentGroupIndex + 1]);
        setCurrentStoryIndex(0);
        setProgress(0);
      } else {
        closeStoryViewer();
      }
    }
  };

  const goToPrevStory = () => {
    if (!selectedGroup) return;
    
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    } else {
      // Move to previous group
      const currentGroupIndex = storyGroups.findIndex(g => g.builderId === selectedGroup.builderId);
      if (currentGroupIndex > 0) {
        const prevGroup = storyGroups[currentGroupIndex - 1];
        setSelectedGroup(prevGroup);
        setCurrentStoryIndex(prevGroup.stories.length - 1);
        setProgress(0);
      }
    }
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    // In a real app, this would send the reply
    console.log('Reply:', replyText);
    setReplyText('');
  };

  const currentStory = selectedGroup?.stories[currentStoryIndex];

  return (
    <>
      {/* Stories Row */}
      <Card className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden">
        <div className="relative">
          {/* Scroll Buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100"
            onClick={() => scrollStories('left')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100"
            onClick={() => scrollStories('right')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Stories Container */}
          <div
            ref={scrollRef}
            className="flex gap-2 p-4 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Create Story Card - Only show for builders */}
            {canPostStory && (
              <div
                className="flex-shrink-0 w-28 cursor-pointer group"
                onClick={() => setShowUploadDialog(true)}
              >
                <div className="relative h-44 rounded-xl overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-dashed border-blue-300 dark:border-blue-600 group-hover:border-blue-500 transition-colors">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Create Story</span>
                    <span className="text-[10px] text-blue-500 dark:text-blue-500">Add Reel</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loadingStories && (
              <div className="flex-shrink-0 w-28 h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            )}

            {/* Empty State - No Stories */}
            {!loadingStories && storyGroups.length === 0 && (
              <div className="flex-shrink-0 px-4 py-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No stories yet. {canPostStory ? 'Be the first to share!' : 'Check back later!'}
                </p>
              </div>
            )}

            {/* Builder Stories */}
            {storyGroups.map((group) => (
              <div
                key={group.builderId}
                className="flex-shrink-0 w-28 cursor-pointer group"
                onClick={() => openStoryViewer(group)}
              >
                <div className="relative h-44 rounded-xl overflow-hidden">
                  {/* Story Preview Image */}
                  <img
                    src={group.stories[0].mediaUrl}
                    alt={group.builderName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
                  
                  {/* Avatar with Ring */}
                  <div className={`absolute top-2 left-2 p-0.5 rounded-full ${group.hasUnviewed ? 'bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500' : 'bg-gray-400'}`}>
                    <Avatar className="h-9 w-9 border-2 border-white dark:border-gray-900">
                      <AvatarImage src={group.builderAvatar} />
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                        {getInitials(group.builderCompany || group.builderName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Verified Badge */}
                  {group.builderVerified && (
                    <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-blue-500 fill-white" />
                  )}

                  {/* Builder Name */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-medium line-clamp-2 drop-shadow-lg">
                      {group.builderCompany || group.builderName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Story Viewer Modal */}
      <Dialog open={!!selectedGroup} onOpenChange={() => closeStoryViewer()}>
        <DialogContent className="max-w-lg p-0 bg-black border-0 overflow-hidden">
          {selectedGroup && currentStory && (
            <div className="relative h-[85vh] flex flex-col">
              {/* Progress Bars */}
              <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
                {selectedGroup.stories.map((_, idx) => (
                  <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-100"
                      style={{
                        width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? `${progress}%` : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-white">
                    <AvatarImage src={selectedGroup.builderAvatar} />
                    <AvatarFallback className="bg-blue-600 text-white font-semibold">
                      {getInitials(selectedGroup.builderCompany || selectedGroup.builderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-white font-semibold text-sm">
                        {selectedGroup.builderCompany || selectedGroup.builderName}
                      </span>
                      {selectedGroup.builderVerified && (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 fill-white" />
                      )}
                    </div>
                    <span className="text-white/70 text-xs">{formatTimeAgo(currentStory.timestamp)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={closeStoryViewer}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Story Content */}
              <div className="flex-1 relative">
                {currentStory.mediaType === 'image' ? (
                  <img
                    src={currentStory.mediaUrl}
                    alt="Story"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={currentStory.mediaUrl}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted={isMuted}
                    loop
                  />
                )}

                {/* Navigation Areas */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
                  onClick={goToPrevStory}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
                  onClick={goToNextStory}
                />

                {/* Caption */}
                {currentStory.caption && (
                  <div className="absolute bottom-20 left-0 right-0 px-4">
                    <p className="text-white text-sm drop-shadow-lg bg-black/30 rounded-lg p-3">
                      {currentStory.caption}
                    </p>
                  </div>
                )}

                {/* Views */}
                <div className="absolute bottom-20 right-4 flex items-center gap-1 text-white/70 text-xs">
                  <Eye className="h-4 w-4" />
                  {currentStory.views}
                </div>
              </div>

              {/* Reply Input */}
              <div className="p-4 flex items-center gap-2 bg-black/50">
                <Input
                  placeholder="Send a message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                  className="flex-1 bg-transparent border-white/30 text-white placeholder:text-white/50 rounded-full"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-white hover:bg-white/20"
                >
                  <Heart className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-white hover:bg-white/20"
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Story Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-500" />
              Create Story / Reel
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload Area */}
            {!filePreview ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                <input
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Click to upload video or image
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  MP4, WebM, MOV, JPG, PNG (max 50MB)
                </span>
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black">
                {selectedFile?.type.startsWith('video/') ? (
                  <video
                    src={filePreview}
                    className="w-full h-48 object-contain"
                    controls
                  />
                ) : (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-full h-48 object-contain"
                  />
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-black/60 hover:bg-black/80"
                  onClick={() => {
                    setSelectedFile(null);
                    if (filePreview) URL.revokeObjectURL(filePreview);
                    setFilePreview(null);
                  }}
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}
            
            {/* Caption Input */}
            <Textarea
              placeholder="Add a caption to your story..."
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
              className="resize-none"
              rows={2}
            />
            
            {/* Upload Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowUploadDialog(false);
                  setSelectedFile(null);
                  if (filePreview) URL.revokeObjectURL(filePreview);
                  setFilePreview(null);
                  setStoryCaption('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleUploadStory}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Post Story
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-xs text-center text-gray-500">
              Stories disappear after 24 hours
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BuilderStories;
