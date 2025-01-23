// client/src/lib/token-metadata.ts

export function preloadTokenImages(tokens: { imageLink: string; symbol: string }[]) {
  tokens.forEach(token => {
    const img = new Image();
    img.src = token.imageLink;
    img.onload = () => {
      console.log(`Preloaded image for ${token.symbol}`);
    };
    img.onerror = () => {
      console.error(`Failed to preload image for ${token.symbol}`);
    };
  });
}

export function getTokenImage(token: { imageLink?: string; symbol: string }): string {
  return token.imageLink || 'https://via.placeholder.com/150';
}
