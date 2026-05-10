import { readPersistedAuthRawStringSync } from '@/utils/supabaseAccessToken';
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BuilderVideoPost, BuilderVideoPostProps, VideoComment } from './BuilderVideoPost';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getBuilderFeedGuestId } from '@/utils/builderFeedGuestId';
import { mergeViewerReactionsWithLocalFallback, setFeedReactionCache } from '@/utils/builderFeedReactionCache';
import { Link } from 'react-router-dom';
import { Loader2, Image as ImageIcon, FileVideo, X, Upload } from 'lucide-react';
import type { PublicSupplierDirectoryRow } from '@/utils/fetchPublicSupplierDirectory';

function asRestArray<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

interface SupplierMarketingFeedProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserRole?: string;
  isSupplier?: boolean;
  /** Lookup supplier_user_id → directory row (company, logo, etc.) */
  supplierByUserId: Map<string, PublicSupplierDirectoryRow>;
  omitOuterCard?: boolean;
  /** Public market hub: false — post only from supplier dashboard. */
  showComposer?: boolean;
  /** Dashboard: merge own pending video posts into the list. */
  includeAuthorPendingVideos?: boolean;
}

type SupplierPostRow = Omit<
  BuilderVideoPostProps,
  'onLike' | 'onComment' | 'onShare' | 'onViewProfile' | 'onContactBuilder' | 'onReact'
> & {
  userReaction: string | null;
};

const POSTS_PER_PAGE = 10;

