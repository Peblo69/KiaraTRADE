export const validateImageUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
};

export const validateSocialUrl = (url: string | undefined | null, platform: 'website' | 'telegram' | 'twitter' | 'pumpfun'): string | null => {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    switch (platform) {
      case 'website':
        return parsed.protocol === 'https:' ? url : null;
      case 'telegram':
        return parsed.hostname === 't.me' ? 
          `https://t.me/${parsed.pathname.split('/').filter(Boolean)[0]}` : null;
      case 'twitter':
        return (parsed.hostname === 'twitter.com' || parsed.hostname === 'x.com') ? 
          `https://x.com/${parsed.pathname.split('/').filter(Boolean)[0]}` : null;
      case 'pumpfun':
        return parsed.hostname === 'pump.fun' ? url : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
};