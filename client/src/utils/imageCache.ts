const imageCache = new Map<string, string>();

export const cacheImage = (tokenAddress: string, imageUrl: string) => {
    imageCache.set(tokenAddress, imageUrl);
};

export const getCachedImage = (tokenAddress: string) => {
    return imageCache.get(tokenAddress);
};
