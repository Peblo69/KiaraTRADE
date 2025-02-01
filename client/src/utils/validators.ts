export const validateImageUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
};

export const validateSocialUrl = (url: string | null | undefined, platform: string): string | null => {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);

    switch (platform) {
      case 'website':
        return parsedUrl.protocol === 'https:' ? url : null;
      case 'telegram':
        return parsedUrl.hostname === 't.me' ? url : null;
      case 'twitter':
        return ['twitter.com', 'x.com'].includes(parsedUrl.hostname) ? url : null;
      default:
        return url;
    }
  } catch {
    return null;
  }
};

export function formatSocialLinks(links: {
  website?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  pumpfun?: string | null;
}) {
  const validLinks: Record<string, string | null> = {};

  // Website validation
  if (links.website) {
    const validWebsite = validateSocialUrl(links.website, 'website');
    if (validWebsite) validLinks.website = validWebsite;
  }

  // Telegram validation
  if (links.telegram) {
    const validTelegram = validateSocialUrl(links.telegram, 'telegram');
    if (validTelegram) validLinks.telegram = validTelegram;
  }

  // Twitter validation
  if (links.twitter) {
    const validTwitter = validateSocialUrl(links.twitter, 'twitter');
    if (validTwitter) validLinks.twitter = validTwitter;
  }

  // PumpFun link
  if (links.pumpfun) {
    validLinks.pumpfun = links.pumpfun;
  }

  return validLinks;
}