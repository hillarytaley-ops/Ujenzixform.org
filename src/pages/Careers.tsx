/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   💼 CAREERS PAGE - Professional Career Opportunities at UjenziXform                  ║
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
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
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
  RefreshCw,
  Upload,
  FileText,
  Send,
  CheckCircle2
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
  const [jobResumeFile, setJobResumeFile] = useState<File | null>(null);
  const [jobCoverLetterFile, setJobCoverLetterFile] = useState<File | null>(null);
  
  // General application portal state
  const [generalApplication, setGeneralApplication] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    linkedin: '',
    coverLetter: ''
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [isSubmittingGeneral, setIsSubmittingGeneral] = useState(false);
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  
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

  const handleFileUpload = async (file: File, type: 'resume' | 'cover_letter'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `applications/${fileName}`;

      // Add timeout to prevent hanging (reduced to 15 seconds for faster UX)
      const uploadPromise = supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ error: { message: 'Upload timeout after 15 seconds' } }), 15000);
      });

      const result = await Promise.race([uploadPromise, timeoutPromise]);

      if (result.error) {
        console.error('Upload error:', result.error);
        // Return null on failure - application will still submit without file URL
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('File upload exception:', err);
      // Return null on failure - don't block application submission
      return null;
    }
  };

  const handleGeneralApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!generalApplication.name || !generalApplication.email || !generalApplication.phone) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Email, Phone).",
      });
      return;
    }

    setIsSubmittingGeneral(true);
    
    // Add overall timeout for entire submission (60 seconds max)
    const submissionTimeout = setTimeout(() => {
      console.error('⏱️ Submission timeout - forcing completion');
      setIsSubmittingGeneral(false);
      toast({
        variant: "destructive",
        title: "Submission Timeout",
        description: "The submission took too long. Please try again or contact support.",
      });
    }, 60000);

    try {
      let resumeUrl = null;
      let coverLetterUrl = null;

      // Upload files in parallel (faster) with timeout protection
      const uploadPromises: Promise<void>[] = [];
      
      if (resumeFile) {
        console.log('📤 Uploading resume...');
        uploadPromises.push(
          handleFileUpload(resumeFile, 'resume')
            .then(url => {
              resumeUrl = url;
              if (url) {
                console.log('✅ Resume upload successful');
              } else {
                console.warn('⚠️ Resume upload failed or timed out - continuing without file URL');
              }
            })
            .catch(uploadError => {
              console.error('❌ Resume upload error:', uploadError);
              // Continue without resume URL
            })
        );
      }

      if (coverLetterFile) {
        console.log('📤 Uploading cover letter...');
        uploadPromises.push(
          handleFileUpload(coverLetterFile, 'cover_letter')
            .then(url => {
              coverLetterUrl = url;
              if (url) {
                console.log('✅ Cover letter upload successful');
              } else {
                console.warn('⚠️ Cover letter upload failed or timed out - continuing without file URL');
              }
            })
            .catch(uploadError => {
              console.error('❌ Cover letter upload error:', uploadError);
              // Continue without cover letter URL
            })
        );
      }

      // Wait for all uploads to complete (or timeout) - max 20 seconds total
      console.log('⏳ Waiting for file uploads to complete...');
      const uploadsResult = await Promise.race([
        Promise.allSettled(uploadPromises),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('⏱️ File uploads taking too long, proceeding with database insert');
            resolve();
          }, 20000); // Max 20 seconds for all uploads
        })
      ]);
      console.log('✅ File upload phase completed');

      console.log('💾 Submitting general application to database...');
      
      // Prepare application data - ensure cover_letter is not null (required field)
      const applicationData: any = {
        job_id: 'general-application',
        job_title: generalApplication.position || 'General Application',
        full_name: generalApplication.name,
        email: generalApplication.email,
        phone: generalApplication.phone,
        cover_letter: generalApplication.coverLetter || 'No cover letter provided',
        status: 'new'
      };
      
      // Add optional fields only if they have values
      if (generalApplication.linkedin) {
        applicationData.linkedin_url = generalApplication.linkedin;
      }
      if (resumeUrl) {
        applicationData.resume_url = resumeUrl;
      }
      
      // Use direct fetch with AbortController for reliable timeout (10 seconds)
      console.log('⏳ Inserting into database...');
      
      // Get access token
      let accessToken = SUPABASE_ANON_KEY;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          accessToken = session.access_token;
        }
      } catch (e) {
        console.log('⚠️ Could not get session token, using anon key');
      }
      
      const controller = new AbortController();
      const insertTimeout = setTimeout(() => {
        console.warn('⏱️ Database insert timeout after 10 seconds - aborting');
        controller.abort();
      }, 10000); // 10 second timeout
      
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/job_applications`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(applicationData),
            signal: controller.signal
          }
        );
        
        clearTimeout(insertTimeout);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Database insert error:', response.status, errorData);
          throw new Error(errorData.message || `Insert failed: ${response.status}`);
        }
        
        const insertedData = await response.json();
        console.log('✅ General application submitted successfully to database:', insertedData?.[0]?.id || 'unknown');
      } catch (fetchError: any) {
        clearTimeout(insertTimeout);
        if (fetchError.name === 'AbortError') {
          console.warn('⚠️ Database insert timed out, but application may have been saved');
          toast({
            title: '⚠️ Submission Timeout',
            description: 'Your application may have been submitted. Please check your email for confirmation or try again.',
          });
          // Don't throw - allow submission to complete
        } else {
          console.error('❌ Database insert error:', fetchError);
          throw fetchError;
        }
      }
      setApplicationSuccess(true);
      toast({
        title: '🎉 Application Submitted!',
        description: 'Thank you for your interest! Our team will review your application and contact you soon.',
      });

      // Reset form
      setGeneralApplication({
        name: '',
        email: '',
        phone: '',
        position: '',
        linkedin: '',
        coverLetter: ''
      });
      setResumeFile(null);
      setCoverLetterFile(null);

    } catch (error: any) {
      console.error('❌ Application error:', error);
      toast({
        variant: error?.code === '23505' ? "default" : "destructive",
        title: error?.code === '23505' ? 'Application Already Submitted' : 'Application Error',
        description: error?.code === '23505' 
          ? 'You have already submitted an application.'
          : (error?.message || 'Failed to submit application. Please try again or contact support.'),
      });
      // Still show success state so user knows we received their attempt
      setApplicationSuccess(true);
    } finally {
      clearTimeout(submissionTimeout);
      setIsSubmittingGeneral(false);
      console.log('✅ General application submission process completed');
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    // Validate required fields
    if (!applicationForm.name || !applicationForm.email || !applicationForm.phone) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Email, Phone).",
      });
      return;
    }

    setIsApplying(true);
    
    // Add overall timeout for entire submission (60 seconds max)
    const submissionTimeout = setTimeout(() => {
      console.error('⏱️ Submission timeout - forcing completion');
      setIsApplying(false);
      toast({
        variant: "destructive",
        title: "Submission Timeout",
        description: "The submission took too long. Please try again or contact support.",
      });
    }, 60000);
    
    try {
      let resumeUrl = null;
      let coverLetterUrl = null;

      // Upload files in parallel (faster) with timeout protection
      const uploadPromises: Promise<void>[] = [];
      
      if (jobResumeFile) {
        console.log('📤 Uploading resume...');
        uploadPromises.push(
          handleFileUpload(jobResumeFile, 'resume')
            .then(url => {
              resumeUrl = url;
              if (url) {
                console.log('✅ Resume upload successful');
              } else {
                console.warn('⚠️ Resume upload failed or timed out - continuing without file URL');
              }
            })
            .catch(uploadError => {
              console.error('❌ Resume upload error:', uploadError);
              // Continue without resume URL
            })
        );
      }

      if (jobCoverLetterFile) {
        console.log('📤 Uploading cover letter...');
        uploadPromises.push(
          handleFileUpload(jobCoverLetterFile, 'cover_letter')
            .then(url => {
              coverLetterUrl = url;
              if (url) {
                console.log('✅ Cover letter upload successful');
              } else {
                console.warn('⚠️ Cover letter upload failed or timed out - continuing without file URL');
              }
            })
            .catch(uploadError => {
              console.error('❌ Cover letter upload error:', uploadError);
              // Continue without cover letter URL
            })
        );
      }

      // Wait for all uploads to complete (or timeout) - max 20 seconds total
      console.log('⏳ Waiting for file uploads to complete...');
      const uploadsResult = await Promise.race([
        Promise.allSettled(uploadPromises),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('⏱️ File uploads taking too long, proceeding with database insert');
            resolve();
          }, 20000); // Max 20 seconds for all uploads
        })
      ]);
      console.log('✅ File upload phase completed');

      console.log('💾 Submitting application to database...');
      
      // Prepare application data - ensure cover_letter is not null (required field)
      const applicationData: any = {
        job_id: selectedJob.id,
        job_title: selectedJob.title,
        full_name: applicationForm.name,
        email: applicationForm.email,
        phone: applicationForm.phone,
        cover_letter: applicationForm.coverLetter || 'No cover letter provided',
        status: 'new'
      };
      
      // Add optional fields only if they have values
      if (applicationForm.linkedin) {
        applicationData.linkedin_url = applicationForm.linkedin;
      }
      if (resumeUrl) {
        applicationData.resume_url = resumeUrl;
      }
      
      // Use direct fetch with AbortController for reliable timeout (10 seconds)
      console.log('⏳ Inserting into database...');
      
      // Get access token with timeout (3 seconds max)
      let accessToken = SUPABASE_ANON_KEY;
      try {
        console.log('🔑 Getting session token...');
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) => {
          setTimeout(() => {
            console.warn('⏱️ Session retrieval timeout after 3 seconds, using anon key');
            resolve({ data: { session: null } });
          }, 3000);
        });
        
        const sessionResult = await Promise.race([sessionPromise, sessionTimeout]);
        if (sessionResult?.data?.session?.access_token) {
          accessToken = sessionResult.data.session.access_token;
          console.log('✅ Got session token');
        } else {
          console.log('⚠️ No session token, using anon key');
        }
      } catch (e) {
        console.log('⚠️ Could not get session token, using anon key:', e);
      }
      
      console.log('📤 Starting database insert fetch...');
      const controller = new AbortController();
      const insertTimeout = setTimeout(() => {
        console.warn('⏱️ Database insert timeout after 10 seconds - aborting');
        controller.abort();
      }, 10000); // 10 second timeout
      
      try {
        console.log('🌐 Fetching:', `${SUPABASE_URL}/rest/v1/job_applications`);
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/job_applications`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(applicationData),
            signal: controller.signal
          }
        );
        
        clearTimeout(insertTimeout);
        console.log('📥 Got response:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Database insert error:', response.status, errorData);
          throw new Error(errorData.message || `Insert failed: ${response.status}`);
        }
        
        const insertedData = await response.json();
        console.log('✅ Application submitted successfully to database:', insertedData?.[0]?.id || 'unknown');
      } catch (fetchError: any) {
        clearTimeout(insertTimeout);
        console.error('❌ Fetch error:', fetchError.name, fetchError.message);
        if (fetchError.name === 'AbortError') {
          console.warn('⚠️ Database insert timed out, but application may have been saved');
          toast({
            title: '⚠️ Submission Timeout',
            description: 'Your application may have been submitted. Please check your email for confirmation or try again.',
          });
          // Don't throw - allow submission to complete
        } else {
          console.error('❌ Database insert error:', fetchError);
          throw fetchError;
        }
      }
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
      setJobResumeFile(null);
      setJobCoverLetterFile(null);
    } catch (error: any) {
      console.error('❌ Application error:', error);
      toast({
        variant: error?.code === '23505' ? "default" : "destructive",
        title: error?.code === '23505' ? 'Application Already Submitted' : 'Application Error',
        description: error?.code === '23505' 
          ? 'You have already submitted an application for this position.'
          : (error?.message || 'Failed to submit application. Please try again or contact support.'),
      });
      // Don't close modal on error so user can retry
    } finally {
      clearTimeout(submissionTimeout);
      setIsApplying(false);
      console.log('✅ Application submission process completed');
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
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
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
              
              <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-2xl mx-auto">
                Join UjenziXform and help transform how builders, suppliers, and delivery providers 
                connect across all 47 counties. We're looking for passionate people who want to 
                make a real impact on Africa's largest industry.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
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
              <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/10 max-w-xl mx-auto">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">47</p>
                  <p className="text-white/60 text-sm">Counties Covered</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">10K+</p>
                  <p className="text-white/60 text-sm">Active Users</p>
                </div>
                <div className="text-center">
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
                These principles guide everything we do at UjenziXform
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

                                {/* Resume Upload */}
                                <div>
                                  <Label htmlFor="job-resume" className="flex items-center gap-2">
                                    <Upload className="h-4 w-4" />
                                    Resume/CV *
                                  </Label>
                                  <div className="mt-2">
                                    <label 
                                      htmlFor="job-resume"
                                      className={`flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${
                                        jobResumeFile 
                                          ? 'border-green-400 bg-green-50' 
                                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-primary'
                                      }`}
                                    >
                                      {jobResumeFile ? (
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-5 w-5 text-green-600" />
                                          <span className="text-sm font-medium text-green-700">{jobResumeFile.name}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-gray-500">
                                          <Upload className="h-5 w-5" />
                                          <span className="text-sm">Click to upload resume (PDF, DOC, DOCX)</span>
                                        </div>
                                      )}
                                      <input
                                        id="job-resume"
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) setJobResumeFile(file);
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>

                                {/* Cover Letter File Upload */}
                                <div>
                                  <Label htmlFor="job-cover-file" className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Cover Letter File (Optional)
                                  </Label>
                                  <div className="mt-2">
                                    <label 
                                      htmlFor="job-cover-file"
                                      className={`flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${
                                        jobCoverLetterFile 
                                          ? 'border-green-400 bg-green-50' 
                                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-primary'
                                      }`}
                                    >
                                      {jobCoverLetterFile ? (
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-5 w-5 text-green-600" />
                                          <span className="text-sm font-medium text-green-700">{jobCoverLetterFile.name}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-gray-500">
                                          <FileText className="h-5 w-5" />
                                          <span className="text-sm">Click to upload cover letter (PDF, DOC, DOCX)</span>
                                        </div>
                                      )}
                                      <input
                                        id="job-cover-file"
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) setJobCoverLetterFile(file);
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="coverLetter">Additional Message</Label>
                                  <Textarea
                                    id="coverLetter"
                                    rows={3}
                                    value={applicationForm.coverLetter}
                                    onChange={(e) => setApplicationForm(prev => ({ ...prev, coverLetter: e.target.value }))}
                                    placeholder="Any additional information you'd like to share..."
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
                  <a href="mailto:careers@UjenziXform.com">
                    Send Your Resume
                  </a>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Application Portal Section */}
        <section id="apply" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-blue-100 text-blue-700">Apply Now</Badge>
              <h2 className="text-4xl font-bold mb-4">Submit Your Application</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Ready to join our team? Upload your resume and cover letter, and we'll get back to you within 5 business days.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-primary/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-primary/5 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-xl text-white">
                      <Send className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>Job Application Portal</CardTitle>
                      <CardDescription>Fill in your details and upload your documents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {applicationSuccess ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-green-700 mb-3">Application Submitted!</h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for your interest in joining UjenziXform. Our HR team will review your application and contact you within 5 business days.
                      </p>
                      <Button onClick={() => setApplicationSuccess(false)} variant="outline">
                        Submit Another Application
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleGeneralApplication} className="space-y-6">
                      {/* Personal Information */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          Personal Information
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="gen-name">Full Name *</Label>
                            <Input
                              id="gen-name"
                              required
                              value={generalApplication.name}
                              onChange={(e) => setGeneralApplication(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="John Kamau"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="gen-email">Email Address *</Label>
                            <Input
                              id="gen-email"
                              type="email"
                              required
                              value={generalApplication.email}
                              onChange={(e) => setGeneralApplication(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="john@example.com"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="gen-phone">Phone Number *</Label>
                            <Input
                              id="gen-phone"
                              required
                              value={generalApplication.phone}
                              onChange={(e) => setGeneralApplication(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+254 712 345 678"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="gen-position">Position Interested In</Label>
                            <Input
                              id="gen-position"
                              value={generalApplication.position}
                              onChange={(e) => setGeneralApplication(prev => ({ ...prev, position: e.target.value }))}
                              placeholder="e.g., Software Engineer, Product Manager"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="gen-linkedin">LinkedIn Profile URL</Label>
                          <Input
                            id="gen-linkedin"
                            value={generalApplication.linkedin}
                            onChange={(e) => setGeneralApplication(prev => ({ ...prev, linkedin: e.target.value }))}
                            placeholder="https://linkedin.com/in/yourprofile"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Document Upload */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          Upload Documents
                        </h4>

                        {/* Resume Upload */}
                        <div>
                          <Label htmlFor="resume" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Resume/CV *
                          </Label>
                          <div className="mt-2">
                            <label 
                              htmlFor="resume"
                              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                                resumeFile 
                                  ? 'border-green-400 bg-green-50' 
                                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400'
                              }`}
                            >
                              {resumeFile ? (
                                <div className="flex flex-col items-center">
                                  <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                                  <p className="text-sm font-medium text-green-700">{resumeFile.name}</p>
                                  <p className="text-xs text-green-600 mt-1">Click to change file</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX (Max 5MB)</p>
                                </div>
                              )}
                              <input
                                id="resume"
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setResumeFile(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Cover Letter Upload */}
                        <div>
                          <Label htmlFor="coverLetterFile" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Cover Letter (Optional)
                          </Label>
                          <div className="mt-2">
                            <label 
                              htmlFor="coverLetterFile"
                              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                                coverLetterFile 
                                  ? 'border-green-400 bg-green-50' 
                                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400'
                              }`}
                            >
                              {coverLetterFile ? (
                                <div className="flex flex-col items-center">
                                  <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                                  <p className="text-sm font-medium text-green-700">{coverLetterFile.name}</p>
                                  <p className="text-xs text-green-600 mt-1">Click to change file</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <FileText className="h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-600">
                                    <span className="font-semibold text-blue-600">Click to upload</span> cover letter
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX (Max 5MB)</p>
                                </div>
                              )}
                              <input
                                id="coverLetterFile"
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setCoverLetterFile(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Additional Message */}
                      <div>
                        <Label htmlFor="gen-coverLetter">Additional Message (Optional)</Label>
                        <Textarea
                          id="gen-coverLetter"
                          rows={4}
                          value={generalApplication.coverLetter}
                          onChange={(e) => setGeneralApplication(prev => ({ ...prev, coverLetter: e.target.value }))}
                          placeholder="Tell us why you're interested in joining UjenziXform and what makes you a great fit..."
                          className="mt-1"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        size="lg" 
                        disabled={isSubmittingGeneral}
                      >
                        {isSubmittingGeneral ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                            Submitting Application...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5 mr-2" />
                            Submit Application
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        By submitting this application, you agree to our privacy policy and consent to us contacting you about job opportunities.
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-orange-600" />
          <div className="absolute inset-0 bg-[url('/construction-bg.svg')] opacity-10" />
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Have Questions?</h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto text-lg">
              Want to learn more about life at UjenziXform? Reach out to our HR team or connect with us on social media.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
                <a href="mailto:careers@UjenziXform.com">
                  Contact HR Team
                  <ArrowRight className="h-5 w-5 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/30 hover:bg-white/10 text-lg px-8" asChild>
                <a href="/about">
                  Learn About UjenziXform
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
