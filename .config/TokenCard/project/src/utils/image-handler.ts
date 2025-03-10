export function validateImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    // Only allow HTTPS URLs
    if (parsedUrl.protocol !== 'https:') return null;
    
    return url;
  } catch {
    return null;
  }
}