import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MessageSquare, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const feedbackSchema = z.object({
  name: z.string()
    .optional()
    .refine(name => !name || (name.length <= 50 && /^[a-zA-Z\s\-']*$/.test(name)), "Name contains invalid characters"),
  email: z.string()
    .email("Please enter a valid email")
    .max(100, "Email address too long")
    .refine(email => !email.includes('..'), "Invalid email format")
    .refine(email => !/@(tempmail|10minutemail|guerrillamail|mailinator)/.test(email), "Disposable email addresses not allowed"),
  subject: z.string()
    .min(1, "Subject is required")
    .max(200, "Subject too long")
    .refine(subject => !/<.*>/.test(subject), "Subject contains invalid characters")
    .refine(subject => !/script|javascript|vbscript/i.test(subject), "Subject contains suspicious content"),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message too long")
    .refine(message => !/<script.*>/.test(message), "Message contains invalid content")
    .refine(message => !/javascript:|vbscript:|data:|file:/i.test(message), "Message contains suspicious content")
    .refine(message => !/(viagra|casino|loan|bitcoin|crypto|investment|forex)/i.test(message), "Message contains spam content"),
  rating: z.number().min(1, "Please select a rating").max(5, "Invalid rating"),
  gdprConsent: z.boolean().refine(val => val === true, "You must agree to the privacy policy"),
  honeypot: z.string().max(0, "Bot detected") // Should be empty
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  onSuccess?: () => void;
}

export function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [securityScore, setSecurityScore] = useState(100);
  const [formInteractions, setFormInteractions] = useState(0);
  const [submissionStartTime] = useState(Date.now());
  const [rateLimitStatus, setRateLimitStatus] = useState({ canSubmit: true, resetTime: null });
  const { toast } = useToast();

  // Track form interactions for security
  const trackInteraction = (type: string) => {
    setFormInteractions(prev => prev + 1);
    console.log('Feedback form interaction:', type);
  };

  // Check rate limits
  useEffect(() => {
    const checkRateLimit = () => {
      const storageKey = 'feedback-rate-limit';
      const rateLimitData = localStorage.getItem(storageKey);
      const now = Date.now();
      
      if (rateLimitData) {
        const { count, resetTime } = JSON.parse(rateLimitData);
        
        if (now < resetTime) {
          if (count >= 3) { // 3 feedback submissions per hour
            setRateLimitStatus({
              canSubmit: false,
              resetTime: new Date(resetTime).toLocaleTimeString()
            });
            return;
          }
        } else {
          // Reset counter
          localStorage.setItem(storageKey, JSON.stringify({
            count: 0,
            resetTime: now + 3600000 // 1 hour
          }));
        }
      } else {
        // First visit
        localStorage.setItem(storageKey, JSON.stringify({
          count: 0,
          resetTime: now + 3600000
        }));
      }
      
      setRateLimitStatus({ canSubmit: true, resetTime: null });
    };

    checkRateLimit();
  }, []);

  // Advanced input sanitization
  const sanitizeInput = (input: string, fieldType: string): string => {
    if (!input) return '';
    
    let sanitized = input.trim();
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>"'&]/g, '');
    
    // Field-specific sanitization
    switch (fieldType) {
      case 'name':
        sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');
        break;
      case 'email':
        sanitized = sanitized.replace(/[^a-zA-Z0-9@.\-_]/g, '');
        break;
      case 'subject':
        sanitized = sanitized.replace(/[<>"'&{}[\]]/g, '');
        break;
      case 'message':
        sanitized = sanitized.replace(/[<>"'&{}[\]]/g, '');
        sanitized = sanitized.slice(0, 2000);
        break;
    }
    
    return sanitized;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      gdprConsent: false,
      honeypot: ''
    }
  });

  // Watch form values for security validation
  const formValues = watch();

  // Security validation
  const validateFormSecurity = (formData: FeedbackForm) => {
    let score = 100;
    const issues: string[] = [];

    // Check submission timing (too fast = bot)
    const submissionTime = Date.now() - submissionStartTime;
    if (submissionTime < 5000) {
      score -= 30;
      issues.push('Form submitted too quickly');
    }

    // Check form interactions
    if (formInteractions < 3) {
      score -= 25;
      issues.push('Insufficient form interactions');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i, /javascript/i, /vbscript/i, /onload/i, /onerror/i,
      /<.*>/, /eval\(/i, /document\./i, /window\./i
    ];

    [formData.subject, formData.message].forEach(field => {
      if (field && suspiciousPatterns.some(pattern => pattern.test(field))) {
        score -= 40;
        issues.push('Suspicious content detected');
      }
    });

    setSecurityScore(score);
    return { score, issues, isValid: score >= 50 };
  };

  const onSubmit = async (data: FeedbackForm) => {
    setIsSubmitting(true);
    
    try {
      // Rate limiting check
      if (!rateLimitStatus.canSubmit) {
        toast({
          title: "Rate Limit Exceeded",
          description: `Please wait until ${rateLimitStatus.resetTime} before submitting again.`,
          variant: "destructive",
        });
        return;
      }

      // Honeypot check
      if (data.honeypot && data.honeypot.length > 0) {
        toast({
          title: "Security Check Failed",
          description: "Bot activity detected.",
          variant: "destructive",
        });
        return;
      }

      // GDPR consent check
      if (!data.gdprConsent) {
        toast({
          title: "Consent Required",
          description: "Please agree to the privacy policy to continue.",
          variant: "destructive",
        });
        return;
      }

      // Security validation
      const securityValidation = validateFormSecurity(data);
      if (!securityValidation.isValid) {
        toast({
          title: "Security Validation Failed",
          description: "Please review your input and try again.",
          variant: "destructive",
        });
        return;
      }

      // Sanitize input data
      const sanitizedData = {
        name: data.name ? sanitizeInput(data.name, 'name') : null,
        email: sanitizeInput(data.email, 'email'),
        subject: sanitizeInput(data.subject, 'subject'),
        message: sanitizeInput(data.message, 'message'),
        rating: data.rating
      };

      const { data: userData } = await supabase.auth.getUser();
      
      // Enhanced database insertion with security metadata
      const { error } = await supabase.from("feedback").insert({
        user_id: userData.user?.id || null,
        name: sanitizedData.name,
        email: sanitizedData.email,
        subject: sanitizedData.subject,
        message: sanitizedData.message,
        rating: sanitizedData.rating,
        // Security metadata
        ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => 'unknown'),
        user_agent: navigator.userAgent.slice(0, 200),
        submission_time_ms: Date.now() - submissionStartTime,
        form_interactions: formInteractions,
        security_score: securityScore
      });

      if (error) throw error;

      // Update rate limit counter
      const storageKey = 'feedback-rate-limit';
      const rateLimitData = JSON.parse(localStorage.getItem(storageKey) || '{"count": 0, "resetTime": 0}');
      localStorage.setItem(storageKey, JSON.stringify({
        count: rateLimitData.count + 1,
        resetTime: rateLimitData.resetTime
      }));

      toast({
        title: "Feedback submitted successfully!",
        description: "Thank you for your feedback. We appreciate your input and will use it to improve our services.",
      });

      reset();
      setRating(0);
      setSecurityScore(100);
      setFormInteractions(0);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Error",
        description: "An error occurred while submitting your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
    setValue("rating", selectedRating);
  };

  return (
    <div className="w-full">
      {/* Security Status */}
      {process.env.NODE_ENV === 'development' && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Security Score: {securityScore}/100</span>
              <span>Interactions: {formInteractions}</span>
              <span>Rate Limit: {rateLimitStatus.canSubmit ? '✅' : '❌'}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Rate Limit Warning */}
      {!rateLimitStatus.canSubmit && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Rate limit exceeded. Please wait until {rateLimitStatus.resetTime} before submitting again.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Honeypot field (hidden from users) */}
        <input
          type="text"
          {...register("honeypot")}
          style={{ display: 'none' }}
          tabIndex={-1}
          autoComplete="off"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-lg font-medium">Name (Optional)</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Your name"
              className="h-12 text-lg"
              onFocus={() => trackInteraction('focus')}
              onChange={(e) => {
                trackInteraction('typing');
                register("name").onChange(e);
              }}
              maxLength={50}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-lg font-medium">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="your.email@example.com"
              className="h-12 text-lg"
              onFocus={() => trackInteraction('focus')}
              onChange={(e) => {
                trackInteraction('typing');
                register("email").onChange(e);
              }}
              maxLength={100}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject" className="text-lg font-medium">Subject *</Label>
          <Input
            id="subject"
            {...register("subject")}
            placeholder="Brief summary of your feedback"
            className="h-12 text-lg"
            onFocus={() => trackInteraction('focus')}
            onChange={(e) => {
              trackInteraction('typing');
              register("subject").onChange(e);
            }}
            maxLength={200}
            autoComplete="off"
          />
          {errors.subject && (
            <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-medium">Rate Your Experience *</Label>
          <div className="flex justify-center gap-2 p-4 bg-gray-50 rounded-lg">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  handleRatingClick(star);
                  trackInteraction('rating');
                }}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-2 hover:scale-125 transition-all duration-200 rounded-full hover:bg-yellow-100"
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                      : "text-gray-300 hover:text-yellow-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600">
            {rating === 0 && "Please select a rating"}
            {rating === 1 && "😞 Poor - We need to improve"}
            {rating === 2 && "😐 Fair - Room for improvement"}
            {rating === 3 && "🙂 Good - Meeting expectations"}
            {rating === 4 && "😊 Very Good - Exceeding expectations"}
            {rating === 5 && "🤩 Excellent - Outstanding service!"}
          </div>
          {errors.rating && (
            <p className="text-sm text-destructive text-center">Please select a rating</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-lg font-medium">Your Feedback *</Label>
          <Textarea
            id="message"
            {...register("message")}
            placeholder="Tell us about your experience with MradiPro. What did you like? What could we improve? Any suggestions for better serving Kenya's construction industry?"
            rows={6}
            className="text-lg resize-none"
            onFocus={() => trackInteraction('focus')}
            onChange={(e) => {
              trackInteraction('typing');
              register("message").onChange(e);
            }}
            maxLength={2000}
          />
          {errors.message && (
            <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
          )}
          <div className="text-xs text-muted-foreground text-right">
            {formValues.message?.length || 0}/2000 characters
          </div>
        </div>

        {/* GDPR Compliance */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="gdprConsent"
              {...register("gdprConsent")}
              onCheckedChange={() => trackInteraction('checkbox')}
            />
            <div className="grid gap-1.5 leading-none">
              <Label 
                htmlFor="gdprConsent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the privacy policy and terms of service *
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you consent to us processing your feedback and contact information 
                to improve our services. You can withdraw consent at any time by contacting us.
              </p>
            </div>
          </div>
          {errors.gdprConsent && (
            <p className="text-sm text-destructive">{errors.gdprConsent.message}</p>
          )}
        </div>

        {/* Security Notice */}
        <Alert className="border-green-200 bg-green-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Protected:</strong> This form includes advanced security measures including 
            bot protection, spam filtering, rate limiting, and secure data transmission.
          </AlertDescription>
        </Alert>

        {/* Security Score Display */}
        {securityScore < 80 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Security validation warning. Please ensure all fields are properly filled and review your input.
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={isSubmitting || !rateLimitStatus.canSubmit || securityScore < 50} 
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Submitting Your Feedback...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-3" />
                Submit Secure Feedback
              </>
            )}
          </Button>
        </div>

        {/* Form Security Info */}
        <div className="text-xs text-center text-muted-foreground space-y-1">
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              SSL Encrypted
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Spam Protected
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              GDPR Compliant
            </span>
          </div>
          <p>🇰🇪 Thank you for helping us build a better construction platform for Kenya</p>
        </div>
      </form>
    </div>
  );
}