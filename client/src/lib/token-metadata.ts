import { useUnifiedTokenStore } from './unified-token-store';

export function transformUri(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return uri;
}

export function getImageUrl(uri?: string): string {
  if (!uri) return '/placeholder.png';
  return transformUri(uri);
}