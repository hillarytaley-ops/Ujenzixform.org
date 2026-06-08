export type BotProvider = 'turnstile' | 'recaptcha';

/** Prefer Cloudflare Turnstile when both keys are set (already allowed in CSP). */
export function getConfiguredBotProvider(): BotProvider | null {
  const turnstile = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
  if (turnstile) return 'turnstile';

  const recaptcha = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim();
  if (recaptcha) return 'recaptcha';

  return null;
}

export function isBotChallengeConfigured(): boolean {
  return getConfiguredBotProvider() !== null;
}

export function getBotChallengeSiteKey(provider: BotProvider): string {
  if (provider === 'turnstile') {
    return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? '';
  }
  return (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ?? '';
}