export const SupplierMarketingFeed: React.FC<SupplierMarketingFeedProps> = ({
  currentUserId,
  currentUserName = 'Guest',
  currentUserAvatar,
  currentUserRole,
  isSupplier = false,
  supplierByUserId,
  omitOuterCard = false,
  showComposer = false,
  includeAuthorPendingVideos = false,
}) => {
  const { toast } = useToast();
  const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
  const storedUserName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;

  const effectiveUserId = currentUserId || storedUserId || undefined;
  const effectiveRole = currentUserRole || storedRole;
  const effectiveUserName =
    currentUserName !== 'Guest' ? currentUserName : storedUserName || 'Guest';

  const canPost =
    showComposer &&
    (isSupplier || effectiveRole === 'supplier' || storedRole === 'supplier');

  const [posts, setPosts] = useState<SupplierPostRow[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsOffset, setPostsOffset] = useState(0);

  const [newPostText, setNewPostText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const authHeaders = useCallback(() => {
    let accessToken = '';
    try {
      const raw = readPersistedAuthRawStringSync();
      if (raw) {
        const parsed = JSON.parse(raw);
        accessToken = parsed.access_token || '';
      }
    } catch {
      /* ignore */
    }
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    } as const;
  }, []);

  const fetchPosts = async (offset: number, isInitial: boolean) => {
    if (isInitial) {
      setLoadingPosts(true);
      setPostsOffset(0);
      setHasMorePosts(true);
    } else {
      setLoadingMore(true);
    }

    const limitPlusOne = POSTS_PER_PAGE + 1;
    let rows: Record<string, unknown>[] = [];

    try {
      const { data, error } = await (supabase as any).rpc('get_public_supplier_feed_posts', {
        p_limit: limitPlusOne,
        p_offset: offset,
      });
      if (!error && Array.isArray(data)) {
        rows = data as Record<string, unknown>[];
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_supplier_feed_posts`, {
          method: 'POST',
          headers: {
            ...authHeaders(),
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_limit: limitPlusOne, p_offset: offset }),
        });
        const json = await res.json();
        if (res.ok && Array.isArray(json)) {
          rows = json as Record<string, unknown>[];
        }
      }
    } catch (e) {
      console.warn('supplier feed fetch:', e);
    }

    if (rows.length === 0) {
      if (isInitial) setPosts([]);
      setHasMorePosts(false);
      setLoadingPosts(false);
      setLoadingMore(false);
      return;
    }

    const hasMore = rows.length > POSTS_PER_PAGE;
    setHasMorePosts(hasMore);
    const slice: Record<string, unknown>[] = hasMore
      ? rows.slice(0, POSTS_PER_PAGE)
      : [...rows];

    if (
      includeAuthorPendingVideos &&
      effectiveUserId &&
      isInitial &&
      offset === 0
    ) {
      try {
        const pr = await fetch(
          `${SUPABASE_URL}/rest/v1/supplier_marketing_posts?supplier_user_id=eq.${effectiveUserId}&status=eq.pending&video_url=not.is.null&order=created_at.desc&limit=20`,
          { headers: authHeaders() }
        );
        if (pr.ok) {
          const pendingRaw = asRestArray<Record<string, unknown>>(await pr.json());
          const seen = new Set(slice.map((p) => p.id as string));
          for (const row of pendingRaw) {
            const id = row.id as string;
            if (id && !seen.has(id)) {
              slice.push(row);
              seen.add(id);
            }
          }
          slice.sort(
            (a, b) =>
              new Date(String(b.created_at)).getTime() -
              new Date(String(a.created_at)).getTime()
          );
        }
      } catch {
        /* ignore */
      }
    }

    let accessToken = '';
    try {
      const raw = readPersistedAuthRawStringSync();
      if (raw) accessToken = JSON.parse(raw).access_token || '';
    } catch {
      /* ignore */
    }
    const h = authHeaders();

    const postIds = slice.map((p) => String(p.id || '')).filter(Boolean);
    let commentsData: any[] = [];
    if (postIds.length) {
      try {
        const cr = await fetch(
          `${SUPABASE_URL}/rest/v1/supplier_post_comments?post_id=in.(${postIds.join(',')})&order=created_at.desc`,
          { headers: h }
        );
        if (cr.ok) commentsData = asRestArray(await cr.json());
      } catch {
        /* ignore */
      }
    }

    let sessionUserId: string | null = null;
    try {
      const raw = readPersistedAuthRawStringSync();
      if (raw) sessionUserId = JSON.parse(raw).user?.id ?? null;
    } catch {
      /* ignore */
    }
    const userIdForLikes = effectiveUserId || sessionUserId;
    const guestId = !userIdForLikes ? getBuilderFeedGuestId() : '';
    let reactionByPost = new Map<string, string>();
    let reactionsFetchOk = false;

    if (postIds.length) {
      try {
        if (userIdForLikes) {
          const q = `${SUPABASE_URL}/rest/v1/supplier_post_likes?user_id=eq.${userIdForLikes}&post_id=in.(${postIds.join(',')})&select=`;
          let lr = await fetch(`${q}post_id,reaction`, { headers: h });
          if (!lr.ok) lr = await fetch(`${q}post_id`, { headers: h });
          if (lr.ok) {
            reactionsFetchOk = true;
            asRestArray<{ post_id: string; reaction?: string }>(await lr.json()).forEach((l) => {
              if (l.post_id) reactionByPost.set(l.post_id, (l.reaction as string) || '👍');
            });
          }
        } else if (guestId) {
          const enc = encodeURIComponent(guestId);
          const q = `${SUPABASE_URL}/rest/v1/supplier_post_likes?post_id=in.(${postIds.join(',')})&user_id=is.null&guest_identifier=eq.${enc}&select=`;
          let lr = await fetch(`${q}post_id,reaction`, { headers: h });
          if (!lr.ok) lr = await fetch(`${q}post_id`, { headers: h });
          if (lr.ok) {
            reactionsFetchOk = true;
            asRestArray<{ post_id: string; reaction?: string }>(await lr.json()).forEach((l) => {
              if (l.post_id) reactionByPost.set(l.post_id, (l.reaction as string) || '👍');
            });
          }
        }
      } catch {
        reactionsFetchOk = false;
      }
    } else {
      reactionsFetchOk = true;
    }

    reactionByPost = mergeViewerReactionsWithLocalFallback(
      'supplier',
      reactionByPost,
      postIds,
      reactionsFetchOk,
    );

    const mapped: SupplierPostRow[] = slice.map((post: Record<string, unknown>) => {
      const row = post as any;
      const uid = row.supplier_user_id as string;
      const sup = supplierByUserId.get(uid);
      const postComments = commentsData
        .filter((c: any) => c.post_id === row.id)
        .map((c: any) => ({
          id: c.id,
          userId: c.user_id || '',
          userName: c.commenter_name || 'Visitor',
          userAvatar: undefined,
          content: c.content,
          timestamp: new Date(c.created_at),
          likes: 0,
          isLiked: false,
        })) as VideoComment[];

      const imgs = Array.isArray(row.image_urls) ? row.image_urls : [];
      const firstImage = typeof imgs[0] === 'string' ? imgs[0] : '';

      return {
        id: row.id,
        builderId: uid,
        builderName: sup?.company_name || 'Supplier',
        builderCompany: sup?.company_name || '',
        builderAvatar: sup?.logo_url || '',
        builderVerified: !!sup?.is_verified,
        videoUrl: row.video_url || '',
        imageUrl: firstImage,
        thumbnailUrl: row.thumbnail_url || '',
        caption: row.content || '',
        location: sup?.location || '',
        timestamp: new Date(row.created_at),
        likes: row.likes_count || 0,
        shares: 0,
        isLiked: reactionByPost.has(row.id),
        userReaction: reactionByPost.get(row.id) || null,
        comments: postComments,
        embedded: true,
      };
    });

    if (isInitial) {
      setPosts(mapped);
    } else {
      setPosts((prev) => [...prev, ...mapped]);
    }
    setPostsOffset(offset + mapped.length);
    setLoadingPosts(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    void fetchPosts(0, true);
  }, [includeAuthorPendingVideos]);

  useEffect(() => {
    if (loadingPosts) return;
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw.startsWith('supplier-market-hub-post-')) return;
    const t = window.setTimeout(() => {
      document.getElementById(raw)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [loadingPosts]);

  useEffect(() => {
    setPosts((prev) =>
      prev.map((p) => {
        const sup = supplierByUserId.get(p.builderId);
        if (!sup) return p;
        return {
          ...p,
          builderName: sup.company_name || p.builderName,
          builderCompany: sup.company_name || '',
          builderAvatar: sup.logo_url || p.builderAvatar,
          builderVerified: !!sup.is_verified,
          location: sup.location || p.location || '',
        };
      })
    );
  }, [supplierByUserId]);

  const deleteSupplierLikeRemote = async (postId: string) => {
    const headers = {
      ...authHeaders(),
      'Content-Type': 'application/json',
    } as const;
    let userId: string | null = effectiveUserId || null;
    if (!userId) {
      try {
        const raw = readPersistedAuthRawStringSync();
        if (raw) userId = JSON.parse(raw).user?.id ?? null;
      } catch {
        /* ignore */
      }
    }
    const guestId = !userId ? getBuilderFeedGuestId() : '';

    if (userId) {
      const del = await fetch(
        `${SUPABASE_URL}/rest/v1/supplier_post_likes?post_id=eq.${postId}&user_id=eq.${userId}`,
        { method: 'DELETE', headers }
      );
      if (!del.ok) {
        const err = await del.text();
        throw new Error(err || 'Unlike failed');
      }
      return;
    }
    if (!guestId) throw new Error('no guest id');
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_guest_supplier_post_like`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_post_id: postId, p_guest: guestId }),
    });
    if (!rpc.ok) {
      const err = await rpc.text();
      throw new Error(err || 'Unlike failed');
    }
  };

  const insertSupplierLikeRemote = async (postId: string, reaction: string) => {
    let userId = effectiveUserId || null;
    if (!userId) {
      try {
        const raw = readPersistedAuthRawStringSync();
        if (raw) userId = JSON.parse(raw).user?.id ?? null;
      } catch {
        /* ignore */
      }
    }
    const guestId = !userId ? getBuilderFeedGuestId() : '';
    if (!userId && (!guestId || guestId.length < 8)) {
      throw new Error('guest');
    }
    const headers = {
      ...authHeaders(),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    } as const;
    const bodyWith = userId
      ? { post_id: postId, user_id: userId, reaction }
      : { post_id: postId, user_id: null, guest_identifier: guestId, reaction };
    const bodyBare = userId
      ? { post_id: postId, user_id: userId }
      : { post_id: postId, user_id: null, guest_identifier: guestId };

    const postOnce = (body: object) =>
      fetch(`${SUPABASE_URL}/rest/v1/supplier_post_likes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

    let ins = await postOnce(bodyWith);
    let err = await ins.text();
    if (!ins.ok) {
      const maybeMissingReactionCol =
        ins.status === 400 &&
        (/reaction/i.test(err) || /schema cache/i.test(err) || /column/i.test(err));
      if (maybeMissingReactionCol) {
        ins = await postOnce(bodyBare);
        err = await ins.text();
      }
    }
    if (!ins.ok) {
      throw new Error(err || 'Like failed');
    }
    setFeedReactionCache('supplier', postId, reaction);
  };

  const handleReact = async (postId: string, incoming: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    let userId: string | null = effectiveUserId || null;
    if (!userId) {
      try {
        const raw = readPersistedAuthRawStringSync();
        if (raw) userId = JSON.parse(raw).user?.id ?? null;
      } catch {
        /* ignore */
      }
    }
    const guestId = !userId ? getBuilderFeedGuestId() : '';
    if (!userId && !guestId) {
      toast({
        title: 'Allow storage or sign in',
        description: 'We need a saved visitor id or account to record reactions.',
        variant: 'destructive',
      });
      return;
    }

    const current = post.userReaction;
    const isUnlike = incoming === '';
    const sameAgain = !isUnlike && current && incoming === current;

    const nextReaction = isUnlike || sameAgain ? null : incoming;
    const prevCount = post.likes;

    const optimistic = (patch: Partial<SupplierPostRow>) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, ...patch } : p))
      );
    };

    if (nextReaction === null) {
      optimistic({
        userReaction: null,
        isLiked: false,
        likes: Math.max(0, prevCount - 1),
      });
      try {
        await deleteSupplierLikeRemote(postId);
        setFeedReactionCache('supplier', postId, null);
      } catch {
        optimistic({ userReaction: current, isLiked: !!current, likes: prevCount });
        toast({ title: 'Could not update', variant: 'destructive' });
      }
      return;
    }

    const hadReaction = !!current;
    const switching = hadReaction && current !== nextReaction;
    optimistic({
      userReaction: nextReaction,
      isLiked: true,
      likes: switching || hadReaction ? prevCount : prevCount + 1,
    });

    try {
      if (switching) {
        await deleteSupplierLikeRemote(postId);
      }
      await insertSupplierLikeRemote(postId, nextReaction);
    } catch {
      optimistic({ userReaction: current, isLiked: !!current, likes: prevCount });
      toast({ title: 'Could not save reaction', variant: 'destructive' });
    }
  };

  const handleComment = async (postId: string, comment: string) => {
    if (!comment.trim()) return;
    const userId = effectiveUserId || null;
    const guestId = !userId ? getBuilderFeedGuestId() : '';
    if (!userId && !guestId) {
      toast({
        title: 'Cannot comment',
        description: 'Allow storage or sign in to comment.',
        variant: 'destructive',
      });
      return;
    }
    const commenterLabel =
      userId && effectiveUserName !== 'Guest' ? effectiveUserName : userId ? effectiveUserName : 'Visitor';

    const tempId = `temp-${Date.now()}`;
    const newComment: VideoComment = {
      id: tempId,
      userId: userId || '',
      userName: commenterLabel,
      userAvatar: currentUserAvatar,
      content: comment,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
    };

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [newComment, ...p.comments], likes: p.likes }
          : p
      )
    );

    const payload = userId
      ? { post_id: postId, user_id: userId, commenter_name: commenterLabel, content: comment }
      : {
          post_id: postId,
          user_id: null,
          guest_identifier: guestId,
          commenter_name: commenterLabel,
          content: comment,
        };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/supplier_post_comments`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const body = await res.json();
      const saved = Array.isArray(body) ? body[0] : body;
      if (saved?.id) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const rest = p.comments.filter((c) => c.id !== tempId);
            const row = saved as any;
            const persisted: VideoComment = {
              id: row.id,
              userId: row.user_id || '',
              userName: row.commenter_name || commenterLabel,
              content: row.content,
              timestamp: new Date(row.created_at),
              likes: 0,
              isLiked: false,
            };
            return { ...p, comments: [persisted, ...rest] };
          })
        );
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.filter((c) => c.id !== tempId) }
            : p
        )
      );
      toast({ title: 'Comment not saved', variant: 'destructive' });
    }
  };

  const handleShare = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, shares: (p.shares || 0) + 1 } : p))
    );
  };

  const handlePost = async () => {
    if (!newPostText.trim() && !selectedVideo && !selectedPhoto) return;
    if (!canPost) {
      toast({
        title: 'Suppliers only',
        description: 'Sign in with a supplier account to post here.',
        variant: 'destructive',
      });
      return;
    }

    let userId: string | null = null;
    try {
      const raw = readPersistedAuthRawStringSync();
      if (raw) userId = JSON.parse(raw).user?.id;
    } catch {
      /* ignore */
    }
    if (!userId) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }

    setIsPosting(true);
    let accessToken = '';
    try {
      const raw = readPersistedAuthRawStringSync();
      if (raw) accessToken = JSON.parse(raw).access_token || '';
    } catch {
      /* ignore */
    }

    let videoUrl = '';
    let imageUrls: string[] = [];

    const uploadBinary = async (file: File, path: string) => {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/builder-videos/${path}`;
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status)));
        xhr.onerror = () => reject(new Error('network'));
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken || SUPABASE_ANON_KEY}`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(file);
      });
      return `${SUPABASE_URL}/storage/v1/object/public/builder-videos/${path}`;
    };

    try {
      if (selectedVideo) {
        const ext = selectedVideo.name.split('.').pop() || 'mp4';
        const path = `${userId}/supplier/${Date.now()}.${ext}`;
        videoUrl = await uploadBinary(selectedVideo, path);
      }
      if (selectedPhoto) {
        const ext = selectedPhoto.name.split('.').pop() || 'jpg';
        const path = `${userId}/supplier/photos/${Date.now()}.${ext}`;
        imageUrls = [await uploadBinary(selectedPhoto, path)];
      }

      const insertBody = {
        supplier_user_id: userId,
        content: newPostText.trim() || null,
        video_url: videoUrl || null,
        image_urls: imageUrls,
        thumbnail_url: null,
        status: videoUrl ? 'pending' : 'active',
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/supplier_marketing_posts`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(insertBody),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      if (videoUrl) {
        toast({
          title: 'Video submitted',
          description: 'An admin will review it before it appears on the public market hub.',
        });
      } else {
        toast({ title: 'Posted', description: 'Your update is live on the supplier feed.' });
      }
      setNewPostText('');
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setSelectedVideo(null);
      setSelectedPhoto(null);
      setVideoPreview(null);
      setPhotoPreview(null);
      await fetchPosts(0, true);
    } catch (e: any) {
      toast({
        title: 'Post failed',
        description: e?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
    }
  };

  const inner = (
    <div className="space-y-3">
      {!showComposer ? (
        <Card
          id="supplier-feed-composer-anchor"
          className="p-3 border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 scroll-mt-24"
        >
          <p className="text-sm text-muted-foreground text-center mb-2">
            Suppliers publish marketing posts from the supplier dashboard. Videos require admin approval before they
            appear publicly.
          </p>
          <div className="flex justify-center">
            <Button size="sm" asChild className="bg-amber-600 hover:bg-amber-700">
              <Link to="/supplier-dashboard?tab=market-hub">Supplier dashboard</Link>
            </Button>
          </div>
        </Card>
      ) : null}
      {canPost && (
        <Card
          id="supplier-feed-composer-anchor"
          className="p-3 border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 scroll-mt-24"
        >
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-2">
            Share products, photos, or a short video with buyers.
          </p>
          <Textarea
            placeholder="What is on your mind?"
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            className="min-h-[72px] mb-2"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs bg-white dark:bg-gray-900">
                <ImageIcon className="h-3.5 w-3.5" />
                Photo
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setSelectedPhoto(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs bg-white dark:bg-gray-900">
                <FileVideo className="h-3.5 w-3.5" />
                Video
              </span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setSelectedVideo(f);
                    setVideoPreview(URL.createObjectURL(f));
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <Button
              size="sm"
              className="ml-auto bg-amber-600 hover:bg-amber-700"
              disabled={isPosting}
              onClick={() => void handlePost()}
            >
              {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="ml-1">Publish</span>
            </Button>
          </div>
          {(videoPreview || photoPreview) && (
            <div className="mt-2 flex flex-wrap gap-2 items-start">
              {photoPreview && (
                <div className="relative w-28 h-28 rounded border overflow-hidden">
                  <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black/60 rounded p-0.5"
                    onClick={() => {
                      setSelectedPhoto(null);
                      URL.revokeObjectURL(photoPreview);
                      setPhotoPreview(null);
                    }}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}
              {videoPreview && (
                <div className="relative rounded border overflow-hidden max-w-xs">
                  <video src={videoPreview} className="max-h-40 w-full" muted playsInline />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-black/60 rounded p-0.5"
                    onClick={() => {
                      setSelectedVideo(null);
                      URL.revokeObjectURL(videoPreview);
                      setVideoPreview(null);
                    }}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {loadingPosts && posts.length === 0 ? (
        <div className="flex justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading supplier updates…
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No supplier posts yet. Verified suppliers can publish offers and updates here.
        </Card>
      ) : (
        posts.map((p) => (
          <div key={p.id} id={`supplier-market-hub-post-${p.id}`} className="scroll-mt-24">
            <BuilderVideoPost
              {...p}
              userReaction={p.userReaction}
              shareAnchorId={`supplier-market-hub-post-${p.id}`}
              onReact={(id, r) => void handleReact(id, r)}
              onComment={(id, c) => void handleComment(id, c)}
              onShare={handleShare}
              onViewProfile={() => {}}
              onContactBuilder={() => {}}
              contactActorLabel="Contact supplier"
            />
          </div>
        ))
      )}

      {hasMorePosts && !loadingPosts && posts.length > 0 && (
        <div className="flex justify-center py-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void fetchPosts(postsOffset, false)}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );

  if (omitOuterCard) return inner;
  return <Card className="p-3">{inner}</Card>;
};
