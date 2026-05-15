import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { readPersistedAuthRawStringSync } from "@/utils/supabaseAccessToken";
import { getBuilderFeedGuestId } from "@/utils/builderFeedGuestId";
import { getPublicVisitorDisplayName } from "@/utils/publicVisitorDisplayName";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Eye, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Clock, 
  DollarSign,
  Star,
  Trash2,
  Edit,
  Share2,
  ThumbsUp,
  MoreHorizontal,
  Globe,
  CheckCircle2,
  Loader2,
  Smile
} from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { formatDistanceToNow } from "date-fns";
import { SUPPORT_PHONE_PRIMARY } from "@/config/appIdentity";
import { fetchPublicBuilderShowcaseVideos } from "@/utils/fetchPublicBuilderShowcaseVideos";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { loadRecentCommentEmojis, pushRecentCommentEmoji } from "@/utils/commentEmojiRecent";

const GALLERY_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;
const COMMENT_QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🔥', '💪', '🏗️', '👏', '🎉', '✅', '⭐', '😍', '🤝', '💯'];

type GalleryComment = {
  id: string;
  commenter_name: string;
  comment_text: string;
  created_at: string;
  parent_comment_id?: string | null;
  replies?: GalleryComment[];
};

function organizeGalleryComments(rows: GalleryComment[]): GalleryComment[] {
  const map = new Map<string, GalleryComment>();
  const roots: GalleryComment[] = [];
  for (const row of rows) {
    map.set(row.id, { ...row, replies: [] });
  }
  for (const row of rows) {
    const node = map.get(row.id);
    if (!node) continue;
    if (row.parent_comment_id) {
      const parent = map.get(row.parent_comment_id);
      if (parent) parent.replies!.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function GalleryVideoCardActions({
  video,
  isLiked,
  browseOnly,
  onToggleLike,
  onShare,
  onOpenPlayer,
  onCommentPosted,
}: {
  video: BuilderVideo;
  isLiked: boolean;
  browseOnly?: boolean;
  onToggleLike: (e?: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onOpenPlayer: (e: React.MouseEvent) => void;
  onCommentPosted: () => void;
}) {
  const { toast } = useToast();
  const reactionRootRef = useRef<HTMLDivElement>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [pickedEmoji, setPickedEmoji] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenterName, setCommenterName] = useState(() => getPublicVisitorDisplayName() || '');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [recentCommentEmojis, setRecentCommentEmojis] = useState<string[]>([]);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const commentPickerEmojis = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of recentCommentEmojis) {
      if (!seen.has(e)) {
        seen.add(e);
        out.push(e);
      }
    }
    for (const e of COMMENT_QUICK_EMOJIS) {
      if (!seen.has(e)) {
        seen.add(e);
        out.push(e);
      }
    }
    return out;
  }, [recentCommentEmojis]);

  useEffect(() => {
    setRecentCommentEmojis(loadRecentCommentEmojis());
  }, []);

  useEffect(() => {
    if (!showReactions) return;
    const closeOnOutside = (ev: PointerEvent) => {
      const root = reactionRootRef.current;
      if (root && ev.target instanceof Node && root.contains(ev.target)) return;
      setShowReactions(false);
    };
    const id = window.setTimeout(() => document.addEventListener('pointerdown', closeOnOutside), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', closeOnOutside);
    };
  }, [showReactions]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const approvedOrLegacy = `video_id=eq.${video.id}&or=(is_approved.eq.true,is_approved.is.null)&order=created_at.asc&limit=80`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/video_comments?${approvedOrLegacy}`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (res.ok) {
        const rows = (await res.json()) as GalleryComment[];
        setComments(organizeGalleryComments(Array.isArray(rows) ? rows : []));
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showReactions) {
      e.preventDefault();
      setShowReactions(true);
      return;
    }
    onToggleLike(e);
    setShowReactions(false);
  };

  const pickReaction = (emoji: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPickedEmoji(emoji);
    setShowReactions(false);
    if (!isLiked) onToggleLike();
  };

  const toggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) void loadComments();
  };

  const startReply = (commentId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplyTo({ id: commentId, name });
    setCommentText(`@${name} `);
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setCommentText('');
  };

  const insertCommentEmoji = (emoji: string) => {
    setCommentText((prev) => `${prev}${emoji}`);
    setRecentCommentEmojis(pushRecentCommentEmoji(emoji));
    setEmojiPopoverOpen(false);
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = commentText.trim();
    const name = commenterName.trim() || getPublicVisitorDisplayName() || '';
    if (!text) {
      toast({ title: 'Comment required', variant: 'destructive' });
      return;
    }
    if (name.length < 2) {
      toast({ title: 'Name required', description: 'Enter your name to comment.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let userId: string | null = null;
      let accessToken = '';
      try {
        const raw = readPersistedAuthRawStringSync();
        if (raw) {
          const parsed = JSON.parse(raw);
          userId = parsed.user?.id ?? null;
          accessToken = parsed.access_token || '';
        }
      } catch {
        /* ignore */
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/video_comments`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          video_id: video.id,
          user_id: userId,
          commenter_name: name,
          comment_text: text,
          parent_comment_id: replyTo?.id ?? null,
          is_approved: true,
        }),
      });
      if (!res.ok) throw new Error('post failed');
      const wasReply = !!replyTo;
      setCommentText('');
      setReplyTo(null);
      onCommentPosted();
      toast({ title: wasReply ? 'Reply posted' : 'Comment posted' });
      await loadComments();
    } catch {
      toast({ title: 'Could not post comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (c: GalleryComment, isReply = false) => (
    <li key={c.id} className={isReply ? 'ml-6 mt-2 border-l-2 border-blue-100 pl-3' : ''}>
      <div className="text-sm">
        <span className="font-semibold text-gray-900">{c.commenter_name}</span>
        <span className="text-gray-600"> {c.comment_text}</span>
        <span className="text-gray-400 text-xs ml-2">
          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
        </span>
      </div>
      <button
        type="button"
        className="text-xs font-medium text-blue-600 hover:underline mt-0.5"
        onClick={(e) => startReply(c.id, c.commenter_name, e)}
      >
        Reply
      </button>
      {c.replies && c.replies.length > 0 && (
        <ul className="mt-1 space-y-1">
          {c.replies.map((r) => renderComment(r, true))}
        </ul>
      )}
    </li>
  );

  return (
    <>
      <div
        className="px-2 py-1 flex flex-wrap items-center gap-1 border-t border-b"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div ref={reactionRootRef} className="relative flex-1 min-w-[5rem] pb-1">
          {showReactions && (
            <div
              role="listbox"
              aria-label="Choose a reaction"
              className="absolute bottom-[calc(100%-4px)] left-1/2 z-[200] flex -translate-x-1/2 gap-0.5 rounded-full border border-gray-200 bg-white px-2 py-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {GALLERY_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji-native text-2xl min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 touch-manipulation"
                  onPointerDown={(e) => pickReaction(emoji, e)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            className={`w-full gap-1.5 h-10 text-sm ${isLiked ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}
            onClick={handleLikeClick}
          >
            {isLiked ? (
              <span className="emoji-native text-xl leading-none">{pickedEmoji || '👍'}</span>
            ) : (
              <ThumbsUp className="h-5 w-5 shrink-0" />
            )}
            <span>{isLiked ? 'Liked' : 'Like'}</span>
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className={`flex-1 min-w-[5rem] gap-1.5 h-10 text-sm ${commentsOpen ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={toggleComments}
        >
          <MessageCircle className="h-5 w-5 shrink-0" />
          <span>Comment</span>
        </Button>
        <Button type="button" variant="ghost" className="flex-1 min-w-[5rem] gap-1.5 h-10 text-sm text-gray-600" onClick={onShare}>
          <Share2 className="h-5 w-5 shrink-0" />
          <span>Share</span>
        </Button>
        {browseOnly && (
          <Button
            type="button"
            size="sm"
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPlayer(e);
            }}
          >
            <Play className="h-4 w-4 mr-1" />
            Watch
          </Button>
        )}
      </div>

      {commentsOpen && (
        <div className="px-4 py-3 border-b bg-white space-y-3" onClick={(e) => e.stopPropagation()}>
          {loadingComments ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet. Be the first.</p>
          ) : (
            <ul className="space-y-3 max-h-52 overflow-y-auto">
              {comments.map((c) => renderComment(c))}
            </ul>
          )}
          {replyTo && (
            <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
              <span>
                Replying to <strong>{replyTo.name}</strong>
              </span>
              <button type="button" className="font-medium hover:underline" onClick={cancelReply}>
                Cancel
              </button>
            </div>
          )}
          <form onSubmit={submitComment} className="space-y-2">
            {!getPublicVisitorDisplayName() && (
              <Input
                placeholder="Your name"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="h-9 text-sm"
              />
            )}
            <div className="flex flex-wrap items-center gap-0.5 pb-1 border-b border-gray-100">
              {commentPickerEmojis.slice(0, 10).map((em) => (
                <button
                  key={em}
                  type="button"
                  className="emoji-native text-xl min-h-9 min-w-9 flex items-center justify-center rounded-md hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
                  onClick={() => insertCommentEmoji(em)}
                  title="Add to comment"
                >
                  {em}
                </button>
              ))}
              <Popover
                open={emojiPopoverOpen}
                onOpenChange={(open) => {
                  setEmojiPopoverOpen(open);
                  if (open) setRecentCommentEmojis(loadRecentCommentEmojis());
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-md shrink-0"
                    aria-label="More emojis"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Smile className="h-5 w-5 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start" side="top" onClick={(e) => e.stopPropagation()}>
                  <p className="text-xs text-gray-500 mb-2 px-1">Tap to add to your comment</p>
                  <div className="grid grid-cols-6 gap-1 max-w-[240px]">
                    {commentPickerEmojis.map((em) => (
                      <button
                        key={`pop-${em}`}
                        type="button"
                        className="emoji-native text-2xl min-h-10 min-w-10 flex items-center justify-center rounded-md hover:bg-gray-100 active:scale-95 touch-manipulation"
                        onClick={() => insertCommentEmoji(em)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2 pt-2">
              <Textarea
                ref={commentInputRef}
                placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Write a comment…'}
                value={commentText}
                rows={2}
                className="text-sm min-h-[2.5rem] resize-none flex-1"
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={submitting} className="shrink-0 self-end">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : replyTo ? 'Reply' : 'Post'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
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
  comments_count: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  builder_profile?: {
    full_name: string;
    company_name: string;
    phone?: string;
    email?: string;
    location?: string;
    avatar_url?: string;
  };
}

interface BuilderVideoGalleryProps {
  builderId?: string; // If provided, show only this builder's videos
  showUploadButton?: boolean;
  isOwner?: boolean; // If true, show edit/delete options
  /** Public hub: hide like/comment/share — portfolio browse only */
  browseOnly?: boolean;
}

export const BuilderVideoGallery = ({ 
  builderId, 
  showUploadButton = false,
  isOwner = false,
  browseOnly = false,
}: BuilderVideoGalleryProps) => {
  const [videos, setVideos] = useState<BuilderVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<BuilderVideo | null>(null);
  /** Open VideoPlayer with comment field focused (showcase “Comment” row) */
  const [openPlayerFocusComments, setOpenPlayerFocusComments] = useState(false);
  /** Video IDs the current visitor has liked (guest: localStorage; auth: server) */
  const [galleryLikedVideoIds, setGalleryLikedVideoIds] = useState<Set<string>>(() => new Set());
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    id: '',
    title: '',
    description: '',
    project_type: '',
    project_location: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
    
    // Safety timeout - stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [builderId, filterType]);

  const fetchVideos = async () => {
    type ProfileRow = {
      id?: string;
      user_id?: string;
      full_name?: string | null;
      company_name?: string | null;
      phone?: string | null;
      email?: string | null;
      location?: string | null;
      avatar_url?: string | null;
    };

    const defaultProfile = (title: string) => ({
      full_name: title || 'UjenziXform Builder',
      company_name: 'UjenziXform Professional',
      phone: SUPPORT_PHONE_PRIMARY.display,
      email: 'info@ujenzixform.org',
      location: 'Kenya',
    });

    const mergeProfilesIntoMap = (rows: ProfileRow[] | null | undefined) => {
      const profilesMap: Record<
        string,
        NonNullable<BuilderVideo['builder_profile']>
      > = {};
      (rows || []).forEach((p) => {
        const profileData = {
          full_name: p.full_name || 'UjenziXform Builder',
          company_name: p.company_name || '',
          phone: p.phone || '',
          email: p.email || '',
          location: p.location || '',
          avatar_url: p.avatar_url || '',
        };
        if (p.id) profilesMap[p.id] = profileData;
        if (p.user_id) profilesMap[p.user_id] = profileData;
      });
      return profilesMap;
    };

    try {
      setLoading(true);

      const { data: fetched } = await fetchPublicBuilderShowcaseVideos({
        builderId: builderId ?? null,
        limit: 200,
        offset: 0,
      });

      let rows = fetched || [];
      if (filterType === 'featured') {
        rows = rows.filter((v) => v.is_featured === true);
      } else if (filterType !== 'all') {
        rows = rows.filter((v) => String(v.project_type ?? '') === filterType);
      }
      const builderIds = [...new Set(rows.map((v) => v.builder_id).filter(Boolean))] as string[];

      let profilesMap: Record<string, NonNullable<BuilderVideo['builder_profile']>> = {};

      if (builderIds.length > 0) {
        const { data: byUser } = await supabase
          .from('profiles')
          .select('id,user_id,full_name,company_name,phone,email,location,avatar_url')
          .in('user_id', builderIds);

        profilesMap = { ...profilesMap, ...mergeProfilesIntoMap(byUser as ProfileRow[]) };

        const { data: byId } = await supabase
          .from('profiles')
          .select('id,user_id,full_name,company_name,phone,email,location,avatar_url')
          .in('id', builderIds);

        profilesMap = { ...profilesMap, ...mergeProfilesIntoMap(byId as ProfileRow[]) };
      }

      const mapped: BuilderVideo[] = rows.map((video: Record<string, unknown>) => ({
        ...(video as unknown as BuilderVideo),
        // DB column is views_count; legacy typo view_count would read as undefined and show 0 after refetch.
        views_count:
          Number(video.views_count ?? video.view_count) || 0,
        likes_count: Number(video.likes_count) || 0,
        comments_count: Number(video.comments_count) || 0,
        builder_profile:
          profilesMap[String(video.builder_id)] ||
          defaultProfile(String((video.title as string) || '')),
      }));

      setVideos(mapped);
    } catch (error) {
      console.warn('Error fetching videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const openVideoPlayer = (video: BuilderVideo, opts?: { focusComments?: boolean }) => {
    setOpenPlayerFocusComments(!!opts?.focusComments);
    setSelectedVideo(video);
    void recordView(video.id);
  };

  /** Sync “liked” state for cards from guest localStorage or auth video_likes */
  useEffect(() => {
    if (!videos.length) return;
    let cancelled = false;

    const syncLikes = async () => {
      try {
        let userId: string | null = null;
        let accessToken = '';
        const raw = readPersistedAuthRawStringSync();
        if (raw) {
          const parsed = JSON.parse(raw);
          userId = parsed.user?.id ?? null;
          accessToken = parsed.access_token || '';
        }

        if (userId) {
          const ids = videos.map((v) => v.id).join(',');
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/video_likes?video_id=in.(${ids})&user_id=eq.${userId}&select=video_id`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
                Accept: 'application/json',
              },
            }
          );
          const data = res.ok ? await res.json() : [];
          const rows = Array.isArray(data) ? data : [];
          if (!cancelled) {
            setGalleryLikedVideoIds(new Set(rows.map((r: { video_id: string }) => r.video_id)));
          }
        } else {
          const guestLikes = JSON.parse(
            typeof localStorage !== 'undefined' ? localStorage.getItem('guestLikes') || '[]' : '[]'
          );
          const arr = Array.isArray(guestLikes) ? guestLikes : [];
          if (!cancelled) setGalleryLikedVideoIds(new Set(arr as string[]));
        }
      } catch {
        if (!cancelled) setGalleryLikedVideoIds(new Set());
      }
    };

    void syncLikes();
    return () => {
      cancelled = true;
    };
  }, [videos]);

  const toggleGalleryVideoLike = useCallback(
    async (video: BuilderVideo, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      let userId: string | null = null;
      let accessToken = '';
      try {
        const raw = readPersistedAuthRawStringSync();
        if (raw) {
          const parsed = JSON.parse(raw);
          userId = parsed.user?.id ?? null;
          accessToken = parsed.access_token || '';
        }
      } catch {
        /* ignore */
      }

      const guestId = !userId ? getBuilderFeedGuestId() : '';
      if (!userId && !guestId) {
        toast({
          title: 'Cannot save like',
          description: 'Allow storage for this site to remember your likes, or sign in.',
          variant: 'destructive',
        });
        return;
      }

      const liked = galleryLikedVideoIds.has(video.id);
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      } as const;

      try {
        if (liked) {
          let deleteUrl = `${SUPABASE_URL}/rest/v1/video_likes?video_id=eq.${video.id}`;
          if (userId) deleteUrl += `&user_id=eq.${userId}`;
          else deleteUrl += `&user_id=is.null&guest_identifier=eq.${encodeURIComponent(guestId)}`;

          const res = await fetch(deleteUrl, { method: 'DELETE', headers });
          if (!res.ok) {
            const t = await res.text();
            console.error('video_likes delete:', res.status, t);
            toast({ title: 'Unlike failed', description: 'Try again or open the video.', variant: 'destructive' });
            return;
          }
          setGalleryLikedVideoIds((prev) => {
            const next = new Set(prev);
            next.delete(video.id);
            return next;
          });
          setVideos((prev) =>
            prev.map((v) =>
              v.id === video.id ? { ...v, likes_count: Math.max(0, (v.likes_count || 0) - 1) } : v
            )
          );
          if (!userId) {
            const gl = JSON.parse(localStorage.getItem('guestLikes') || '[]') as string[];
            localStorage.setItem('guestLikes', JSON.stringify(gl.filter((id) => id !== video.id)));
          }
        } else {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/video_likes`, {
            method: 'POST',
            headers: { ...headers, Prefer: 'return=minimal' },
            body: JSON.stringify({
              video_id: video.id,
              user_id: userId,
              guest_identifier: userId ? null : guestId,
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            console.error('video_likes insert:', res.status, t);
            toast({ title: 'Like failed', description: 'Try again or sign in.', variant: 'destructive' });
            return;
          }
          setGalleryLikedVideoIds((prev) => new Set(prev).add(video.id));
          setVideos((prev) =>
            prev.map((v) => (v.id === video.id ? { ...v, likes_count: (v.likes_count || 0) + 1 } : v))
          );
          if (!userId) {
            const gl = JSON.parse(localStorage.getItem('guestLikes') || '[]') as string[];
            if (!gl.includes(video.id)) {
              gl.push(video.id);
              localStorage.setItem('guestLikes', JSON.stringify(gl));
            }
          }
        }
      } catch (err) {
        console.error('toggleGalleryVideoLike', err);
        toast({ title: 'Error', description: 'Could not update like.', variant: 'destructive' });
      }
    },
    [galleryLikedVideoIds, toast]
  );

  const recordView = async (videoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('video_views').insert({
        video_id: videoId,
        user_id: user?.id || null,
        guest_identifier: !user ? `guest-${Date.now()}` : null,
      });

      // Update views count in state
      setVideos(prev => 
        prev.map(v => 
          v.id === videoId 
            ? { ...v, views_count: v.views_count + 1 } 
            : v
        )
      );
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const openEditDialog = (video: BuilderVideo) => {
    setEditDraft({
      id: video.id,
      title: video.title,
      description: video.description || '',
      project_type: video.project_type || '',
      project_location: video.project_location || '',
    });
    setEditOpen(true);
  };

  const saveVideoEdits = async () => {
    if (!editDraft.id || !editDraft.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for this video.',
        variant: 'destructive',
      });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('builder_videos')
        .update({
          title: editDraft.title.trim(),
          description: editDraft.description.trim() || null,
          project_type: editDraft.project_type.trim() || null,
          project_location: editDraft.project_location.trim() || null,
        })
        .eq('id', editDraft.id);

      if (error) throw error;

      setVideos((prev) =>
        prev.map((v) =>
          v.id === editDraft.id
            ? {
                ...v,
                title: editDraft.title.trim(),
                description: editDraft.description.trim() || null,
                project_type: editDraft.project_type.trim() || null,
                project_location: editDraft.project_location.trim() || null,
              }
            : v
        )
      );
      if (selectedVideo?.id === editDraft.id) {
        setSelectedVideo((s) =>
          s
            ? {
                ...s,
                title: editDraft.title.trim(),
                description: editDraft.description.trim() || null,
                project_type: editDraft.project_type.trim() || null,
                project_location: editDraft.project_location.trim() || null,
              }
            : null
        );
      }
      toast({ title: 'Saved', description: 'Video details updated.' });
      setEditOpen(false);
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: 'Update failed',
        description: 'Could not save changes. Try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('builder_videos')
        .delete()
        .eq('id', videoToDelete);

      if (dbError) throw dbError;

      // Optionally delete from storage
      const video = videos.find(v => v.id === videoToDelete);
      if (video) {
        const fileName = video.video_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('builder-videos')
            .remove([`${video.builder_id}/${fileName}`]);
        }
      }

      toast({
        title: 'Video deleted',
        description: 'Your video has been deleted successfully',
      });

      setVideos(prev => prev.filter(v => v.id !== videoToDelete));
      setVideoToDelete(null);
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
    }
  };

  const projectTypes = [
    { value: 'all', label: 'All Projects' },
    { value: 'featured', label: 'Featured' },
    { value: 'Residential', label: 'Residential' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Renovation', label: 'Renovation' },
    { value: 'Infrastructure', label: 'Infrastructure' },
    { value: 'Interior Design', label: 'Interior Design' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading project videos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Pills - Compact */}
      <div className="flex flex-wrap gap-2 pb-2 border-b">
        {projectTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilterType(type.value)}
            className={`px-3 py-1.5 text-sm rounded-full transition-all ${
              filterType === type.value 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Social Feed Style Video List */}
      {videos.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200">
          <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Play className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            No project showcase videos yet
          </h3>
          <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
            No published showcase videos yet. COs and contractors can upload project videos from their dashboard
            portfolio tab; admins can publish drafts when ready.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <Card 
              key={video.id}
              className="overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Post Header - Facebook Style */}
              <div className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-blue-500 ring-offset-1">
                      {video.builder_profile?.avatar_url ? (
                        <AvatarImage src={video.builder_profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                        {(video.builder_profile?.company_name || video.builder_profile?.full_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">
                          {video.builder_profile?.company_name || video.builder_profile?.full_name || 'UjenziXform Builder'}
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-blue-500" fill="currentColor" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                        <span>•</span>
                        <Globe className="h-3 w-3" />
                        {video.project_location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {video.project_location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Caption/Description */}
                <div className="mt-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{video.title}</h3>
                  {video.description && (
                    <p className="text-gray-700 text-sm mt-1 line-clamp-2">{video.description}</p>
                  )}
                  
                  {/* Project Tags */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {video.project_type && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        {video.project_type}
                      </Badge>
                    )}
                    {video.is_featured && (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                        <Star className="h-3 w-3 mr-1" fill="white" />
                        Featured
                      </Badge>
                    )}
                    {video.project_duration && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {video.project_duration}
                      </Badge>
                    )}
                    {video.project_cost_range && (
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {video.project_cost_range}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Video Player Area - Click to Play */}
              <div
                className="relative aspect-video bg-black cursor-pointer group"
                onClick={() => openVideoPlayer(video)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    openVideoPlayer(video);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Play video: ${video.title}`}
              >
                <video
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  className="w-full h-full object-contain"
                  preload="metadata"
                  playsInline
                  onError={() =>
                    toast({
                      title: 'Video could not play',
                      description:
                        'If you are on a strict network or browser, try H.264 MP4 or open the file link directly.',
                      variant: 'destructive',
                    })
                  }
                />
                
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-4 shadow-xl transform group-hover:scale-110 transition-transform">
                    <Play className="h-10 w-10 text-blue-600" fill="currentColor" />
                  </div>
                </div>
                
                {/* Duration/Views overlay */}
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  {video.views_count || 0} views
                </div>
              </div>

              {/* Engagement stats — always visible on every showcase card */}
              <div className="px-4 py-2.5 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 bg-gray-50/80">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="font-semibold text-gray-900 tabular-nums">{video.views_count || 0}</span>
                  <span className="text-gray-500">views</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ThumbsUp className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="font-semibold text-gray-900 tabular-nums">{video.likes_count || 0}</span>
                  <span className="text-gray-500">likes</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="font-semibold text-gray-900 tabular-nums">{video.comments_count || 0}</span>
                  <span className="text-gray-500">comments</span>
                </span>
              </div>

              <GalleryVideoCardActions
                video={video}
                isLiked={galleryLikedVideoIds.has(video.id)}
                browseOnly={browseOnly}
                onToggleLike={(e) => void toggleGalleryVideoLike(video, e)}
                onShare={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard.writeText(window.location.href);
                  toast({ title: 'Link copied!', description: 'Share this project with others' });
                }}
                onOpenPlayer={(e) => {
                  e.stopPropagation();
                  openVideoPlayer(video);
                }}
                onCommentPosted={() =>
                  setVideos((prev) =>
                    prev.map((v) =>
                      v.id === video.id ? { ...v, comments_count: (v.comments_count || 0) + 1 } : v,
                    ),
                  )
                }
              />

              {/* Owner Actions */}
              {isOwner && (
                <div className="px-4 py-2 bg-gray-50 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(video)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => setVideoToDelete(video.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          isOpen={!!selectedVideo}
          initialFocusComments={openPlayerFocusComments}
          onClose={() => {
            setSelectedVideo(null);
            setOpenPlayerFocusComments(false);
          }}
          onVideoUpdate={fetchVideos}
        />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit video details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editDraft.title}
                onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                rows={3}
                value={editDraft.description}
                onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-type">Project type</Label>
              <Input
                id="edit-type"
                value={editDraft.project_type}
                onChange={(e) => setEditDraft((d) => ({ ...d, project_type: e.target.value }))}
                placeholder="e.g. Residential"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-loc">Location</Label>
              <Input
                id="edit-loc"
                value={editDraft.project_location}
                onChange={(e) => setEditDraft((d) => ({ ...d, project_location: e.target.value }))}
                placeholder="e.g. Nairobi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={saveVideoEdits} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your project video
              and remove all associated comments and likes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
