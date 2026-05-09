import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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
  Filter,
  Star,
  Bookmark,
  BookmarkCheck,
  Radio,
  Sparkles,
  Loader2
} from 'lucide-react';
import { BuilderVideoPost, BuilderVideoPostProps, VideoComment } from './BuilderVideoPost';
import { BuilderStories } from './BuilderStories';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getBuilderFeedGuestId } from '@/utils/builderFeedGuestId';

interface BuilderFeedProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserRole?: string;
  isBuilder?: boolean; // True when current user is a registered CO/contractor (professional_builder)
  onUploadVideo?: (file: File, caption: string) => void;
  onContactBuilder?: (builderId: string) => void;
  /** Parent supplies outer chrome (e.g. unified builders + feed card) */
  omitOuterCard?: boolean;
  /** Switch to Project Showcase tab when timeline is empty but videos exist */
  onOpenProjectShowcase?: () => void;
  /** Same source as /builders hero stats; drives empty-state copy when it disagrees with loaded rows */
  directoryTimelinePostCount?: number;
  directoryShowcaseVideoCount?: number;
  directoryStatsLoading?: boolean;
}

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
  onContactBuilder,
  omitOuterCard = false,
  onOpenProjectShowcase,
  directoryTimelinePostCount,
  directoryShowcaseVideoCount,
  directoryStatsLoading = false,
}) => {
  const { toast } = useToast();
  
  // FAST PATH: Check localStorage for role if not passed via props
  // This ensures we detect COs/contractors even if the prop wasn't set correctly
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
  const storedUserName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;
  
  // Use stored user ID if currentUserId not provided
  const effectiveUserId = currentUserId || storedUserId;
  
  // Get effective role from props or localStorage
  const effectiveRole = currentUserRole || storedRole;
  
  // Get effective user name from props or localStorage
  const effectiveUserName = currentUserName !== 'Guest' ? currentUserName : (storedUserName || 'Guest');
  
  /** Only registered CO/contractors may post; feed is public for everyone to read. */
  const isCoContractor =
    isBuilder ||
    effectiveRole === 'professional_builder' ||
    storedRole === 'professional_builder';
  const canPost = isCoContractor;
  const effectiveIsBuilder = isCoContractor;
  const [posts, setPosts] = useState<Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'>[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsOffset, setPostsOffset] = useState(0);
  const POSTS_PER_PAGE = 10;
  const [newPostText, setNewPostText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [postLocation, setPostLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [specialtyFilter, setSpecialtyFilter] = useState('All Specialties');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [feedType, setFeedType] = useState<'all' | 'following' | 'live'>('all');
  /** When timeline is empty, explains split vs showcase (stats combine posts + videos). */
  const [feedEmptyInsight, setFeedEmptyInsight] = useState<{
    timelinePosts: number;
    showcaseVideos: number;
  } | null>(null);

  // Fetch posts from database on mount
  useEffect(() => {
    fetchPosts(0, true);
  }, []);

  const fetchPosts = async (offset: number = 0, isInitialLoad: boolean = false) => {
    if (isInitialLoad) {
      setLoadingPosts(true);
      setPostsOffset(0);
      setHasMorePosts(true);
      setFeedEmptyInsight(null);
    } else {
      setLoadingMore(true);
    }
    console.log('📥 Fetching posts from database... offset:', offset);
    try {
      // Fetch posts from builder_posts table using fetch API (bypass Supabase client)
      let accessToken = '';
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}
      
      // Get current user ID to show their own posts regardless of status
      let currentUserId: string | null = null;
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          currentUserId = parsed.user?.id;
        }
      } catch (e) {}

      // Prefer SECURITY DEFINER RPC so the feed matches public stats even if RLS on builder_posts is mis-deployed.
      const limitPlusOne = POSTS_PER_PAGE + 1;
      const authHeaders = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      } as const;

      const tryFetchPosts = async (query: string) => {
        const url = `${SUPABASE_URL}/rest/v1/builder_posts?${query}`;
        const res = await fetch(url, { headers: authHeaders });
        const json = await res.json();
        return { res, json };
      };

      let postsRes: Response;
      let postsData: unknown;

      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_builder_feed_posts`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_limit: limitPlusOne, p_offset: offset }),
      });
      const rpcJson = await rpcRes.json();
      const rpcOk = rpcRes.ok && Array.isArray(rpcJson);

      if (rpcOk) {
        postsRes = rpcRes;
        postsData = rpcJson;
        console.log('📥 Posts fetched via get_public_builder_feed_posts:', (rpcJson as unknown[]).length);
      } else {
        console.warn(
          '📥 get_public_builder_feed_posts failed; falling back to builder_posts REST:',
          rpcRes.status,
          (rpcJson as { message?: string })?.message || rpcJson
        );
        const feedFilter = encodeURIComponent('(status.eq.active,status.is.null)');
        ({ res: postsRes, json: postsData } = await tryFetchPosts(
          `or=${feedFilter}&order=created_at.desc&limit=${limitPlusOne}&offset=${offset}`
        ));

        if (!postsRes.ok || (postsData as { error?: unknown })?.error) {
          console.warn('📥 builder_posts fetch (or=active|null) failed, retrying status=eq.active:', (postsData as { message?: string })?.message || (postsData as { error?: unknown })?.error);
          ({ res: postsRes, json: postsData } = await tryFetchPosts(
            `status=eq.active&order=created_at.desc&limit=${limitPlusOne}&offset=${offset}`
          ));
        }

        if (!postsRes.ok || (postsData as { error?: unknown })?.error) {
          console.warn('📥 builder_posts fetch (active only) failed, retrying RLS-only:', (postsData as { message?: string })?.message || (postsData as { error?: unknown })?.error);
          ({ res: postsRes, json: postsData } = await tryFetchPosts(
            `order=created_at.desc&limit=${limitPlusOne}&offset=${offset}`
          ));
        }

        console.log('📥 Posts fetched (REST):', Array.isArray(postsData) ? postsData.length : 0, 'posts');
      }

      if (!postsRes.ok || (postsData as { error?: unknown })?.error || !Array.isArray(postsData)) {
        const errBody = postsData as { message?: string; error?: unknown };
        console.log('📥 Error fetching posts:', errBody?.message || errBody?.error || 'invalid response');
        // Don't show demo posts - only show real builder posts
        if (isInitialLoad) {
          setPosts([]);
        }
        setHasMorePosts(false);
        setLoadingPosts(false);
        setLoadingMore(false);
        return;
      }

      // Check if there are more posts
      const hasMore = postsData.length > POSTS_PER_PAGE;
      setHasMorePosts(hasMore);
      
      // Only use POSTS_PER_PAGE posts (remove the extra one we fetched to check)
      const postsToProcess = hasMore ? postsData.slice(0, POSTS_PER_PAGE) : postsData;

      if (postsToProcess && postsToProcess.length > 0) {
        console.log('📥 First post:', postsToProcess[0]?.id, postsToProcess[0]?.video_url ? 'has video' : 'no video');
        // Get unique builder IDs (user_id from auth.users)
        const builderIds = [...new Set(postsToProcess.map((p: any) => p.builder_id))];
        
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
        const postIds = postsToProcess.map((p: any) => p.id);
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
        const commenterIds = [
          ...new Set((commentsData || []).map((c: any) => c.user_id).filter(Boolean)),
        ];
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

        // Signed-in: likes by user_id. Visitors: likes by stable guest_identifier (localStorage).
        let userLikes: Set<string> = new Set();
        try {
          if (currentUserId) {
            const likesRes = await fetch(
              `${SUPABASE_URL}/rest/v1/post_likes?user_id=eq.${currentUserId}&post_id=in.(${postIds.join(',')})&select=post_id`,
              {
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                },
              }
            );
            if (likesRes.ok) {
              const likesData = await likesRes.json();
              userLikes = new Set((likesData || []).map((l: any) => l.post_id));
            }
          } else {
            const guestId = getBuilderFeedGuestId();
            if (guestId && postIds.length > 0) {
              const enc = encodeURIComponent(guestId);
              const likesRes = await fetch(
                `${SUPABASE_URL}/rest/v1/post_likes?post_id=in.(${postIds.join(',')})&user_id=is.null&guest_identifier=eq.${enc}&select=post_id`,
                {
                  headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                  },
                }
              );
              if (likesRes.ok) {
                const likesData = await likesRes.json();
                userLikes = new Set((likesData || []).map((l: any) => l.post_id));
              }
            }
          }
          console.log('📥 Liked posts (this session):', userLikes.size);
        } catch (e) {
          console.log('📥 Likes fetch skipped');
        }

        // Transform posts to match component format
        const transformedPosts = postsToProcess.map((post: any) => {
          const profile = profilesMap.get(post.builder_id);
          const postComments = (commentsData || [])
            .filter((c: any) => c.post_id === post.id)
            .map((c: any) => {
              const commenter = c.user_id ? commenterMap.get(c.user_id) : undefined;
              return {
                id: c.id,
                userId: c.user_id || '',
                userName: commenter?.full_name || c.commenter_name || 'Visitor',
                userAvatar: commenter?.avatar_url,
                content: c.content,
                timestamp: new Date(c.created_at),
                likes: c.likes_count || 0,
                isLiked: false
              };
            });

          // Get first image from image_urls array (database stores as array)
          const firstImageUrl = Array.isArray(post.image_urls) && post.image_urls.length > 0 
            ? post.image_urls[0] 
            : '';

          return {
            id: post.id,
            builderId: post.builder_id,
            builderName: profile?.full_name || 'Builder',
            builderCompany: profile?.company_name || '',
            builderAvatar: profile?.avatar_url || '',
            builderVerified: profile?.is_verified || false,
            videoUrl: post.video_url || '', // Database column is 'video_url'
            imageUrl: firstImageUrl, // Database column is 'image_urls' (array)
            thumbnailUrl: post.thumbnail_url || '',
            caption: post.content || '', // Database column is 'content'
            location: post.project_location || profile?.location || '',
            timestamp: new Date(post.created_at),
            likes: post.likes_count || 0,
            shares: post.shares_count || 0,
            isLiked: userLikes.has(post.id), // Check if user has liked this post
            comments: postComments
          };
        });

        // Update posts state - append for load more, replace for initial load
        if (isInitialLoad) {
          setPosts(transformedPosts);
        } else {
          setPosts(prev => [...prev, ...transformedPosts]);
        }
        
        // Update offset for next load
        setPostsOffset(offset + transformedPosts.length);
        setFeedEmptyInsight(null);
      } else {
        // No timeline posts (videos may still live under Project Showcase only)
        if (isInitialLoad) {
          setPosts([]);
          try {
            const statsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_builders_page_public_stats`, {
              method: 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: '{}',
            });
            const statsJson = (await statsRes.json()) as Record<string, unknown>;
            if (statsRes.ok && statsJson && typeof statsJson === 'object' && !Array.isArray(statsJson)) {
              setFeedEmptyInsight({
                timelinePosts: Number(statsJson.active_posts) || 0,
                showcaseVideos: Number(statsJson.published_videos) || 0,
              });
            } else {
              setFeedEmptyInsight(null);
            }
          } catch {
            setFeedEmptyInsight(null);
          }
        }
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Don't show demo posts - only real builder content
      if (isInitialLoad) {
        setPosts([]);
        setFeedEmptyInsight(null);
      }
    } finally {
      setLoadingPosts(false);
      setLoadingMore(false);
    }
  };

  // Load more posts handler
  const handleLoadMore = () => {
    if (!loadingMore && hasMorePosts) {
      fetchPosts(postsOffset, false);
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

    if (!canPost) {
      toast({
        title: 'CO/Contractors only',
        description: 'Only registered CO/contractors can post on this feed.',
        variant: 'destructive',
      });
      return;
    }
    
    // Get user ID directly from localStorage (bypasses Supabase client issues)
    let userId: string | null = null;
    
    console.log('📤 Checking localStorage for auth token...');
    try {
      const storedSession = readPersistedAuthRawStringSync();
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

    if (!canPost) {
      toast({
        title: 'CO/Contractors only',
        description: 'Only registered CO/contractors can post on this feed.',
        variant: 'destructive',
      });
      return;
    }

    setIsPosting(true);
    try {
      let videoUrl = '';
      let imageUrl = '';
      // Get auth token for upload
      let accessToken = '';
      try {
        const storedSession = readPersistedAuthRawStringSync();
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
            description: 'Storage bucket may not be configured for images. Please contact admin.',
            variant: 'destructive'
          });
          // Don't continue - show error and stop
          setIsPosting(false);
          return;
        }
      }

      // Check if we have media to post
      if (selectedPhoto && !imageUrl) {
        console.log('📤 Photo was selected but upload failed, stopping');
        setIsPosting(false);
        return;
      }
      
      if (selectedVideo && !videoUrl) {
        console.log('📤 Video was selected but upload failed, stopping');
        setIsPosting(false);
        return;
      }

      console.log('📤 Upload done, now saving to database...');

      // Get user's profile using fetch (bypass Supabase client)
      let profile: { id?: string; full_name?: string; avatar_url?: string } | null = null;
      try {
        console.log('📤 Fetching profile...');
        let accessToken = '';
        try {
          const storedSession = readPersistedAuthRawStringSync();
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
        let accessToken = '';
        try {
          const storedSession = readPersistedAuthRawStringSync();
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed.access_token || '';
          }
        } catch (e) {}
        
        // Determine post type
        let postType = 'text';
        if (videoUrl) postType = 'video';
        else if (imageUrl) postType = 'image';
        
        // All posts are immediately visible to visitors
        const postStatus = 'active';
        
        const postPayload = {
          builder_id: postUserId,
          post_type: postType,
          content: newPostText,
          video_url: videoUrl || null,
          image_urls: imageUrl ? [imageUrl] : null, // Database uses image_urls (array)
          project_location: postLocation || null,
          privacy: 'public',
          status: postStatus,
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

      // Determine what media URL to use for display
      // Use the uploaded URL (not the blob preview) for permanent display
      const displayVideoUrl = videoUrl || '';
      const displayImageUrl = imageUrl || '';
      
      console.log('📤 Media URLs for display:', { displayVideoUrl, displayImageUrl });

      // Add to local state for immediate display
      const newPost: Omit<BuilderVideoPostProps, 'onLike' | 'onComment' | 'onShare' | 'onViewProfile'> = {
        id: newPostData?.id || `post-${Date.now()}`,
        builderId: postUserId,
        builderName: profile?.full_name || effectiveUserName,
        builderAvatar: profile?.avatar_url || currentUserAvatar,
        builderVerified: false,
        videoUrl: displayVideoUrl,
        imageUrl: displayImageUrl,
        caption: newPostText,
        location: postLocation || '',
        timestamp: new Date(),
        likes: 0,
        shares: 0,
        isLiked: false,
        comments: []
      };

      // Only add to feed immediately if it's not a video (videos need approval)
      if (!videoUrl) {
        console.log('📤 Adding post to feed:', newPost.id, 'imageUrl:', newPost.imageUrl, 'videoUrl:', newPost.videoUrl);
        setPosts([newPost, ...posts]);
      } else {
        console.log('📤 Video post submitted for approval, not adding to feed yet');
      }
      
      console.log('📤 Clearing form...');
      setNewPostText('');
      handleRemoveVideo();
      handleRemovePhoto();
      setPostLocation('');
      setShowLocationInput(false);
      setIsCreatingPost(false);

      console.log('📤 Showing success toast...');
      // All posts are now immediately visible
      if (videoUrl) {
        toast({
          title: '🎬 Video Posted!',
          description: 'Your video is now live and visible to all visitors!'
        });
      } else {
        toast({
          title: '🎉 Post Published!',
          description: 'Your post is now live on the builders feed.'
        });
      }
      
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

  const handleLike = async (postId: string) => {
    let userId: string | null = effectiveUserId || null;
    if (!userId) {
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
        }
      } catch (e) {}
    }

    const guestId = !userId ? getBuilderFeedGuestId() : '';
    if (!userId && !guestId) {
      toast({
        title: 'Cannot save like',
        description: 'Allow storage for this site so we can remember your likes, or sign in.',
        variant: 'destructive',
      });
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const newLikedState = !post.isLiked;
    const newLikeCount = newLikedState ? post.likes + 1 : post.likes - 1;
    
    // Optimistic update
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: newLikedState,
          likes: newLikeCount
        };
      }
      return p;
    }));

    // Persist to database
    try {
      let accessToken = '';
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}

      const likeHeaders = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      } as const;

      if (newLikedState) {
        const body = userId
          ? { post_id: postId, user_id: userId }
          : { post_id: postId, user_id: null, guest_identifier: guestId };
        const ins = await fetch(`${SUPABASE_URL}/rest/v1/post_likes`, {
          method: 'POST',
          headers: likeHeaders,
          body: JSON.stringify(body),
        });
        if (!ins.ok) {
          const err = await ins.text();
          console.error('post_likes insert:', ins.status, err);
          throw new Error('Like not saved');
        }
      } else if (userId) {
        const del = await fetch(
          `${SUPABASE_URL}/rest/v1/post_likes?post_id=eq.${postId}&user_id=eq.${userId}`,
          {
            method: 'DELETE',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (!del.ok) {
          const err = await del.text();
          console.error('post_likes delete:', del.status, err);
          throw new Error('Unlike not saved');
        }
      } else {
        const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_guest_post_like`, {
          method: 'POST',
          headers: likeHeaders,
          body: JSON.stringify({ p_post_id: postId, p_guest: guestId }),
        });
        if (!rpc.ok) {
          const err = await rpc.text();
          console.error('delete_guest_post_like:', rpc.status, err);
          throw new Error('Unlike not saved');
        }
      }

      console.log('👍 Like persisted (counts updated by database triggers)');
    } catch (error) {
      console.error('Error saving like:', error);
      // Revert optimistic update on error
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: !newLikedState,
            likes: post.likes
          };
        }
        return p;
      }));
    }
  };

  const handleComment = async (postId: string, comment: string) => {
    if (!comment.trim()) return;

    let userId: string | null = effectiveUserId || null;
    if (!userId) {
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          userId = parsed.user?.id;
        }
      } catch (e) {}
    }

    const guestId = !userId ? getBuilderFeedGuestId() : '';
    if (!userId && !guestId) {
      toast({
        title: 'Cannot post comment',
        description: 'Allow storage for this site, or sign in to comment.',
        variant: 'destructive',
      });
      return;
    }

    const commenterLabel =
      userId && effectiveUserName && effectiveUserName !== 'Guest'
        ? effectiveUserName
        : userId
          ? effectiveUserName
          : 'Visitor';

    const tempId = `temp-${Date.now()}`;
    const newComment: VideoComment = {
      id: tempId,
      userId: userId || '',
      userName: commenterLabel,
      userAvatar: currentUserAvatar,
      content: comment,
      timestamp: new Date(),
      likes: 0,
      isLiked: false
    };

    // Optimistic update
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [newComment, ...post.comments]
        };
      }
      return post;
    }));

    // Persist to database
    try {
      let accessToken = '';
      try {
        const storedSession = readPersistedAuthRawStringSync();
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          accessToken = parsed.access_token || '';
        }
      } catch (e) {}

      const commentPayload = userId
        ? { post_id: postId, user_id: userId, content: comment }
        : {
            post_id: postId,
            user_id: null,
            guest_identifier: guestId,
            commenter_name: commenterLabel,
            content: comment,
          };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/post_comments`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(commentPayload),
      });

      const result = await response.json();
      
      if (response.ok && result?.[0]) {
        // Update the temp comment with the real ID
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: post.comments.map(c => 
                c.id === tempId ? { ...c, id: result[0].id } : c
              )
            };
          }
          return post;
        }));

        console.log('💬 Comment saved (counts updated by database triggers)');
      }
    } catch (error) {
      console.error('Error saving comment:', error);
      // Remove optimistic comment on error
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(c => c.id !== tempId)
          };
        }
        return post;
      }));
      toast({
        title: 'Error',
        description: 'Failed to save comment',
        variant: 'destructive'
      });
    }
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

  /** Hero uses same RPC; prefer these when feed rows are empty so copy never contradicts the band stats */
  const statsReady = directoryStatsLoading !== true;
  const emptyFeedTimeline = statsReady
    ? (directoryTimelinePostCount ?? 0)
    : (feedEmptyInsight?.timelinePosts ?? 0);
  const emptyFeedVideos = statsReady
    ? (directoryShowcaseVideoCount ?? 0)
    : (feedEmptyInsight?.showcaseVideos ?? 0);

  const feedBody = (
    <>
      <div id="builder-feed-composer-anchor" className="scroll-mt-24">
      {canPost ? (
        <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-3 sm:px-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-3">
              <Avatar 
                className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-blue-500 transition-all"
                onClick={() => {
                  // Navigate to user's profile
                  if (effectiveUserId) {
                    window.location.href = `/builder-profile/${effectiveUserId}`;
                  }
                }}
              >
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
                
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Posts are public. Anyone can like or comment—signed in or not.
                  </p>
                  {postLocation && (
                    <Badge variant="secondary" className="gap-1 w-fit">
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
          </div>
        </div>
      ) : effectiveIsBuilder ? (
        <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-3 sm:px-4 bg-gradient-to-r from-green-50/90 to-emerald-50/90 dark:from-gray-800/80 dark:to-gray-900/80">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Video className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Welcome, CO/Contractor!</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Post from your dashboard or expand below when available.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 shrink-0"
                onClick={() => { window.location.href = '/professional-builder-dashboard'; }}
              >
                Dashboard
              </Button>
          </div>
        </div>
      ) : (
        <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-3 sm:px-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-gray-800/80 dark:to-gray-900/80">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Want to share your projects?</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Register as a CO/contractor to post updates. Everyone can browse, like, and comment—no account required to react.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                {/* For visitors not logged in - go to registration */}
                {!effectiveUserId ? (
                  <>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.location.href = '/professional-builder-registration'}
                    >
                      Register as CO/Contractor
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
                    Become a CO/Contractor
                  </Button>
                )}
              </div>
            </div>
        </div>
      )}
      </div>

      <BuilderStories
        embedded
        currentUserId={effectiveUserId || undefined}
        currentUserName={effectiveUserName}
        currentUserAvatar={currentUserAvatar}
        isBuilder={canPost}
        onCreateStory={() => setIsCreatingPost(true)}
      />

      <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-gray-900">
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setFeedType('all')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 sm:px-4 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
              feedType === 'all'
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">For You</span>
            <span className="sm:hidden">For You</span>
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 sm:px-4 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
              feedType === 'following'
                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Following</span>
          </button>
          <button
            onClick={() => setFeedType('live')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 sm:px-4 font-medium transition-all border-b-2 whitespace-nowrap text-sm ${
              feedType === 'live'
                ? 'text-red-600 border-red-600 bg-red-50/50'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>Live</span>
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </button>
        </div>

        <div className="px-2 py-2 sm:px-3 sm:py-2 flex items-center gap-2 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/30">
          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[110px] sm:w-[130px] h-8 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0 text-xs sm:text-sm flex-shrink-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </SelectContent>
          </Select>

          {/* Location Filter - Hidden on very small screens */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-8 sm:h-9 rounded-full bg-gray-100 dark:bg-gray-800 border-0 text-xs sm:text-sm flex-shrink-0">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-gray-500" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map(loc => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Specialty Filter - Hidden on mobile */}
          <div className="hidden sm:block">
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
          </div>

          {/* Clear Filters */}
          {(locationFilter !== 'All Locations' || specialtyFilter !== 'All Specialties' || sortBy !== 'recent') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-9 px-2 sm:px-3 text-gray-500 hover:text-gray-700 flex-shrink-0"
              onClick={() => {
                setLocationFilter('All Locations');
                setSpecialtyFilter('All Specialties');
                setSortBy('recent');
              }}
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Clear</span>
            </Button>
          )}

          {/* Saved Posts Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 sm:h-9 px-2 sm:px-3 ml-auto rounded-full flex-shrink-0 ${savedPosts.size > 0 ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Saved ({savedPosts.size})</span>
            <span className="sm:hidden ml-1">{savedPosts.size}</span>
          </Button>
        </div>
      </div>

      {feedType === 'live' && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2.5 sm:px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <Radio className="h-6 w-6 animate-pulse" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm leading-tight">Live from construction sites</h3>
                  <p className="text-white/85 text-xs truncate">Real-time updates across Kenya</p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 text-xs shrink-0">3 live</Badge>
            </div>
        </div>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {loadingPosts ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground">Loading posts…</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <Video className="h-10 w-10 text-gray-400 mb-2" />
              {emptyFeedTimeline === 0 && emptyFeedVideos > 0 ? (
                <>
                  <h3 className="font-semibold text-base mb-1">No timeline posts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    There are public project videos in{' '}
                    <strong className="text-foreground">Project Showcase</strong>—this tab only lists social feed
                    posts. Open the showcase tab to watch and react.
                  </p>
                  {onOpenProjectShowcase && (
                    <Button type="button" className="rounded-full" onClick={onOpenProjectShowcase}>
                      Open Project Showcase
                    </Button>
                  )}
                </>
              ) : emptyFeedTimeline > 0 ? (
                <>
                  <h3 className="font-semibold text-base mb-1">Couldn&apos;t load posts</h3>
                  <p className="text-sm text-muted-foreground">
                    The site reports {emptyFeedTimeline}+ public timeline posts, but none loaded here. Run Supabase
                    migrations (including{' '}
                    <code className="text-xs bg-muted px-1 rounded">get_public_builder_feed_posts</code>) and deploy
                    the latest frontend, then hard-refresh.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-base mb-1">No posts yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Be the first to share your construction projects!
                  </p>
                </>
              )}
          </div>
        ) : filteredPosts.map((post) => (
          <div key={post.id} className="relative">
            <BuilderVideoPost
              {...post}
              embedded
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

      {!loadingPosts && filteredPosts.length > 0 && hasMorePosts && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-3 text-center bg-slate-50/40 dark:bg-slate-900/20">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Load more posts'
            )}
          </Button>
        </div>
      )}

      {!loadingPosts && filteredPosts.length > 0 && !hasMorePosts && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 text-center text-gray-500 text-xs">
          You&apos;ve seen all posts.
        </div>
      )}
    </>
  );

  if (omitOuterCard) {
    return <div className="w-full min-w-0">{feedBody}</div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-1 sm:px-0">
      <Card className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 shadow-sm">
        {feedBody}
      </Card>
    </div>
  );
};

export default BuilderFeed;
