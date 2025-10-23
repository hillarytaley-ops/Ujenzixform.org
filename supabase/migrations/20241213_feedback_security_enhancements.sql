-- Feedback Form Security Enhancements
-- Migration: 20241213_feedback_security_enhancements.sql

-- Enhance feedback table with security fields
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS submission_time_ms INTEGER;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS form_interactions INTEGER DEFAULT 0;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS security_score INTEGER DEFAULT 100;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS security_flags TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS honeypot_field TEXT;

-- Create feedback security log table
CREATE TABLE IF NOT EXISTS public.feedback_security_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES public.feedback(id),
    
    -- Security event details
    event_type TEXT NOT NULL CHECK (event_type IN ('submission', 'validation_failed', 'spam_detected', 'rate_limit_exceeded', 'suspicious_activity', 'bot_detected')),
    event_details JSONB,
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    session_data JSONB,
    
    -- Response details
    action_taken TEXT,
    blocked BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new table
ALTER TABLE public.feedback_security_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy for feedback security log (admin only)
CREATE POLICY "feedback_security_log_admin_view" ON public.feedback_security_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- System can insert security logs
CREATE POLICY "feedback_security_log_system_insert" ON public.feedback_security_log
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- Create feedback spam detection function
CREATE OR REPLACE FUNCTION public.detect_feedback_spam(
    feedback_data JSONB,
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
        score := score + 60;
        indicators := array_append(indicators, 'honeypot_filled');
    END IF;
    
    -- Check submission time (too fast = bot)
    IF (submission_metadata->>'submission_time_ms')::INTEGER < 5000 THEN
        score := score + 40;
        indicators := array_append(indicators, 'too_fast_submission');
    END IF;
    
    -- Check form interactions (too few = bot)
    IF (submission_metadata->>'form_interactions')::INTEGER < 3 THEN
        score := score + 30;
        indicators := array_append(indicators, 'insufficient_interactions');
    END IF;
    
    -- Check for spam content in message
    IF (feedback_data->>'message') ~* '(viagra|casino|loan|bitcoin|crypto|investment|forex|gambling)' THEN
        score := score + 50;
        indicators := array_append(indicators, 'spam_content');
    END IF;
    
    -- Check for URL patterns (spam indicator)
    IF (feedback_data->>'message') ~* 'https?://|www\.|\.com|\.org' THEN
        score := score + 30;
        indicators := array_append(indicators, 'contains_urls');
    END IF;
    
    -- Check email domain for disposable emails
    IF (feedback_data->>'email') ~* '@(tempmail|10minutemail|guerrillamail|mailinator|throwaway)' THEN
        score := score + 40;
        indicators := array_append(indicators, 'disposable_email');
    END IF;
    
    -- Check for excessive caps (spam indicator)
    IF (feedback_data->>'message') ~ '[A-Z]{10,}' THEN
        score := score + 20;
        indicators := array_append(indicators, 'excessive_caps');
    END IF;
    
    -- Check for repeated characters (spam indicator)
    IF (feedback_data->>'message') ~ '(.)\1{5,}' THEN
        score := score + 25;
        indicators := array_append(indicators, 'repeated_characters');
    END IF;
    
    -- Determine action based on score
    IF score >= 80 THEN
        action := 'block';
    ELSIF score >= 50 THEN
        action := 'review';
    ELSE
        action := 'allow';
    END IF;
    
    RETURN QUERY SELECT 
        score >= 80,
        score,
        indicators,
        action;
END;
$$;

-- Create feedback rate limiting function
CREATE OR REPLACE FUNCTION public.check_feedback_rate_limit(
    ip_address_param INET,
    time_window_minutes INTEGER DEFAULT 60,
    max_submissions INTEGER DEFAULT 3
)
RETURNS TABLE (
    rate_limit_ok BOOLEAN,
    current_count INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE
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
    
    -- Count feedback submissions from this IP in the time window
    SELECT COUNT(*) INTO submission_count
    FROM public.feedback
    WHERE ip_address = ip_address_param
    AND created_at > window_start;
    
    -- Return rate limit status
    RETURN QUERY SELECT 
        submission_count < max_submissions,
        submission_count,
        next_reset;
END;
$$;

-- Create secure feedback submission function
CREATE OR REPLACE FUNCTION public.submit_feedback_secure(
    feedback_data JSONB,
    submission_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    feedback_id UUID,
    message TEXT,
    requires_review BOOLEAN
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    new_feedback_id UUID;
    spam_check RECORD;
    client_ip INET;
BEGIN
    -- Get client IP
    client_ip := (submission_metadata->>'ip_address')::INET;
    
    -- Check for spam
    SELECT * INTO spam_check
    FROM public.detect_feedback_spam(feedback_data, submission_metadata);
    
    -- Insert feedback with security metadata
    INSERT INTO public.feedback (
        user_id,
        name,
        email,
        subject,
        message,
        rating,
        ip_address,
        user_agent,
        submission_time_ms,
        form_interactions,
        security_score,
        spam_score,
        security_flags,
        is_suspicious,
        honeypot_field
    ) VALUES (
        (feedback_data->>'user_id')::UUID,
        feedback_data->>'name',
        feedback_data->>'email',
        feedback_data->>'subject',
        feedback_data->>'message',
        (feedback_data->>'rating')::INTEGER,
        client_ip,
        submission_metadata->>'user_agent',
        (submission_metadata->>'submission_time_ms')::INTEGER,
        (submission_metadata->>'form_interactions')::INTEGER,
        (submission_metadata->>'security_score')::INTEGER,
        spam_check.spam_score,
        spam_check.spam_indicators,
        spam_check.is_spam,
        submission_metadata->>'honeypot_field'
    ) RETURNING id INTO new_feedback_id;
    
    -- Log submission
    INSERT INTO public.feedback_security_log (
        feedback_id,
        event_type,
        event_details,
        risk_level,
        ip_address,
        user_agent
    ) VALUES (
        new_feedback_id,
        'submission',
        jsonb_build_object(
            'spam_score', spam_check.spam_score,
            'indicators', spam_check.spam_indicators,
            'action', spam_check.recommended_action
        ),
        CASE 
            WHEN spam_check.spam_score >= 80 THEN 'high'
            WHEN spam_check.spam_score >= 50 THEN 'medium'
            ELSE 'low'
        END,
        client_ip,
        submission_metadata->>'user_agent'
    );
    
    -- Return result
    IF spam_check.is_spam THEN
        RETURN QUERY SELECT 
            false,
            new_feedback_id,
            'Your feedback has been flagged for review due to security concerns.',
            true;
    ELSE
        RETURN QUERY SELECT 
            true,
            new_feedback_id,
            'Thank you for your feedback. We appreciate your input.',
            spam_check.recommended_action = 'review';
    END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_ip_created ON public.feedback(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_security_score ON public.feedback(security_score);
CREATE INDEX IF NOT EXISTS idx_feedback_spam_score ON public.feedback(spam_score);
CREATE INDEX IF NOT EXISTS idx_feedback_security_log_ip_created ON public.feedback_security_log(ip_address, created_at);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.detect_feedback_spam TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_feedback_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.submit_feedback_secure TO authenticated, anon;














