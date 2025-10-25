-- Contact Form Backend Implementation
-- Migration: 20241213_contact_form_backend.sql

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Form data
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Security and tracking
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT,
    
    -- Spam protection
    honeypot_field TEXT, -- Should be empty for legitimate submissions
    submission_time_ms INTEGER, -- Time taken to fill form
    form_interactions INTEGER DEFAULT 0, -- Number of form interactions
    
    -- Processing status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'responded', 'spam', 'blocked')),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    response_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Security flags
    spam_score INTEGER DEFAULT 0 CHECK (spam_score >= 0 AND spam_score <= 100),
    security_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_suspicious BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact_form_security_log table
CREATE TABLE IF NOT EXISTS public.contact_form_security_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.contact_submissions(id),
    
    -- Security event details
    event_type TEXT NOT NULL CHECK (event_type IN ('submission', 'validation_failed', 'spam_detected', 'rate_limit_exceeded', 'suspicious_activity')),
    event_details JSONB,
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_headers JSONB,
    
    -- Response details
    action_taken TEXT,
    blocked BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_form_security_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_submissions
-- Admins can view all submissions
CREATE POLICY "contact_submissions_admin_view" ON public.contact_submissions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- System can insert submissions
CREATE POLICY "contact_submissions_system_insert" ON public.contact_submissions
    FOR INSERT TO authenticated, anon
    WITH CHECK (true); -- Controlled by application logic

