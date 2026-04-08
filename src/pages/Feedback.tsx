import React, { Suspense } from "react";
import { useHomePagePublicStats, formatHomeStatCount } from "@/hooks/useHomePagePublicStats";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageSquare, 
  Star, 
  Award, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  ThumbsUp,
  Lightbulb,
  Heart,
  ArrowRight,
  Sparkles,
  Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

const feedbackTypes = [
  {
    icon: ThumbsUp,
    title: "Rate Your Experience",
    description: "Tell us how we're doing",
    color: "from-green-500 to-emerald-600"
  },
  {
    icon: Lightbulb,
    title: "Suggest Features",
    description: "Share your ideas with us",
    color: "from-yellow-500 to-orange-600"
  },
  {
    icon: Target,
    title: "Report Issues",
    description: "Help us fix problems fast",
    color: "from-red-500 to-pink-600"
  },
  {
    icon: Heart,
    title: "Share Success Stories",
    description: "Inspire the community",
    color: "from-purple-500 to-indigo-600"
  }
];

export default function Feedback() {
  const publicStats = useHomePagePublicStats();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1920&q=80')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-slate-900/95" />
        </div>

        {/* Animated Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <Badge className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-6 py-2 text-base font-semibold shadow-lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Your Voice Shapes Our Future
            </Badge>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                We Value Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Feedback
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Help us improve Kenya's construction industry. Your thoughts, suggestions, 
              and experiences drive our mission to serve you better.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm px-5 py-3 rounded-full transition-all">
                <MessageSquare className="h-5 w-5 text-purple-400" />
                <span className="text-white font-medium">Share Thoughts</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm px-5 py-3 rounded-full transition-all">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">Rate Experience</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm px-5 py-3 rounded-full transition-all">
                <Award className="h-5 w-5 text-green-400" />
                <span className="text-white font-medium">Make an Impact</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-background"/>
          </svg>
        </div>
      </section>

      {/* Feedback Types Cards */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto -mt-16 relative z-10">
            {feedbackTypes.map((type, index) => (
              <Card key={index} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white dark:bg-slate-900">
                <CardContent className="p-6 text-center">
                  <div className={`w-14 h-14 bg-gradient-to-br ${type.color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <type.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Feedback Form Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            
            {/* Feedback Form */}
            <div id="feedback-form-section">
              <Card className="shadow-2xl border-0">
                <CardHeader className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Share Your Feedback</CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">
                        We review all submissions; we cannot reply to every note, but they inform our roadmap.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Suspense fallback={<FeedbackFormLoader />}>
                    <FeedbackForm />
                  </Suspense>
                </CardContent>
              </Card>
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              {/* Why Feedback Matters */}
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Why Your Feedback Matters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Drives Innovation</h4>
                      <p className="text-sm text-muted-foreground">Your ideas inspire new features and improvements</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Improves Quality</h4>
                      <p className="text-sm text-muted-foreground">Bug reports help us deliver a better experience</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Shapes Direction</h4>
                      <p className="text-sm text-muted-foreground">Community input guides our roadmap</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Improvements */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-pink-600" />
                    Product areas we care about
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Illustrative themes — not a release log. Priorities shift based on feedback, operations, and safety.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Reliable delivery and GPS handoff for drivers and builders</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Supplier discovery, materials data, and checkout flows</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Performance and accessibility on phones and low bandwidth</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Notifications, QR workflows, and site monitoring integrations</span>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Alternative */}
              <Card className="shadow-xl border-0">
                <CardContent className="p-6 text-center">
                  <Users className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Prefer to talk?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use Contact for phone numbers and business hours (Mon–Fri, half day Sat; closed Sun).
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/contact">
                      Contact Support
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-white/10 text-white border-white/20">
              <TrendingUp className="h-4 w-4 mr-2" />
              Your Impact
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Platform scale (live totals)
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              The same public aggregates we show elsewhere — not feedback volume or satisfaction scores.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <CardContent className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2 tabular-nums">
                  {formatHomeStatCount(publicStats.registeredNetwork, publicStats.loading)}
                </div>
                <p className="text-white font-medium">Network accounts</p>
                <p className="text-sm text-gray-400">Onboarded roles (excl. admin)</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <CardContent className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2 tabular-nums">
                  {formatHomeStatCount(publicStats.builderProjects, publicStats.loading)}
                </div>
                <p className="text-white font-medium">Builder projects</p>
                <p className="text-sm text-gray-400">In our database</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <CardContent className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-yellow-400 mb-2 tabular-nums">
                  {formatHomeStatCount(publicStats.qrScanEventsTotal, publicStats.loading)}
                </div>
                <p className="text-white font-medium">QR scan events</p>
                <p className="text-sm text-gray-400">Recorded on platform</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-center">
              <CardContent className="p-6">
                <div className="text-4xl md:text-5xl font-bold text-red-400 mb-2 tabular-nums">
                  {formatHomeStatCount(publicStats.deliveryRequestsActive, publicStats.loading)}
                </div>
                <p className="text-white font-medium">Active deliveries</p>
                <p className="text-sm text-gray-400">In-flight requests</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Honest community note (no fabricated quotes) */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Your story matters</h2>
          <p className="text-muted-foreground mb-6">
            We do not display named testimonials here unless we have explicit permission. If you are open to being
            featured (first name + role + county only), say so in your feedback and we may follow up.
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={() =>
              document.getElementById('feedback-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Open feedback form
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Share Your Thoughts?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Your feedback helps us build a better platform for Kenya's construction industry
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-white/90"
              onClick={() =>
                document.getElementById('feedback-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Submit Feedback
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link to="/contact">
                Contact Us
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
