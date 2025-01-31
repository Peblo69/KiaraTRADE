export const validateImageUrl = (url?: string): string | null => {
  if (!url) return null;

  // Clean and validate URL
  try {
    const cleaned = url.trim().toLowerCase();
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      return null;
    }
    const parsed = new URL(cleaned);
    return parsed.toString();
  } catch {
    return null;
  }
};

export const validateSocialUrl = (url?: string): string | null => {
  if (!url) return null;

  try {
    const cleaned = url.trim().toLowerCase();
    // Add https:// if missing
    const urlWithProtocol = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
    const parsed = new URL(urlWithProtocol);

    // Validate known social domains
    const validDomains = ['twitter.com', 'x.com', 't.me', 'telegram.me', 'telegram.org'];
    if (validDomains.some(domain => parsed.hostname.endsWith(domain))) {
      return parsed.toString();
    }

    // For other URLs, just validate the format
    return urlWithProtocol;
  } catch {
    return null;
  }
};