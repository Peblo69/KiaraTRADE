
export function formatSocialLink(type: 'twitter' | 'telegram', handle: string): string {
  switch (type) {
    case 'twitter':
      return `https://twitter.com/${handle.replace('@', '')}`;
    case 'telegram':
      return `https://t.me/${handle.replace('@', '')}`;
    default:
      return '';
  }
}
