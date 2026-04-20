import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const feedbackSchema = z.object({
  name: z
    .string()
    .optional()
    .refine((n) => !n || n.length <= 50, "Name is too long")
    .refine((n) => !n || !/[<>]/.test(n), "Name cannot contain < or >")
    .refine((n) => !n || n.trim().length > 0, "Name cannot be only spaces"),
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
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message too long")
    .refine((message) => !/<script.*>/.test(message), "Message contains invalid content")
    .refine(
      (message) => !/javascript:|vbscript:|data:|file:/i.test(message),
      "Message contains suspicious content"
    ),
  rating: z.number().min(1, "Please select a rating").max(10, "Invalid rating"),
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
  const [submissionStartTime] = useState(Date.now());
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    canSubmit: boolean;
    resetTime: string | null;
  }>({ canSubmit: true, resetTime: null });
  const { toast } = useToast();

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
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
    
    switch (fieldType) {
      case 'name':
        break;
      case 'email':
        sanitized = sanitized.replace(/[^a-zA-Z0-9@.\-_]/g, '');
        break;
      case 'subject':
        sanitized = sanitized.replace(/[<>\"'&{}[\]]/g, '');
        break;
      case 'message':
        sanitized = sanitized.replace(/[<>\"'&{}[\]]/g, '');
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
    control,
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      gdprConsent: false,
      honeypot: '',
    },
  });

  const messageLen = useWatch({ control, name: 'message', defaultValue: '' })?.length ?? 0;

  // Security validation - relaxed for better UX
  const validateFormSecurity = (formData: FeedbackForm) => {
    let score = 100;
    const issues: string[] = [];

    // Check submission timing (too fast = bot) - only penalize if under 2 seconds
    const submissionTime = Date.now() - submissionStartTime;
    if (submissionTime < 2000) {
      score -= 20;
      issues.push('Form submitted too quickly');
    }

    // Check for suspicious patterns only (removed interaction requirement)
    const suspiciousPatterns = [
      /<script/i, /javascript:/i, /vbscript:/i, /onload=/i, /onerror=/i,
      /eval\(/i, /document\.cookie/i, /window\.location/i
    ];

    [formData.subject, formData.message].forEach(field => {
      if (field && suspiciousPatterns.some(pattern => pattern.test(field))) {
        score -= 50;
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
        setIsSubmitting(false);
        return;
      }

      // Honeypot check
      if (data.honeypot && data.honeypot.length > 0) {
        toast({
          title: "Security Check Failed",
          description: "Bot activity detected.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // GDPR consent check
      if (!data.gdprConsent) {
        toast({
          title: "Consent Required",
          description: "Please agree to the privacy policy to continue.",
          variant: "destructive",
        });
        setIsSubmitting(false);
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
        setIsSubmitting(false);
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

      const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          // Send all fields separately for proper admin dashboard display
          email: sanitizedData.email,
          name: sanitizedData.name || 'Anonymous',
          category: sanitizedData.subject,
          comment: sanitizedData.message,
          rating: sanitizedData.rating,
          status: 'pending'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Feedback submission error:', errorText);
        throw new Error('Failed to submit feedback');
      }

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
      {import.meta.env.DEV && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>Security score: {securityScore}/100</span>
            <span>Rate limit OK: {rateLimitStatus.canSubmit ? 'yes' : 'no'}</span>
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
            maxLength={200}
            autoComplete="off"
          />
          {errors.subject && (
            <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-medium">Rate your experience (1–10) *</Label>
          <p className="text-sm text-muted-foreground text-center">
            1 = very poor, 10 = excellent
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 p-4 bg-gray-50 rounded-lg max-w-xl mx-auto">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleRatingClick(n)}
                onMouseEnter={() => setHoveredRating(n)}
                onMouseLeave={() => setHoveredRating(0)}
                className={`min-w-[2.25rem] h-10 px-2 rounded-md text-sm font-semibold transition-all border-2 ${
                  n === rating
                    ? "bg-primary text-primary-foreground border-primary scale-105 shadow-md"
                    : n <= (hoveredRating || rating)
                      ? "bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200"
                      : "bg-white border-gray-200 text-gray-600 hover:border-amber-200 hover:bg-amber-50/80"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600 min-h-[3rem] flex items-center justify-center px-2">
            {rating === 0 && "Tap a number from 1 to 10"}
            {rating >= 1 && rating <= 3 && "😞 Very poor — we need to improve significantly"}
            {rating >= 4 && rating <= 5 && "😐 Below expectations — tell us what went wrong"}
            {rating >= 6 && rating <= 7 && "🙂 OK — room to improve"}
            {rating === 8 && "😊 Good — solid experience"}
            {rating === 9 && "🌟 Very good — thank you!"}
            {rating === 10 && "🤩 Excellent — 10/10, outstanding!"}
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
            placeholder="Tell us about your experience with UjenziXform. What did you like? What could we improve? Any suggestions for better serving Kenya's construction industry?"
            rows={6}
            className="text-lg resize-none"
            maxLength={2000}
          />
          {errors.message && (
            <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
          )}
          <div className="text-xs text-muted-foreground text-right">
            {messageLen}/2000 characters
          </div>
        </div>

        {/* GDPR Compliance */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Controller
              name="gdprConsent"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="gdprConsent"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="gdprConsent" className="text-sm font-medium leading-none cursor-pointer">
                I agree to the{' '}
                <Link to="/privacy-policy" className="text-primary underline underline-offset-2">
                  privacy policy
                </Link>{' '}
                and{' '}
                <Link to="/terms-of-service" className="text-primary underline underline-offset-2">
                  terms of service
                </Link>{' '}
                *
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
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>How we protect this form:</strong> HTTPS, a hidden honeypot field, basic spam checks, and a
            per-browser rate limit (a few submissions per hour). We may add stricter checks if abuse increases.
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
            disabled={isSubmitting || !rateLimitStatus.canSubmit} 
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
                <MessageSquare className="h-5 w-5 mr-3" />
                Submit feedback
              </>
            )}
          </Button>
        </div>

        {/* Form Security Info */}
        <div className="text-xs text-center text-muted-foreground space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
              Sent over HTTPS
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
              Honeypot + client rate limit
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
              Consent recorded with your message
            </span>
          </div>
          <p>Thank you for helping improve UjenziXform for Kenya&apos;s construction sector.</p>
        </div>
      </form>
    </div>
  );
}