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
  if (!url) {
    console.log(`[Validate Social] ${platform}: No URL provided`);
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    let isValid = false;
    let validatedUrl = url;

    switch (platform) {
      case 'website':
        isValid = parsedUrl.protocol === 'https:';
        break;
      case 'telegram':
        isValid = parsedUrl.hostname === 't.me';
        // Add t.me prefix if missing
        if (!url.startsWith('https://t.me/')) {
          validatedUrl = `https://t.me/${url.replace(/^@/, '')}`;
          isValid = true;
        }
        break;
      case 'twitter':
        isValid = ['twitter.com', 'x.com'].includes(parsedUrl.hostname);
        // Add twitter.com prefix if missing
        if (!url.startsWith('https://twitter.com/')) {
          validatedUrl = `https://twitter.com/${url.replace(/^@/, '')}`;
          isValid = true;
        }
        break;
        case 'pumpfun':
            isValid = parsedUrl.hostname === 'pump.fun';
            break;
      default:
        isValid = true;
    }

    console.log(`[Validate Social] ${platform}: ${isValid ? 'Valid' : 'Invalid'} URL: ${validatedUrl}`);
    return isValid ? validatedUrl : null;
  } catch (error) {
    console.log(`[Validate Social] ${platform}: Invalid URL format: ${url}`);

    // Try to fix common issues
    if (platform === 'telegram' && !url.includes('://')) {
      const fixed = `https://t.me/${url.replace(/^@/, '')}`;
      console.log(`[Validate Social] ${platform}: Fixed telegram URL: ${fixed}`);
      return fixed;
    }
      if (platform === 'twitter' && !url.includes('://')) {
          const fixed = `https://twitter.com/${url.replace(/^@/, '')}`;
          console.log(`[Validate Social] ${platform}: Fixed twitter URL: ${fixed}`);
          return fixed;
      }
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