export const validateImageUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
};

export const validateSocialUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  try {
    // Handle common shorthand formats
    if (url.startsWith('@')) {
      if (url.includes('twitter.com') || url.includes('x.com')) {
        return `https://twitter.com/${url.replace('@', '')}`;
      }
      return `https://t.me/${url.replace('@', '')}`;
    }

    // Add https if missing
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const parsed = new URL(url);

    // Validate and format based on platform
    if (parsed.hostname === 't.me' || parsed.hostname.includes('telegram')) {
      return `https://t.me/${parsed.pathname.replace('/', '')}`;
    }

    if (parsed.hostname === 'twitter.com' || parsed.hostname === 'x.com') {
      return `https://twitter.com/${parsed.pathname.replace('/', '')}`;
    }

    return url;
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

  console.log('Formatting social links:', links);

  // Website validation
  if (links.website) {
    const validWebsite = validateSocialUrl(links.website, 'website');
    console.log('Validated website:', validWebsite);
    if (validWebsite) validLinks.website = validWebsite;
  }

  // Twitter validation
  if (links.twitter) {
    const validTwitter = validateSocialUrl(links.twitter, 'twitter');
    console.log('Validated twitter:', validTwitter);
    if (validTwitter) validLinks.twitter = validTwitter;
  }

  // Telegram validation
  if (links.telegram) {
    const validTelegram = validateSocialUrl(links.telegram, 'telegram');
    console.log('Validated telegram:', validTelegram);
    if (validTelegram) validLinks.telegram = validTelegram;
  }

  // PumpFun link (no validation needed as we construct it)
  if (links.pumpfun) {
    validLinks.pumpfun = links.pumpfun;
  }

  console.log('Final valid links:', validLinks);
  return validLinks;
}