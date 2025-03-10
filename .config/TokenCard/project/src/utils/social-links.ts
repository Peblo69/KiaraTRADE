/**
 * Utility functions for handling social media links
 * Integration Point: Add validation and transformation logic for social links
 */

/**
 * Validates and formats social media URLs
 * @param url - Raw social media URL
 * @param platform - Social media platform
 * @returns Validated and formatted URL or null if invalid
 */
export function validateSocialUrl(url: string | undefined, platform: 'twitter' | 'telegram' | 'website' | 'pumpfun'): string | null {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    
    // Platform-specific validation
    switch (platform) {
      case 'twitter':
        return parsedUrl.hostname === 'twitter.com' ? url : null;
      case 'telegram':
        return parsedUrl.hostname === 't.me' ? url : null;
      case 'website':
        return parsedUrl.protocol === 'https:' ? url : null;
      case 'pumpfun':
        return parsedUrl.hostname === 'pumpfun.io' ? url : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}