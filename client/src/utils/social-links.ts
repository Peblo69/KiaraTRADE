
export function validateSocialUrl(url: string | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    
    // Whitelist of allowed domains
    const allowedDomains = {
      'twitter.com': true,
      'x.com': true,
      't.me': true,
      'telegram.me': true,
      'pump.fun': true,
      'discord.gg': true,
      'medium.com': true
    };

    // Check if domain is allowed
    if (allowedDomains[parsedUrl.hostname]) {
      return url;
    }

    // Allow HTTPS websites
    if (parsedUrl.protocol === 'https:') {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

export function getSocialIcon(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('twitter') || parsedUrl.hostname.includes('x.com')) return 'twitter';
    if (parsedUrl.hostname.includes('t.me') || parsedUrl.hostname.includes('telegram')) return 'telegram';
    if (parsedUrl.hostname.includes('pump.fun')) return 'pumpfun';
    if (parsedUrl.hostname.includes('discord')) return 'discord';
    if (parsedUrl.hostname.includes('medium')) return 'medium';
    return 'website';
  } catch {
    return 'website';
  }
}
