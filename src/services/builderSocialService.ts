import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES
// ============================================================

export interface BuilderStory {
  id: string;
  builder_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  caption?: string;
  location?: string;
  duration: number;
  views_count: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  builder?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
}

export interface BuilderPost {
  id: string;
  builder_id: string;
  post_type: 'video' | 'image' | 'text' | 'project_update';
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  location?: string;
  privacy: 'public' | 'followers' | 'private';
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  status: string;
  created_at: string;
  builder?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  likes_count: number;
  is_pinned: boolean;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
  replies?: PostComment[];
  is_liked?: boolean;
}

export interface LiveStream {
  id: string;
  builder_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  stream_url?: string;
  location?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  peak_viewers: number;
  total_viewers: number;
  likes_count: number;
  comments_count: number;
  builder?: {
    full_name: string;
    company_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  actor_id?: string;
  reference_type?: string;
  reference_id?: string;
  image_url?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  actor?: {
    full_name: string;
    avatar_url?: string;
  };
}

// ============================================================
// STORIES SERVICE
// ============================================================

export const storiesService = {
  // Get active stories for feed
  async getActiveStories(): Promise<BuilderStory[]> {
    const { data, error } = await supabase
      .from('builder_stories')
      .select(`
        *,
        builder:profiles!builder_id(full_name, company_name, avatar_url, is_verified)
      `)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get stories by builder
  async getBuilderStories(builderId: string): Promise<BuilderStory[]> {
    const { data, error } = await supabase
      .from('builder_stories')
      .select('*')
      .eq('builder_id', builderId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new story
  async createStory(story: {
    media_url: string;
    media_type: 'image' | 'video';
    thumbnail_url?: string;
    caption?: string;
    location?: string;
    duration?: number;
  }): Promise<BuilderStory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('builder_stories')
      .insert({
        builder_id: user.id,
        ...story,
        duration: story.duration || 5
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark story as viewed
  async viewStory(storyId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.rpc('increment_story_views', {
      p_story_id: storyId,
      p_viewer_id: user?.id || null
    });
  },

  // React to a story
  async reactToStory(storyId: string, reactionType: string, message?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('story_reactions')
      .upsert({
        story_id: storyId,
        user_id: user.id,
        reaction_type: reactionType,
        message
      });

    if (error) throw error;
  },

  // Delete a story
  async deleteStory(storyId: string): Promise<void> {
    const { error } = await supabase
      .from('builder_stories')
      .update({ is_active: false })
      .eq('id', storyId);

    if (error) throw error;
  }
};

// ============================================================
// POSTS SERVICE
// ============================================================

export const postsService = {
  // Get feed posts
  async getFeedPosts(options?: {
    location?: string;
    sortBy?: 'recent' | 'popular' | 'trending';
    limit?: number;
    offset?: number;
  }): Promise<BuilderPost[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('builder_posts')
      .select(`
        *,
        builder:profiles!builder_id(full_name, company_name, avatar_url, is_verified)
      `)
      .eq('status', 'active')
      .eq('privacy', 'public');

    // Apply location filter
    if (options?.location && options.location !== 'All Locations') {
      query = query.ilike('location', `%${options.location}%`);
    }

    // Apply sorting
    if (options?.sortBy === 'popular') {
      query = query.order('likes_count', { ascending: false });
    } else if (options?.sortBy === 'trending') {
      // Trending = recent + engagement
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Check if user has liked/bookmarked each post
    if (user && data) {
      const postIds = data.map(p => p.id);
      
      const [likesRes, bookmarksRes] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds),
        supabase
          .from('user_bookmarks')
          .select('post_id')
          .eq('user_id', user.id)
          .eq('bookmark_type', 'post')
          .in('post_id', postIds)
      ]);

      const likedPostIds = new Set(likesRes.data?.map(l => l.post_id) || []);
      const bookmarkedPostIds = new Set(bookmarksRes.data?.map(b => b.post_id) || []);

      return data.map(post => ({
        ...post,
        is_liked: likedPostIds.has(post.id),
        is_bookmarked: bookmarkedPostIds.has(post.id)
      }));
    }

    return data || [];
  },

  // Get posts by builder
  async getBuilderPosts(builderId: string): Promise<BuilderPost[]> {
    const { data, error } = await supabase
      .from('builder_posts')
      .select(`
        *,
        builder:profiles!builder_id(full_name, company_name, avatar_url, is_verified)
      `)
      .eq('builder_id', builderId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new post
  async createPost(post: {
    post_type: 'video' | 'image' | 'text' | 'project_update';
    media_url?: string;
    thumbnail_url?: string;
    caption?: string;
    location?: string;
    privacy?: 'public' | 'followers' | 'private';
    project_id?: string;
  }): Promise<BuilderPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('builder_posts')
      .insert({
        builder_id: user.id,
        ...post,
        privacy: post.privacy || 'public'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Like a post
  async likePost(postId: string, reactionType: string = 'like'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('post_likes')
      .upsert({
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType
      });

    if (error) throw error;
  },

  // Unlike a post
  async unlikePost(postId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // Get post comments
  async getPostComments(postId: string): Promise<PostComment[]> {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        user:profiles!user_id(full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .eq('status', 'active')
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get replies for each comment
    if (data && data.length > 0) {
      const commentIds = data.map(c => c.id);
      const { data: replies } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url)
        `)
        .in('parent_comment_id', commentIds)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      const repliesMap = new Map<string, PostComment[]>();
      replies?.forEach(reply => {
        const parentId = reply.parent_comment_id!;
        if (!repliesMap.has(parentId)) {
          repliesMap.set(parentId, []);
        }
        repliesMap.get(parentId)!.push(reply);
      });

      return data.map(comment => ({
        ...comment,
        replies: repliesMap.get(comment.id) || []
      }));
    }

    return data || [];
  },

  // Add a comment
  async addComment(postId: string, content: string, parentCommentId?: string): Promise<PostComment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId
      })
      .select(`
        *,
        user:profiles!user_id(full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a post
  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase
      .from('builder_posts')
      .update({ status: 'deleted' })
      .eq('id', postId);

    if (error) throw error;
  },

  // Update a post
  async updatePost(postId: string, updates: Partial<BuilderPost>): Promise<void> {
    const { error } = await supabase
      .from('builder_posts')
      .update(updates)
      .eq('id', postId);

    if (error) throw error;
  }
};

// ============================================================
// BOOKMARKS SERVICE
// ============================================================

export const bookmarksService = {
  // Get user bookmarks
  async getUserBookmarks(bookmarkType?: string): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('user_bookmarks')
      .select('*')
      .eq('user_id', user.id);

    if (bookmarkType) {
      query = query.eq('bookmark_type', bookmarkType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Bookmark a post
  async bookmarkPost(postId: string, collectionName?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_bookmarks')
      .upsert({
        user_id: user.id,
        bookmark_type: 'post',
        post_id: postId,
        collection_name: collectionName || 'Saved'
      });

    if (error) throw error;
  },

  // Remove bookmark
  async removeBookmark(bookmarkType: string, itemId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('user_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('bookmark_type', bookmarkType);

    if (bookmarkType === 'post') {
      query = query.eq('post_id', itemId);
    } else if (bookmarkType === 'builder') {
      query = query.eq('builder_id', itemId);
    }

    const { error } = await query;
    if (error) throw error;
  }
};

// ============================================================
// FOLLOWERS SERVICE
// ============================================================

export const followersService = {
  // Follow a builder
  async followBuilder(builderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('builder_followers')
      .insert({
        follower_id: user.id,
        builder_id: builderId
      });

    if (error) throw error;
  },

  // Unfollow a builder
  async unfollowBuilder(builderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('builder_followers')
      .delete()
      .eq('follower_id', user.id)
      .eq('builder_id', builderId);

    if (error) throw error;
  },

  // Check if following
  async isFollowing(builderId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('builder_followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('builder_id', builderId)
      .single();

    return !!data;
  },

  // Get builder followers
  async getBuilderFollowers(builderId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('builder_followers')
      .select(`
        *,
        follower:profiles!follower_id(full_name, avatar_url)
      `)
      .eq('builder_id', builderId);

    if (error) throw error;
    return data || [];
  },

  // Get user following
  async getUserFollowing(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('builder_followers')
      .select(`
        *,
        builder:profiles!builder_id(full_name, company_name, avatar_url, is_verified)
      `)
      .eq('follower_id', userId);

    if (error) throw error;
    return data || [];
  }
};

// ============================================================
// LIVE STREAMS SERVICE
// ============================================================

export const liveStreamsService = {
  // Get active live streams
  async getActiveLiveStreams(): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('builder_live_streams')
      .select(`
        *,
        builder:profiles!builder_id(full_name, company_name, avatar_url, is_verified)
      `)
      .eq('status', 'live')
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get scheduled streams
  async getScheduledStreams(): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('builder_live_streams')
      .select(`
        *,
        builder:profiles!builder_id(full_name, company_name, avatar_url, is_verified)
      `)
      .eq('status', 'scheduled')
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create a live stream
  async createLiveStream(stream: {
    title: string;
    description?: string;
    thumbnail_url?: string;
    location?: string;
    scheduled_at?: string;
  }): Promise<LiveStream> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const streamKey = `sk_${user.id}_${Date.now()}`;

    const { data, error } = await supabase
      .from('builder_live_streams')
      .insert({
        builder_id: user.id,
        ...stream,
        stream_key: streamKey,
        status: stream.scheduled_at ? 'scheduled' : 'live',
        started_at: stream.scheduled_at ? null : new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // End a live stream
  async endLiveStream(streamId: string): Promise<void> {
    const { error } = await supabase
      .from('builder_live_streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', streamId);

    if (error) throw error;
  }
};

// ============================================================
// NOTIFICATIONS SERVICE
// ============================================================

export const notificationsService = {
  // Get user notifications
  async getUserNotifications(limit: number = 50): Promise<UserNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_notifications')
      .select(`
        *,
        actor:profiles!actor_id(full_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  },

  // Mark as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  }
};

// ============================================================
// CONTENT REPORTS SERVICE
// ============================================================

export const reportsService = {
  // Report content
  async reportContent(report: {
    content_type: 'post' | 'comment' | 'story' | 'live_stream' | 'profile';
    content_id: string;
    reason: string;
    description?: string;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        ...report
      });

    if (error) throw error;
  }
};

// Export all services
export const builderSocialService = {
  stories: storiesService,
  posts: postsService,
  bookmarks: bookmarksService,
  followers: followersService,
  liveStreams: liveStreamsService,
  notifications: notificationsService,
  reports: reportsService
};

export default builderSocialService;
