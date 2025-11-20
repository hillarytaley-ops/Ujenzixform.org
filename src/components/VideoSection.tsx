import React, { useState } from 'react';
import { Play, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedSection from './AnimatedSection';

interface VideoSectionProps {
  videoId?: string;
  videoUrl?: string; // Direct video URL for self-hosted videos
  synthesiaUrl?: string; // Synthesia share URL
  steveAiUrl?: string; // Steve.ai embed URL
  thumbnail?: string;
  title?: string;
  description?: string;
  useYouTube?: boolean; // Flag to determine video source
  useSynthesia?: boolean; // Flag for Synthesia videos
  useSteveAi?: boolean; // Flag for Steve.ai videos
}

const VideoSection: React.FC<VideoSectionProps> = ({
  videoId = 'dQw4w9WgXcQ', // Fallback to working YouTube video for demo
  videoUrl,
  synthesiaUrl,
  steveAiUrl,
  thumbnail = '/mradipro-demo-thumbnail.svg',
  title = 'MradiPro Platform Demo',
  description = 'See how easy it is to connect, quote, and build across Kenya',
  useYouTube = true,
  useSynthesia = false,
  useSteveAi = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const handlePlayVideo = () => {
    setIsPlaying(true);
  };

  const handleCloseVideo = () => {
    setIsPlaying(false);
  };

  return (
    <AnimatedSection animation="fadeInUp">
      <div className="relative">
        {!isPlaying ? (
          // Video Thumbnail
          <div 
            className="relative rounded-xl overflow-hidden cursor-pointer group shadow-2xl"
            onClick={handlePlayVideo}
          >
            <div 
              className="aspect-video bg-gradient-to-br from-kenyan-green to-acacia-gold flex items-center justify-center"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${thumbnail}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Play Button */}
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Play className="h-12 w-12 text-primary ml-1" fill="currentColor" />
              </div>
              
              {/* Overlay Content */}
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">{title}</h3>
                <p className="text-lg opacity-90 drop-shadow-md">{description}</p>
              </div>
            </div>
          </div>
        ) : (
          // Video Player
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <div className="aspect-video">
              {videoError ? (
                // Error State
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                    <h3 className="text-xl font-semibold mb-2">Video Temporarily Unavailable</h3>
                    <p className="text-gray-300 mb-4">
                      We're working on getting the demo video ready. Please check back soon!
                    </p>
                    <Button 
                      onClick={handleCloseVideo}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : useSteveAi && steveAiUrl ? (
                // Steve.ai Embed
                <iframe
                  src={steveAiUrl}
                  title="UjenziPro Platform Demo - Steve.ai"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  onError={() => setVideoError(true)}
                />
              ) : useSynthesia && synthesiaUrl ? (
                // Synthesia Embed
                <iframe
                  src={synthesiaUrl}
                  title="UjenziPro Platform Demo - AI Generated"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  onError={() => setVideoError(true)}
                />
              ) : useYouTube && videoId ? (
                // YouTube Embed with enhanced error handling
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                  title="UjenziPro Platform Demo"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  onError={() => setVideoError(true)}
                  onLoad={() => {
                    // Check if iframe content is accessible
                    setTimeout(() => {
                      try {
                        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
                        if (iframe && iframe.contentDocument === null) {
                          // If we can't access iframe content, it might be blocked
                          console.warn('Video iframe may be blocked by CSP or other security policies');
                        }
                      } catch (e) {
                        console.warn('Video iframe access check failed:', e);
                      }
                    }, 1000);
                  }}
                />
              ) : videoUrl ? (
                // Self-hosted Video
                <video
                  className="w-full h-full"
                  controls
                  autoPlay
                  poster={thumbnail}
                  onError={() => setVideoError(true)}
                >
                  <source src={videoUrl} type="video/mp4" />
                  <p className="text-white p-4">
                    Your browser doesn't support HTML5 video. 
                    <a href={videoUrl} className="text-blue-400 underline ml-1">
                      Download the video instead.
                    </a>
                  </p>
                </video>
              ) : (
                // Fallback placeholder
                <div className="w-full h-full bg-gradient-to-br from-kenyan-green to-acacia-gold flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <Play className="h-16 w-16 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Demo Video Coming Soon</h3>
                    <p className="text-white/80">
                      Our comprehensive platform demo will be available shortly
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Close Button */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 bg-black/50 border-white/20 text-white hover:bg-black/70"
              onClick={handleCloseVideo}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Video Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">3:45</div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-kenyan-green">25K+</div>
            <div className="text-sm text-muted-foreground">Views</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-construction-orange">99%</div>
            <div className="text-sm text-muted-foreground">Positive</div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
};

export default VideoSection;