-- RLS Policies for contact_form_security_log
-- Admins can view security logs
CREATE POLICY "contact_security_log_admin_view" ON public.contact_form_security_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- System can insert security logs
CREATE POLICY "contact_security_log_system_insert" ON public.contact_form_security_log
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_contact_form_rate_limit(
    ip_address_param INET,
    time_window_minutes INTEGER DEFAULT 60,
    max_submissions INTEGER DEFAULT 5
)
RETURNS TABLE (
    rate_limit_ok BOOLEAN,
    current_count INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE,
    blocked_until TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    submission_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
    next_reset TIMESTAMP WITH TIME ZONE;
BEGIN
    window_start := NOW() - (time_window_minutes || ' minutes')::INTERVAL;
    next_reset := NOW() + (time_window_minutes || ' minutes')::INTERVAL;
    
    -- Count submissions from this IP in the time window
    SELECT COUNT(*) INTO submission_count
    FROM public.contact_submissions
    WHERE ip_address = ip_address_param
    AND created_at > window_start;
    
    -- Return rate limit status
    RETURN QUERY SELECT 
        submission_count < max_submissions,
        submission_count,
        next_reset,
        CASE WHEN submission_count >= max_submissions THEN next_reset ELSE NULL END;
END;
$$;

-- Create spam detection function
CREATE OR REPLACE FUNCTION public.detect_contact_form_spam(
    form_data JSONB,
    submission_metadata JSONB
)
RETURNS TABLE (
    is_spam BOOLEAN,
    spam_score INTEGER,
    spam_indicators TEXT[],
    recommended_action TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    score INTEGER := 0;
    indicators TEXT[] := ARRAY[]::TEXT[];
    action TEXT := 'allow';
BEGIN
    -- Check honeypot field
    IF (submission_metadata->>'honeypot_field') IS NOT NULL AND 
       LENGTH(submission_metadata->>'honeypot_field') > 0 THEN
        score := score + 50;
        indicators := array_append(indicators, 'honeypot_filled');
    END IF;
    
    -- Check submission time (too fast = bot)
    IF (submission_metadata->>'submission_time_ms')::INTEGER < 3000 THEN
        score := score + 30;
        indicators := array_append(indicators, 'too_fast_submission');
    END IF;
    
    -- Check form interactions (too few = bot)
    IF (submission_metadata->>'form_interactions')::INTEGER < 5 THEN
        score := score + 20;
        indicators := array_append(indicators, 'insufficient_interactions');
    END IF;
    
    -- Check for suspicious patterns in message
    IF (form_data->>'message') ~* '(viagra|casino|loan|bitcoin|crypto|investment|forex)' THEN
        score := score + 40;
        indicators := array_append(indicators, 'suspicious_content');
    END IF;
    
    -- Check for URL patterns in message (spam indicator)
    IF (form_data->>'message') ~* 'https?://|www\.' THEN
        score := score + 25;
        indicators := array_append(indicators, 'contains_urls');
    END IF;
    
    -- Check email domain
    IF (form_data->>'email') ~* '@(tempmail|10minutemail|guerrillamail|mailinator)' THEN
        score := score + 35;
        indicators := array_append(indicators, 'disposable_email');
    END IF;
    
    -- Determine action based on score
    IF score >= 70 THEN
        action := 'block';
    ELSIF score >= 40 THEN
        action := 'review';
    ELSE
        action := 'allow';
    END IF;
    
    RETURN QUERY SELECT 
        score >= 70,
        score,
        indicators,
        action;
END;
$$;

-- Create secure contact form submission function
CREATE OR REPLACE FUNCTION public.submit_contact_form(
    form_data JSONB,
    submission_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    submission_id UUID,
    message TEXT,
    requires_review BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    new_submission_id UUID;
    rate_limit_check RECORD;
    spam_check RECORD;
    client_ip INET;
BEGIN
    -- Get client IP (simplified for demo)
    client_ip := (submission_metadata->>'ip_address')::INET;
    
    -- Check rate limiting
    SELECT * INTO rate_limit_check
    FROM public.check_contact_form_rate_limit(client_ip);
    
    IF NOT rate_limit_check.rate_limit_ok THEN
        -- Log rate limit violation
        INSERT INTO public.contact_form_security_log (
            event_type, event_details, risk_level, ip_address, blocked
        ) VALUES (
            'rate_limit_exceeded',
            jsonb_build_object('ip', client_ip, 'count', rate_limit_check.current_count),
            'medium',
            client_ip,
            true
        );
        
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            'Rate limit exceeded. Please wait before submitting again.',
            false;
        RETURN;
    END IF;
    
    -- Check for spam
    SELECT * INTO spam_check
    FROM public.detect_contact_form_spam(form_data, submission_metadata);
    
    -- Insert submission
    INSERT INTO public.contact_submissions (
        first_name,
        last_name,
        email,
        phone,
        subject,
        message,
        ip_address,
        user_agent,
        referrer,
        session_id,
        honeypot_field,
        submission_time_ms,
        form_interactions,
        spam_score,
        security_flags,
        is_suspicious,
        status
    ) VALUES (
        form_data->>'firstName',
        form_data->>'lastName',
        form_data->>'email',
        form_data->>'phone',
        form_data->>'subject',
        form_data->>'message',
        client_ip,
        submission_metadata->>'user_agent',
        submission_metadata->>'referrer',
        submission_metadata->>'session_id',
        submission_metadata->>'honeypot_field',
        (submission_metadata->>'submission_time_ms')::INTEGER,
        (submission_metadata->>'form_interactions')::INTEGER,
        spam_check.spam_score,
        spam_check.spam_indicators,
        spam_check.is_spam,
        CASE 
            WHEN spam_check.is_spam THEN 'spam'
            WHEN spam_check.recommended_action = 'review' THEN 'pending'
            ELSE 'pending'
        END
    ) RETURNING id INTO new_submission_id;
    
    -- Log submission
    INSERT INTO public.contact_form_security_log (
        submission_id,
        event_type,
        event_details,
        risk_level,
        ip_address
    ) VALUES (
        new_submission_id,
        'submission',
        jsonb_build_object(
            'spam_score', spam_check.spam_score,
            'indicators', spam_check.spam_indicators,
            'action', spam_check.recommended_action
        ),
        CASE 
            WHEN spam_check.spam_score >= 70 THEN 'high'
            WHEN spam_check.spam_score >= 40 THEN 'medium'
            ELSE 'low'
        END,
        client_ip
    );
    
    -- Return result
    IF spam_check.is_spam THEN
        RETURN QUERY SELECT 
            false,
            new_submission_id,
            'Your submission has been flagged for review.',
            true;
    ELSE
        RETURN QUERY SELECT 
            true,
            new_submission_id,
            'Thank you for your message. We will respond within 24 hours.',
            spam_check.recommended_action = 'review';
    END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_ip_created ON public.contact_submissions(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_security_log_ip_created ON public.contact_form_security_log(ip_address, created_at);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_contact_form_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.detect_contact_form_spam TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.submit_contact_form TO authenticated, anon;
















