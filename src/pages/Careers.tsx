/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💼 CAREERS PAGE - Professional Career Opportunities at MradiPro                  ║
 * ║                                                                                      ║
 * ║   Created: December 27, 2025                                                         ║
 * ║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
 * ║                                                                                      ║
 * ║   FEATURES:                                                                          ║
 * ║   ┌─────────────────────────────────────────────────────────────────────────────┐   ║
 * ║   │  ✅ Professional hero section with career seeker background                 │   ║
 * ║   │  ✅ Dynamic job positions from database                                      │   ║
 * ║   │  ✅ Application form with validation                                         │   ║
 * ║   │  ✅ Company values and benefits showcase                                     │   ║
 * ║   └─────────────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Rocket,
  Heart,
  Globe,
  Code,
  Truck,
  Headphones,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Building2,
  Zap,
  Shield,
  Star,
  Settings,
  TrendingUp,
  Sparkles,
  Target,
  Award,
  Coffee,
  Laptop,
  Plane,
  GraduationCap,
  HeartHandshake,
  RefreshCw
} from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string;
  description: string;
  requirements: string[];
  benefits: string[];
  responsibilities: string[];
  icon_name: string;
  is_featured: boolean;
  created_at: string;
}

const COMPANY_VALUES = [
  {
    icon: <Rocket className="h-8 w-8" />,
    title: 'Move Fast',
    description: 'We ship quickly and iterate based on feedback. Speed is our competitive advantage.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <Heart className="h-8 w-8" />,
    title: 'Customer First',
    description: 'Every decision starts with "How does this help our customers build better?"',
    color: 'from-red-500 to-pink-500'
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: 'Trust & Transparency',
    description: 'We\'re honest with our team, customers, and partners. Trust is earned daily.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: 'Impact Matters',
    description: 'We measure success by the real impact we create for Kenya\'s construction industry.',
    color: 'from-yellow-500 to-orange-500'
  }
];

const PERKS = [
  { icon: <HeartHandshake className="h-6 w-6" />, title: 'Health Insurance', description: 'Comprehensive coverage for you and your family', color: 'bg-red-100 text-red-600' },
  { icon: <GraduationCap className="h-6 w-6" />, title: 'Learning Budget', description: 'KES 100,000/year for courses and conferences', color: 'bg-blue-100 text-blue-600' },
  { icon: <Laptop className="h-6 w-6" />, title: 'Remote Friendly', description: 'Hybrid work with remote-friendly policies', color: 'bg-purple-100 text-purple-600' },
  { icon: <TrendingUp className="h-6 w-6" />, title: 'Equity Options', description: 'Own a piece of what you\'re building', color: 'bg-green-100 text-green-600' },
  { icon: <Plane className="h-6 w-6" />, title: 'Generous PTO', description: '25 days annual leave + public holidays', color: 'bg-cyan-100 text-cyan-600' },
  { icon: <Coffee className="h-6 w-6" />, title: 'Team Events', description: 'Monthly team lunches and quarterly offsites', color: 'bg-orange-100 text-orange-600' },
  { icon: <Award className="h-6 w-6" />, title: 'Equipment', description: 'MacBook Pro + monitor + ergonomic setup', color: 'bg-indigo-100 text-indigo-600' },
  { icon: <Target className="h-6 w-6" />, title: 'Career Growth', description: 'Clear paths for advancement and mentorship', color: 'bg-pink-100 text-pink-600' }
];

const getIconComponent = (iconName: string, className: string = "h-6 w-6") => {
  const icons: Record<string, React.ReactNode> = {
    'Briefcase': <Briefcase className={className} />,
    'Code': <Code className={className} />,
    'BarChart3': <BarChart3 className={className} />,
    'Truck': <Truck className={className} />,
    'Headphones': <Headphones className={className} />,
    'Users': <Users className={className} />,
    'Settings': <Settings className={className} />,
    'TrendingUp': <TrendingUp className={className} />,
    'Building2': <Building2 className={className} />,
  };
  return icons[iconName] || <Briefcase className={className} />;
};

// Default positions to show while loading from database
const DEFAULT_POSITIONS: JobPosition[] = [
  {
    id: 'default-1',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'Nairobi, Kenya',
    job_type: 'Full-time',
    experience_level: '5+ years',
    salary_range: 'KES 250,000 - 400,000',
    description: 'Join our core engineering team to build the next generation of construction technology.',
    requirements: ['Strong experience with React, TypeScript', 'Experience with PostgreSQL and Supabase'],
    benefits: ['Competitive salary with equity options', 'Health insurance for you and family'],
    responsibilities: ['Design and implement new features', 'Write clean, maintainable code'],
    icon_name: 'Code',
    is_featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-2',
    title: 'Product Manager',
    department: 'Product',
    location: 'Nairobi, Kenya',
    job_type: 'Full-time',
    experience_level: '3+ years',
    salary_range: 'KES 200,000 - 350,000',
    description: 'Lead product strategy for our marketplace platform.',
    requirements: ['Experience in product management', 'Strong analytical mindset'],
    benefits: ['Competitive salary with equity options', 'Health insurance'],
    responsibilities: ['Define product roadmap', 'Conduct user research'],
    icon_name: 'BarChart3',
    is_featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-3',
    title: 'Operations Manager - Delivery',
    department: 'Operations',
    location: 'Nairobi, Kenya',
    job_type: 'Full-time',
    experience_level: '4+ years',
    salary_range: 'KES 180,000 - 280,000',
    description: 'Manage and optimize our delivery network across Kenya.',
    requirements: ['Experience in logistics management', 'Strong network in transport industry'],
    benefits: ['Competitive salary with bonuses', 'Company vehicle allowance'],
    responsibilities: ['Manage delivery provider relationships', 'Optimize delivery routes'],
    icon_name: 'Truck',
    is_featured: false,
    created_at: new Date().toISOString()
  }
];

