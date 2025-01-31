export const validateImageUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
};

export const validateSocialUrl = (url?: string): string | null => {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    // Normalize common social platforms
    if (parsed.hostname.includes('twitter.com') || parsed.hostname.includes('x.com')) {
      return `https://x.com/${parsed.pathname.split('/').filter(Boolean)[0]}`;
    }

    if (parsed.hostname.includes('t.me')) {
      return `https://t.me/${parsed.pathname.split('/').filter(Boolean)[0]}`;
    }

    // For website, just return the normalized URL
    return parsed.toString();
  } catch {
    return null;
  }
};