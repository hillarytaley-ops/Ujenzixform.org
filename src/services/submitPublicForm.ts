import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import type { BotProvider } from '@/lib/botChallengeConfig';

export type PublicFormType = 'contact' | 'feedback';

export interface SubmitPublicFormPayload {
  formType: PublicFormType;
  formData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  botToken?: string;
  botProvider?: BotProvider;
}

export interface SubmitPublicFormResult {
  success: boolean;
  message: string;
  submissionId?: string;
  requiresReview?: boolean;
}

export async function submitPublicForm(
  payload: SubmitPublicFormPayload,
): Promise<SubmitPublicFormResult> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-public-form`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as SubmitPublicFormResult & {
    error?: string;
  };

  if (!response.ok) {
    return {
      success: false,
      message: body.message || body.error || 'Submission failed. Please try again.',
    };
  }

  return {
    success: body.success,
    message: body.message,
    submissionId: body.submissionId,
    requiresReview: body.requiresReview,
  };
}
