import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Video, 
  Image as ImageIcon, 
  Smile, 
  MapPin, 
  Users,
  Camera,
  FileVideo,
  X,
  Upload,
  Globe,
  Lock,
  ChevronDown,
  Filter,
  Star,
  Bookmark,
  BookmarkCheck,
  Radio,
  Sparkles,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BuilderVideoPost, BuilderVideoPostProps, VideoComment } from './BuilderVideoPost';
import { BuilderStories } from './BuilderStories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BuilderFeedProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserRole?: string;
  isBuilder?: boolean; // Whether current user is a registered builder
  onUploadVideo?: (file: File, caption: string) => void;
  onContactBuilder?: (builderId: string) => void;
}

// Sample demo posts for builders
const DEMO_POSTS: Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'>[] = [
  {
    id: 'post-1',
    builderId: 'builder-1',
    builderName: 'John Kamau',
    builderCompany: 'Kamau Construction Ltd',
    builderAvatar: '',
    builderVerified: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: '',
    caption: '🏗️ Progress update on our latest residential project in Karen, Nairobi! The foundation work is complete and we\'re moving to the structural phase. Quality workmanship guaranteed! 💪\n\n#KenyaConstruction #NairobiBuilders #QualityHomes',
    location: 'Karen, Nairobi',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    likes: 234,
    shares: 45,
    isLiked: false,
    comments: [
      {
        id: 'c1',
        userId: 'user-1',
        userName: 'Grace Wanjiku',
        content: 'Amazing progress! Looking forward to seeing the final result 🏠',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        likes: 12,
        isLiked: false
      },
      {
        id: 'c2',
        userId: 'user-2',
        userName: 'Peter Mwangi',
        content: 'Great work as always! Your team does excellent foundation work.',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        likes: 8,
        isLiked: false
      }
    ]
  },
  {
    id: 'post-2',
    builderId: 'builder-2',
    builderName: 'Grace Wanjiku',
    builderCompany: 'Elite Builders Kenya',
    builderAvatar: '',
    builderVerified: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: '',
    caption: '✨ Just completed this beautiful commercial plaza in Mombasa CBD! 5 floors of modern office and retail space. Thank you to our amazing team and clients for trusting us with this project.\n\nContact us for your next project! 📞 +254 733 456 789',
    location: 'Mombasa, Kenya',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    likes: 567,
    shares: 89,
    isLiked: true,
    comments: [
      {
        id: 'c3',
        userId: 'user-3',
        userName: 'David Ochieng',
        content: 'Congratulations on another successful project! The design is stunning.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        likes: 23,
        isLiked: false
      }
    ]
  },
  {
    id: 'post-3',
    builderId: 'builder-3',
    builderName: 'David Ochieng',
    builderCompany: '',
    builderAvatar: '',
    builderVerified: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: '',
    caption: '⚡ Solar installation completed for a residential home in Kisumu! Going green with renewable energy. This 10kW system will power the entire household.\n\n🌞 Solar is the future! Contact me for your solar needs.',
    location: 'Kisumu, Kenya',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    likes: 189,
    shares: 34,
    isLiked: false,
    comments: []
  },
  {
    id: 'post-4',
    builderId: 'builder-4',
    builderName: 'Mary Njeri',
    builderCompany: 'Njeri Masonry Works',
    builderAvatar: '',
    builderVerified: true,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: '',
    caption: '🧱 Foundation work in progress! Our team specializes in strong, durable foundations that last generations. Using quality materials from certified suppliers.\n\n📍 Currently working in Nakuru region. Book your consultation today!',
    location: 'Nakuru, Kenya',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    likes: 312,
    shares: 56,
    isLiked: false,
    comments: [
      {
        id: 'c4',
        userId: 'user-4',
        userName: 'Samuel Kiprop',
        content: 'Your masonry work is top notch! Recommended to all my friends.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        likes: 15,
        isLiked: false
      },
      {
        id: 'c5',
        userId: 'user-5',
        userName: 'Ann Chebet',
        content: 'How much for a foundation for a 4 bedroom house?',
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
        likes: 3,
        isLiked: false
      }
    ]
  }
];

