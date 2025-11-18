import React, { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, Award } from "lucide-react";

// Lazy load FeedbackForm to prevent page hanging on mobile
const FeedbackForm = React.lazy(() => 
  import("@/components/FeedbackForm").then(module => ({ default: module.FeedbackForm }))
);

// Lightweight loading fallback for mobile
const FeedbackFormLoader = () => (
  <div className="space-y-4">
    <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
    <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
    <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
    <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
  </div>
);

export default function Feedback() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <header 
          className="text-white py-24 relative overflow-hidden"
          role="banner"
          aria-labelledby="feedback-hero-heading"
        >
        {/* Kenyan Construction Teamwork Background - Optimized for mobile */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=75')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: window.innerWidth > 768 ? 'fixed' : 'scroll' // Fixed only on desktop
          }}
          role="img"
          aria-label="Kenyan construction professionals collaborating and working together on building projects, showcasing teamwork and quality construction practices"
        />
        
        {/* Kenyan flag colors overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-gray-900/60 to-gray-800/60"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-center">
              <Badge className="bg-gradient-to-r from-green-600 to-red-600 text-white px-6 py-2 text-lg font-semibold border border-white/30">
                🇰🇪 Your Voice Matters - Building Kenya Together
              </Badge>
            </div>
            <h1 id="feedback-hero-heading" className="text-6xl md:text-7xl font-bold mb-6 text-white drop-shadow-2xl">
              We Value Your Feedback
            </h1>
            <p className="text-2xl md:text-3xl mb-8 text-white/90 font-medium drop-shadow-lg leading-relaxed">
              Help us improve Kenya's construction industry by sharing your thoughts, 
              suggestions, and experiences with UjenziPro
            </p>
            
            {/* Feedback Highlights */}
            <div className="flex flex-wrap justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">Your Voice</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Star className="h-5 w-5" />
                <span className="font-medium">Rate Experience</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Award className="h-5 w-5" />
                <span className="font-medium">Improve Together</span>
              </div>
            </div>
          </div>
        </div>
        </header>
      
      {/* Main Feedback Section */}
      <main className="py-20 relative overflow-hidden">
        {/* Kenyan Construction Progress Background - Optimized for mobile */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1541976590-713941681591?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=70')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: window.innerWidth > 768 ? 'fixed' : 'scroll' // Fixed only on desktop
          }}
          role="img"
          aria-label="Kenyan construction site showing building progress and development, representing continuous improvement and growth"
        />
        
        {/* Light overlay for form readability */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-6 text-gray-900 drop-shadow-sm">Share Your Experience</h2>
            <p className="text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              Your feedback drives our mission to transform Kenya's construction industry. 
              Every suggestion helps us serve builders and suppliers better across all 47 counties.
            </p>
          </div>
          
          {/* Enhanced Feedback Form Container - No animation for instant mobile rendering */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-white/50 shadow-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                  <MessageSquare className="h-8 w-8 text-primary" />
                  Share Your Feedback
                </h3>
                <p className="text-lg text-gray-700">
                  Help us build a better platform for Kenya's construction community
                </p>
              </div>
              
              <Suspense fallback={<FeedbackFormLoader />}>
                <FeedbackForm />
              </Suspense>
            </div>
          </div>
          
          {/* Feedback Impact Section - No animation for instant mobile rendering */}
          <div className="mt-20 text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 border border-white/30 max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold mb-6 text-gray-900">Your Feedback Creates Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">500+</div>
                  <p className="text-gray-700 font-medium">Feedback Submissions</p>
                  <p className="text-sm text-gray-600">Driving continuous improvement</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">95%</div>
                  <p className="text-gray-700 font-medium">Issues Resolved</p>
                  <p className="text-sm text-gray-600">Based on user feedback</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600 mb-2">4.8★</div>
                  <p className="text-gray-700 font-medium">Average Rating</p>
                  <p className="text-sm text-gray-600">From our community</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}