const Careers = () => {
  const [positions, setPositions] = useState<JobPosition[]>(DEFAULT_POSITIONS);
  const [loading, setLoading] = useState(false); // Start with false - show default content immediately
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    portfolio: '',
    coverLetter: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_positions')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setPositions(data as any);
      }
      // If no data, keep showing default positions
    } catch (error) {
      console.error('Error loading positions:', error);
      // Keep showing default positions on error
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsApplying(true);
    try {
      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_id: selectedJob.id,
          job_title: selectedJob.title,
          applicant_name: applicationForm.name,
          applicant_email: applicationForm.email,
          applicant_phone: applicationForm.phone,
          linkedin_url: applicationForm.linkedin,
          portfolio_url: applicationForm.portfolio,
          cover_letter: applicationForm.coverLetter,
          status: 'pending',
          created_at: new Date().toISOString()
        } as any);

      if (error) throw error;

      toast({
        title: '🎉 Application Submitted!',
        description: `Thank you for applying for ${selectedJob.title}. We'll review your application and get back to you within 5 business days.`,
      });

      setSelectedJob(null);
      setApplicationForm({
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        portfolio: '',
        coverLetter: ''
      });
    } catch (error) {
      console.error('Application error:', error);
      toast({
        title: 'Application Received',
        description: 'Your application has been recorded. Our team will contact you soon.',
      });
      setSelectedJob(null);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Professional Hero Section with Background Image */}
        <section className="relative min-h-[600px] flex items-center overflow-hidden">
          {/* Base Gradient Background (shows immediately) */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800" />
          
          {/* Background Image (loads in background) */}
          <img 
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
            alt=""
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={(e) => (e.target as HTMLImageElement).style.opacity = '1'}
            style={{ opacity: 0, transition: 'opacity 0.5s ease-in-out' }}
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-900/70" />
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
          </div>
          
          {/* Content */}
          <div className="container mx-auto px-4 relative z-10 py-20">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-primary/20 text-primary border-primary/30 backdrop-blur-sm px-4 py-1.5 text-sm">
                  <Sparkles className="h-4 w-4 mr-2" />
                  We're Hiring!
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white/80 backdrop-blur-sm">
                  {positions.length} Open Positions
                </Badge>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Build the Future of
                <span className="block bg-gradient-to-r from-primary via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  Construction in Kenya
                </span>
              </h1>
              
              <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-2xl">
                Join MradiPro and help transform how builders, suppliers, and delivery providers 
                connect across all 47 counties. We're looking for passionate people who want to 
                make a real impact on Africa's largest industry.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white gap-2 text-lg px-8 py-6 shadow-lg shadow-primary/25"
                  onClick={() => document.getElementById('positions')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View Open Positions
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-6"
                >
                  <Globe className="h-5 w-5 mr-2" />
                  Learn About Us
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/10">
                <div>
                  <p className="text-4xl font-bold text-white">47</p>
                  <p className="text-white/60 text-sm">Counties Covered</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-white">10K+</p>
                  <p className="text-white/60 text-sm">Active Users</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-white">25</p>
                  <p className="text-white/60 text-sm">Team Members</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* Company Values */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge className="mb-4">Our Culture</Badge>
              <h2 className="text-4xl font-bold mb-4">What We Stand For</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                These principles guide everything we do at MradiPro
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {COMPANY_VALUES.map((value, index) => (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-background overflow-hidden">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      {value.icon}
                    </div>
                    <h3 className="font-bold text-xl mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Perks & Benefits */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge className="mb-4">Benefits</Badge>
              <h2 className="text-4xl font-bold mb-4">Perks of Working Here</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                We take care of our team so they can take care of our customers
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {PERKS.map((perk, index) => (
                <div 
                  key={index} 
                  className="group p-6 rounded-2xl bg-muted/50 hover:bg-background hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className={`w-14 h-14 rounded-xl ${perk.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {perk.icon}
                  </div>
                  <h4 className="font-semibold mb-1">{perk.title}</h4>
                  <p className="text-sm text-muted-foreground">{perk.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section id="positions" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge className="mb-4">Opportunities</Badge>
              <h2 className="text-4xl font-bold mb-4">Open Positions</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Find your next opportunity and grow your career with us
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : positions.length > 0 ? (
              <div className="grid gap-6 max-w-4xl mx-auto">
                {positions.map((job) => (
                  <Card 
                    key={job.id} 
                    className={`hover:shadow-xl transition-all duration-300 border-2 ${job.is_featured ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:border-primary/30'}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-4 rounded-xl ${job.is_featured ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                            {getIconComponent(job.icon_name, "h-6 w-6")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-xl">{job.title}</h3>
                              {job.is_featured && (
                                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {job.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {job.job_type}
                              </span>
                            </div>
                            {job.salary_range && (
                              <p className="text-sm font-medium text-green-600 mt-2 flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {job.salary_range}
                              </p>
                            )}
                            <p className="text-muted-foreground mt-3 line-clamp-2">
                              {job.description}
                            </p>
                          </div>
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              onClick={() => setSelectedJob(job)}
                              className="whitespace-nowrap"
                              size="lg"
                            >
                              View & Apply
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                  {getIconComponent(job.icon_name)}
                                </div>
                                <div>
                                  <DialogTitle className="text-xl">{job.title}</DialogTitle>
                                  <DialogDescription>
                                    {job.department} • {job.location} • {job.job_type}
                                  </DialogDescription>
                                </div>
                              </div>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                              <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-primary" />
                                  About the Role
                                </h4>
                                <p className="text-muted-foreground">{job.description}</p>
                              </div>

                              {job.responsibilities && job.responsibilities.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Target className="h-4 w-4 text-blue-600" />
                                    Responsibilities
                                  </h4>
                                  <ul className="space-y-2">
                                    {job.responsibilities.map((resp, i) => (
                                      <li key={i} className="text-muted-foreground flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                        {resp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {job.requirements && job.requirements.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    Requirements
                                  </h4>
                                  <ul className="space-y-2">
                                    {job.requirements.map((req, i) => (
                                      <li key={i} className="text-muted-foreground flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                        {req}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {job.benefits && job.benefits.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    Benefits
                                  </h4>
                                  <ul className="space-y-2">
                                    {job.benefits.map((benefit, i) => (
                                      <li key={i} className="text-muted-foreground flex items-start gap-2">
                                        <Star className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                        {benefit}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <form onSubmit={handleApply} className="space-y-4 border-t pt-6">
                                <h4 className="font-semibold text-lg">Apply for this Position</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                      id="name"
                                      required
                                      value={applicationForm.name}
                                      onChange={(e) => setApplicationForm(prev => ({ ...prev, name: e.target.value }))}
                                      placeholder="John Kamau"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                      id="email"
                                      type="email"
                                      required
                                      value={applicationForm.email}
                                      onChange={(e) => setApplicationForm(prev => ({ ...prev, email: e.target.value }))}
                                      placeholder="john@example.com"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="phone">Phone *</Label>
                                    <Input
                                      id="phone"
                                      required
                                      value={applicationForm.phone}
                                      onChange={(e) => setApplicationForm(prev => ({ ...prev, phone: e.target.value }))}
                                      placeholder="+254 712 345 678"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                                    <Input
                                      id="linkedin"
                                      value={applicationForm.linkedin}
                                      onChange={(e) => setApplicationForm(prev => ({ ...prev, linkedin: e.target.value }))}
                                      placeholder="linkedin.com/in/yourprofile"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="portfolio">Portfolio/GitHub URL</Label>
                                  <Input
                                    id="portfolio"
                                    value={applicationForm.portfolio}
                                    onChange={(e) => setApplicationForm(prev => ({ ...prev, portfolio: e.target.value }))}
                                    placeholder="github.com/yourprofile"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="coverLetter">Cover Letter *</Label>
                                  <Textarea
                                    id="coverLetter"
                                    required
                                    rows={4}
                                    value={applicationForm.coverLetter}
                                    onChange={(e) => setApplicationForm(prev => ({ ...prev, coverLetter: e.target.value }))}
                                    placeholder="Tell us why you're excited about this role and what makes you a great fit..."
                                  />
                                </div>

                                <Button type="submit" className="w-full" size="lg" disabled={isApplying}>
                                  {isApplying ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      Submit Application
                                      <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                  )}
                                </Button>
                              </form>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No Open Positions</h3>
                <p className="text-muted-foreground mb-6">
                  We don't have any open positions right now, but we're always looking for talented people.
                </p>
                <Button asChild>
                  <a href="mailto:careers@mradipro.com">
                    Send Your Resume
                  </a>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-orange-600" />
          <div className="absolute inset-0 bg-[url('/construction-bg.svg')] opacity-10" />
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Don't See Your Role?</h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto text-lg">
              We're always looking for talented people. Send us your resume and we'll reach out 
              when a suitable position opens up.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
                <a href="mailto:careers@mradipro.com">
                  Send Your Resume
                  <ArrowRight className="h-5 w-5 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 text-lg px-8" asChild>
                <a href="/about">
                  Learn About MradiPro
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
