import { useUnifiedTokenStore } from './unified-token-store';

/**
 * Transform any token URI to a valid HTTP URL
 * Handles IPFS URIs, direct IPFS hashes, and regular HTTP URLs
 */
export function transformUri(uri: string): string {
  if (!uri) return '';

  // Handle IPFS URIs
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  // Handle direct IPFS hashes
  if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${uri}`;
  }

  // Handle Arweave URIs
  if (uri.startsWith('ar://')) {
    return uri.replace('ar://', 'https://arweave.net/');
  }

  // Already a valid HTTP(S) URL
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  return uri;
}

/**
 * Get image URL from token URI with fallback
 */
export function getImageUrl(uri?: string): string {
  if (!uri) return '/placeholder.png';
  return transformUri(uri);
}