// Location options for filtering
const LOCATIONS = ['All Locations', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu'];
const SPECIALTIES = ['All Specialties', 'Residential', 'Commercial', 'Industrial', 'Renovation', 'Foundation', 'Roofing', 'Electrical', 'Plumbing'];

export const BuilderFeed: React.FC<BuilderFeedProps> = ({
  currentUserId,
  currentUserName = 'Guest',
  currentUserAvatar,
  currentUserRole,
  isBuilder = false,
  onUploadVideo,
  onContactBuilder
}) => {
  const { toast } = useToast();
  
  // FAST PATH: Check localStorage for role if not passed via props
  // This ensures we detect professional builders even if the prop wasn't set correctly
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
  const storedUserName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;
  
  // User is a builder if: prop says so, OR localStorage role is professional_builder/admin
  const effectiveIsBuilder = isBuilder || 
    storedRole === 'professional_builder' || 
    storedRole === 'admin';
  
  // Use stored user ID if currentUserId not provided
  const effectiveUserId = currentUserId || storedUserId;
  
  // Get effective role from props or localStorage
  const effectiveRole = currentUserRole || storedRole;
  
  // Get effective user name from props or localStorage
  const effectiveUserName = currentUserName !== 'Guest' ? currentUserName : (storedUserName || 'Guest');
  
  // Check if user can post (must be a registered builder)
  // Only professional builders can post on the Builders page (not private clients)
  const canPost = isBuilder || 
    effectiveRole === 'professional_builder' || 
    effectiveRole === 'admin' ||
    storedRole === 'professional_builder' || 
    storedRole === 'admin';
  const [posts, setPosts] = useState<Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'>[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [postLocation, setPostLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'friends'>('public');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [feedType, setFeedType] = useState<'all' | 'following' | 'live'>('all');

  // Fetch posts from database on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    console.log('📥 Fetching posts from database...');
    try {
      // Fetch posts from builder_posts table using fetch API (bypass Supabase client)
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      const postsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/builder_posts?status=eq.active&order=created_at.desc&limit=50`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          }
        }
      );
      
      const postsData = await postsRes.json();
      console.log('📥 Posts fetched:', postsData?.length || 0, 'posts');
      
      if (!postsRes.ok || postsData?.error) {
        console.log('📥 Error fetching posts:', postsData?.message || postsData?.error);
        // Don't show demo posts - only show real builder posts
        setPosts([]);
        setLoadingPosts(false);
        return;
      }

      if (postsData && postsData.length > 0) {
        console.log('📥 First post:', postsData[0]?.id, postsData[0]?.video_url ? 'has video' : 'no video');
        // Get unique builder IDs (user_id from auth.users)
        const builderIds = [...new Set(postsData.map((p: any) => p.builder_id))];
        
        // Fetch profiles for these builders using fetch API
        let profilesData: any[] = [];
        try {
          const profilesRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${builderIds.join(',')})`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              }
            }
          );
          profilesData = await profilesRes.json();
          console.log('📥 Profiles fetched:', profilesData?.length || 0);
        } catch (e) {
          console.log('📥 Profile fetch error:', e);
        }

        // Create a map for quick lookup
        const profilesMap = new Map((profilesData || []).map((p: any) => [p.user_id, p]));

        // Fetch comments for each post (optional, don't fail if table doesn't exist)
        const postIds = postsData.map((p: any) => p.id);
        let commentsData: any[] = [];
        try {
          const commentsRes = await fetch(
            `${SUPABASE_URL}/rest/v1/post_comments?post_id=in.(${postIds.join(',')})&order=created_at.desc`,
            {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              }
            }
          );
          if (commentsRes.ok) {
            commentsData = await commentsRes.json();
          }
        } catch (e) {
          console.log('📥 Comments fetch skipped');
        }

        // Get commenter profiles
        const commenterIds = [...new Set((commentsData || []).map((c: any) => c.user_id))];
        let commenterProfiles: any[] = [];
        if (commenterIds.length > 0) {
          try {
            const commenterRes = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${commenterIds.join(',')})&select=user_id,full_name,avatar_url`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                }
              }
            );
            if (commenterRes.ok) {
              commenterProfiles = await commenterRes.json();
            }
          } catch (e) {}
        }
        
        const commenterMap = new Map((commenterProfiles || []).map((p: any) => [p.user_id, p]));

        // Transform posts to match component format
        const transformedPosts = postsData.map((post: any) => {
          const profile = profilesMap.get(post.builder_id);
          const postComments = (commentsData || [])
            .filter((c: any) => c.post_id === post.id)
            .map((c: any) => {
              const commenter = commenterMap.get(c.user_id);
              return {
                id: c.id,
                userId: c.user_id,
                userName: commenter?.full_name || 'Anonymous',
                userAvatar: commenter?.avatar_url,
                content: c.content,
                timestamp: new Date(c.created_at),
                likes: c.likes_count || 0,
                isLiked: false
              };
            });

          return {
            id: post.id,
            builderId: post.builder_id,
            builderName: profile?.full_name || 'Builder',
            builderCompany: profile?.company_name || '',
            builderAvatar: profile?.avatar_url || '',
            builderVerified: profile?.is_verified || false,
            videoUrl: post.video_url || '', // Database column is 'video_url'
            imageUrl: post.image_url || '', // Database column is 'image_url'
            thumbnailUrl: post.thumbnail_url || '',
            caption: post.content || '', // Database column is 'content'
            location: post.project_location || profile?.location || '',
            timestamp: new Date(post.created_at),
            likes: post.likes_count || 0,
            shares: post.shares_count || 0,
            isLiked: false,
            comments: postComments
          };
        });

        // Combine real posts with demo posts if we have few real posts
        if (transformedPosts.length < 3) {
          // Only show real builder posts - no demo data
          setPosts(transformedPosts);
        } else {
          setPosts(transformedPosts);
        }
      } else {
        // No posts from registered builders yet
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Don't show demo posts - only real builder content
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file (MP4, WebM, MOV)',
          variant: 'destructive'
        });
        return;
      }
      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Video must be under 100MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setIsCreatingPost(true);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file (JPG, PNG, GIF, WebP)',
          variant: 'destructive'
        });
        return;
      }
      // Validate file size (10MB max for photos)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Image must be under 10MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setIsCreatingPost(true);
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  const handlePost = async () => {
    console.log('📤 handlePost() called');
    
    if (!newPostText.trim() && !selectedVideo && !selectedPhoto) {
      console.log('📤 No content, returning early');
      return;
    }
    
    // Get user ID directly from localStorage (bypasses Supabase client issues)
    let userId: string | null = null;
    
    console.log('📤 Checking localStorage for auth token...');
    try {
      const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
      console.log('📤 Found stored session:', !!storedSession);
      
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        userId = parsed.user?.id;
        console.log('📤 Parsed user ID:', userId);
        console.log('📤 User email:', parsed.user?.email);
      }
    } catch (e) {
      console.error('📤 Error parsing localStorage:', e);
    }
    
    if (!userId) {
      console.log('📤 No user found in localStorage');
      toast({
        title: 'Not Signed In',
        description: 'Please sign in to post. Try refreshing the page.',
        variant: 'destructive'
      });
      return;
    }
    
    console.log('📤 User ID found:', userId);
    console.log('📤 Calling handlePostWithUserId...');
    await handlePostWithUserId(userId);
  };
  
  const handlePostWithUserId = async (postUserId: string) => {
    console.log('📤 handlePostWithUserId called with:', postUserId);
    
    if (!newPostText.trim() && !selectedVideo && !selectedPhoto) {
      console.log('📤 No content to post');
      return;
    }

    setIsPosting(true);
    try {
      let videoUrl = '';
      let imageUrl = '';
      
      const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
      
      // Get auth token for upload
      let accessToken = '';
      try {
        const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {
        console.warn('📤 Could not get access token');
      }
      
      // Upload video if selected - using fast XMLHttpRequest
      if (selectedVideo) {
        const fileExt = selectedVideo.name.split('.').pop();
        const fileName = `${postUserId}/${Date.now()}.${fileExt}`;
        const fileSizeMB = (selectedVideo.size / 1024 / 1024).toFixed(2);
        
        console.log('📤 Uploading video:', fileName, `(${fileSizeMB}MB)`);
        
        try {
          // Fast upload using XMLHttpRequest with progress
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const uploadUrl = `${SUPABASE_URL}/storage/v1/object/builder-videos/${fileName}`;
            
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                console.log(`📤 Video upload progress: ${percent}%`);
              }
            };
            
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log('📤 Video upload complete!');
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };
            
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Upload timeout'));
            
            xhr.open('POST', uploadUrl, true);
            xhr.timeout = 300000; // 5 min timeout
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken || SUPABASE_ANON_KEY}`);
            xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
            xhr.setRequestHeader('Content-Type', selectedVideo.type);
            xhr.setRequestHeader('x-upsert', 'true');
            xhr.send(selectedVideo);
          });
          
          videoUrl = `${SUPABASE_URL}/storage/v1/object/public/builder-videos/${fileName}`;
          console.log('📤 Video URL:', videoUrl);
          
        } catch (uploadError: any) {
          console.error('📤 Video upload error:', uploadError);
          toast({
            title: 'Video Upload Failed',
            description: uploadError.message || 'Could not upload video.',
            variant: 'destructive'
          });
          // Continue without video
        }
      }
      
      // Upload photo if selected
      if (selectedPhoto) {
        const fileExt = selectedPhoto.name.split('.').pop();
        const fileName = `${postUserId}/photos/${Date.now()}.${fileExt}`;
        const fileSizeMB = (selectedPhoto.size / 1024 / 1024).toFixed(2);
        
        console.log('📤 Uploading photo:', fileName, `(${fileSizeMB}MB)`);
        
        try {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const uploadUrl = `${SUPABASE_URL}/storage/v1/object/builder-videos/${fileName}`;
            
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                console.log(`📤 Photo upload progress: ${percent}%`);
              }
            };
            
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log('📤 Photo upload complete!');
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };
            
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Upload timeout'));
            
            xhr.open('POST', uploadUrl, true);
            xhr.timeout = 60000; // 1 min timeout for photos
            xhr.setRequestHeader('Authorization', `Bearer ${accessToken || SUPABASE_ANON_KEY}`);
            xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
            xhr.setRequestHeader('Content-Type', selectedPhoto.type);
            xhr.setRequestHeader('x-upsert', 'true');
            xhr.send(selectedPhoto);
          });
          
          imageUrl = `${SUPABASE_URL}/storage/v1/object/public/builder-videos/${fileName}`;
          console.log('📤 Photo URL:', imageUrl);
          
        } catch (uploadError: any) {
          console.error('📤 Photo upload error:', uploadError);
          toast({
            title: 'Photo Upload Failed',
            description: uploadError.message || 'Could not upload photo.',
            variant: 'destructive'
          });
          // Continue without photo
        }
      }

      console.log('📤 Upload done, now saving to database...');

      // Get user's profile using fetch (bypass Supabase client)
      let profile: { id?: string; full_name?: string; avatar_url?: string } | null = null;
      try {
        console.log('📤 Fetching profile...');
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        let accessToken = '';
        try {
          const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed.access_token || '';
          }
        } catch (e) {}
        
        const profileRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${postUserId}&select=id,full_name,avatar_url&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            }
          }
        );
        const profileData = await profileRes.json();
        profile = profileData?.[0] || null;
        console.log('📤 Profile found:', profile ? 'yes' : 'no');
      } catch (e) {
        console.log('📤 Profile fetch error (continuing):', e);
      }

      // Insert post into database using fetch (bypass Supabase client)
      console.log('📤 Inserting post into database...');
      let newPostData: any = null;
      
      try {
        const SUPABASE_URL = 'https://wuuyjjpgzgeimiptuuws.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dXlqanBnemdlaW1pcHR1dXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTY4NjMsImV4cCI6MjA3MTE3Mjg2M30.7r2Fd-perL2cC7IR4R06GLWrY9xKkxa0ZDnmmSCWgTo';
        
        let accessToken = '';
        try {
          const storedSession = localStorage.getItem('sb-wuuyjjpgzgeimiptuuws-auth-token');
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed.access_token || '';
          }
        } catch (e) {}
        
        // Determine post type
        let postType = 'text';
        if (videoUrl) postType = 'video';
        else if (imageUrl) postType = 'image';
        
        const postPayload = {
          builder_id: postUserId,
          post_type: postType,
          content: newPostText,
          video_url: videoUrl || null,
          image_url: imageUrl || null,
          project_location: postLocation || null,
          privacy: privacy,
          status: 'active', // Posts are immediately visible
          likes_count: 0,
          shares_count: 0,
          comments_count: 0
        };
        
        console.log('📤 Post payload:', postPayload);
        
        const postRes = await fetch(
          `${SUPABASE_URL}/rest/v1/builder_posts`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(postPayload)
          }
        );
        
        const postResult = await postRes.json();
        console.log('📤 Post insert response:', postRes.status, postResult);
        
        if (postRes.ok && postResult?.[0]) {
          newPostData = postResult[0];
          console.log('📤 Post created successfully:', newPostData?.id);
        } else {
          console.error('📤 Post creation error:', postResult);
          toast({
            title: 'Database Error',
            description: postResult?.message || 'Could not save post to database',
            variant: 'destructive'
          });
        }
      } catch (postError: any) {
        console.error('📤 Post insert fetch error:', postError);
        toast({
          title: 'Database Error',
          description: postError.message || 'Could not save post',
          variant: 'destructive'
        });
      }

      console.log('📤 Post saved! Now updating UI...');

      // Also call onUploadVideo callback if provided
      if (selectedVideo && onUploadVideo) {
        onUploadVideo(selectedVideo, newPostText);
      }

      // Add to local state for immediate display
      const newPost: Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'> = {
        id: newPostData?.id || `post-${Date.now()}`,
        builderId: postUserId,
        builderName: profile?.full_name || effectiveUserName,
        builderAvatar: profile?.avatar_url || currentUserAvatar,
        builderVerified: false,
        videoUrl: videoUrl || videoPreview || '',
        imageUrl: imageUrl || photoPreview || '',
        caption: newPostText,
        location: postLocation || '',
        timestamp: new Date(),
        likes: 0,
        shares: 0,
        isLiked: false,
        comments: []
      };

      console.log('📤 Adding post to feed:', newPost.id);
      setPosts([newPost, ...posts]);
      
      console.log('📤 Clearing form...');
      setNewPostText('');
      handleRemoveVideo();
      handleRemovePhoto();
      setPostLocation('');
      setShowLocationInput(false);
      setIsCreatingPost(false);

      console.log('📤 Showing success toast...');
      toast({
        title: '🎉 Post Published!',
        description: 'Your post is now live on the builders feed.'
      });
      
      console.log('📤 ✅ All done!');
    } catch (error: any) {
      console.error('📤 Error creating post:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  const handleComment = (postId: string, comment: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newComment: VideoComment = {
          id: `comment-${Date.now()}`,
          userId: currentUserId || 'current-user',
          userName: effectiveUserName,
          userAvatar: currentUserAvatar,
          content: comment,
          timestamp: new Date(),
          likes: 0,
          isLiked: false
        };
        return {
          ...post,
          comments: [newComment, ...post.comments]
        };
      }
      return post;
    }));
  };

  const handleShare = (postId: string) => {
    // In a real app, this would open a share dialog
    console.log('Sharing post:', postId);
  };

  const handleViewProfile = (builderId: string) => {
    // In a real app, this would navigate to the builder's profile
    console.log('Viewing profile:', builderId);
  };

  const handleSavePost = (postId: string) => {
    setSavedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Filter posts based on selected filters
  const filteredPosts = posts.filter(post => {
    if (locationFilter !== 'All Locations' && post.location && !post.location.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'popular') {
      return b.likes - a.likes;
    }
    if (sortBy === 'trending') {
      return (b.likes + b.comments.length * 2) - (a.likes + a.comments.length * 2);
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Stories Section */}
      <BuilderStories
        currentUserName={effectiveUserName}
        currentUserAvatar={currentUserAvatar}
        onCreateStory={() => setIsCreatingPost(true)}
      />

      {/* Create Post Card - Facebook Style (Only for Builders) */}
      {canPost ? (
        <Card className="bg-white dark:bg-gray-900 shadow-md rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUserAvatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  {effectiveUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsCreatingPost(true)}
              >
                What's on your mind, {effectiveUserName.split(' ')[0]}?
              </button>
            </div>

            {/* Video Preview */}
            {videoPreview && (
              <div className="relative mb-3 rounded-lg overflow-hidden bg-black">
                <video 
                  src={videoPreview} 
                  className="w-full max-h-64 object-contain"
                  controls
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-black/60 hover:bg-black/80"
                  onClick={handleRemoveVideo}
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}

            {/* Photo Preview */}
            {photoPreview && (
              <div className="relative mb-3 rounded-lg overflow-hidden">
                <img 
                  src={photoPreview} 
                  alt="Preview"
                  className="w-full max-h-64 object-contain bg-gray-100 dark:bg-gray-800"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-black/60 hover:bg-black/80"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </div>
            )}

            {/* Expanded Post Creator */}
            {isCreatingPost && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Share your construction project, progress updates, or tips..."
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-lg"
                />
                
                {/* Location Input */}
                {showLocationInput && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <Input
                      placeholder="Enter location (e.g., Karen, Nairobi)"
                      value={postLocation}
                      onChange={(e) => setPostLocation(e.target.value)}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setShowLocationInput(false);
                        setPostLocation('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Privacy Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        {privacy === 'public' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {privacy === 'public' ? 'Public' : 'Friends'}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setPrivacy('public')}>
                        <Globe className="h-4 w-4 mr-2" />
                        Public
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPrivacy('friends')}>
                        <Lock className="h-4 w-4 mr-2" />
                        Friends
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Show selected location badge */}
                  {postLocation && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {postLocation}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <Separator className="my-3" />

            {/* Action Buttons */}
            <div className="flex items-center justify-around">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors flex-1 justify-center">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
                <FileVideo className="h-6 w-6 text-red-500" />
                <span className="font-medium text-gray-600 dark:text-gray-400">Video</span>
              </label>
              
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors flex-1 justify-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <ImageIcon className="h-6 w-6 text-green-500" />
                <span className="font-medium text-gray-600 dark:text-gray-400">Photo</span>
              </label>

              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-1 justify-center ${showLocationInput ? 'bg-orange-100 dark:bg-orange-900/30' : ''}`}
                onClick={() => {
                  setShowLocationInput(!showLocationInput);
                  setIsCreatingPost(true);
                }}
              >
                <MapPin className={`h-6 w-6 ${showLocationInput ? 'text-orange-600' : 'text-orange-500'}`} />
                <span className="font-medium text-gray-600 dark:text-gray-400">Location</span>
              </button>
            </div>

            {/* Post Button - Always show when there's content or media */}
            {(isCreatingPost || newPostText.trim() || selectedVideo || selectedPhoto) && (
              <div className="mt-3 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsCreatingPost(false);
                    handleRemoveVideo();
                    handleRemovePhoto();
                    setPostLocation('');
                    setShowLocationInput(false);
                    setNewPostText('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📤 Post button clicked!');
                    console.log('📤 newPostText:', newPostText);
                    console.log('📤 selectedVideo:', selectedVideo?.name);
                    console.log('📤 selectedPhoto:', selectedPhoto?.name);
                    console.log('📤 postLocation:', postLocation);
                    console.log('📤 isPosting:', isPosting);
                    
                    if (isPosting) {
                      console.log('📤 Already posting, ignoring click');
                      return;
                    }
                    
                    if (!newPostText.trim() && !selectedVideo && !selectedPhoto) {
                      console.log('📤 No content to post');
                      toast({
                        title: 'Nothing to post',
                        description: 'Please add some text, photo, or video',
                        variant: 'destructive'
                      });
                      return;
                    }
                    
                    // Call handlePost
                    handlePost();
                  }}
                  disabled={isPosting || (!newPostText.trim() && !selectedVideo && !selectedPhoto)}
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : effectiveIsBuilder ? (
        /* User IS a builder but component didn't get the prop - show posting UI */
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 shadow-md rounded-lg border-green-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Video className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Welcome, Professional Builder!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can post videos and share your projects. Go to your dashboard to upload content.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => window.location.href = '/professional-builder-dashboard'}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Visitor Notice - Cannot Post - Link to Registration */
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 shadow-md rounded-lg border-blue-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white">Want to share your projects?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Register as a builder to post videos, share updates, and connect with clients.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* For visitors not logged in - go to registration */}
                {!effectiveUserId ? (
                  <>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.location.href = '/professional-builder-registration'}
                    >
                      Register as Builder
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => window.location.href = '/professional-builder-signin'}
                    >
                      Already Registered? Sign In
                    </Button>
                  </>
                ) : (
                  /* Logged in but not a builder - upgrade account */
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => window.location.href = '/professional-builder-registration'}
                  >
                    Become a Builder
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed Navigation & Filters */}
      <Card className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden">
        {/* Feed Type Tabs */}
        <div className="flex items-center border-b">
          <button
            onClick={() => setFeedType('all')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all border-b-2 ${
              feedType === 'all'
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            For You
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all border-b-2 ${
              feedType === 'following'
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Following
          </button>
          <button
            onClick={() => setFeedType('live')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-all border-b-2 ${
              feedType === 'live'
                ? 'text-red-600 border-red-600 bg-red-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Radio className="h-4 w-4" />
            Live
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="p-3 flex items-center gap-2 flex-wrap">
          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[130px] h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </SelectContent>
          </Select>

          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[140px] h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0">
              <MapPin className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map(loc => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Specialty Filter */}
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-[150px] h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map(spec => (
                <SelectItem key={spec} value={spec}>{spec}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(locationFilter !== 'All Locations' || specialtyFilter !== 'All Specialties' || sortBy !== 'recent') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setLocationFilter('All Locations');
                setSpecialtyFilter('All Specialties');
                setSortBy('recent');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          {/* Saved Posts Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 px-3 ml-auto rounded-full ${savedPosts.size > 0 ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Saved ({savedPosts.size})
          </Button>
        </div>
      </Card>

      {/* Live Indicator */}
      {feedType === 'live' && (
        <Card className="bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Radio className="h-8 w-8 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Live from Construction Sites</h3>
                  <p className="text-white/80 text-sm">Watch builders working in real-time across Kenya</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                3 Live Now
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {loadingPosts ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Video className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
              <p className="text-muted-foreground">
                Be the first to share your construction projects!
              </p>
            </div>
          </Card>
        ) : filteredPosts.map((post) => (
          <div key={post.id} className="relative">
            <BuilderVideoPost
              {...post}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onViewProfile={handleViewProfile}
            />
            {/* Save Button Overlay */}
            <Button
              variant="ghost"
              size="sm"
              className={`absolute top-16 right-4 h-8 w-8 p-0 rounded-full ${
                savedPosts.has(post.id) 
                  ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' 
                  : 'text-gray-400 bg-white/80 hover:bg-white'
              }`}
              onClick={() => handleSavePost(post.id)}
            >
              {savedPosts.has(post.id) ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Load More - only show if we have posts */}
      {!loadingPosts && filteredPosts.length > 0 && (
        <div className="text-center py-4">
          <Button variant="outline" className="w-full max-w-xs rounded-full">
            Load More Posts
          </Button>
        </div>
      )}
    </div>
  );
};

export default BuilderFeed;
