import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  onCreateStory?: () => void;
}

export const BuilderStories: React.FC<BuilderStoriesProps> = ({
  currentUserName = 'You',
  currentUserAvatar,
  onCreateStory
}) => {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>(DEMO_STORIES);
  const [selectedGroup, setSelectedGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [replyText, setReplyText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);

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
            {/* Create Story Card */}
            <div
              className="flex-shrink-0 w-28 cursor-pointer group"
              onClick={onCreateStory}
            >
              <div className="relative h-44 rounded-xl overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-blue-400 transition-colors">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Create Story</span>
                </div>
              </div>
            </div>

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
    </>
  );
};

export default BuilderStories;
