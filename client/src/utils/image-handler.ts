export const validateImageUrl = (url: string | null | undefined): string | null => {
    if (!url) {
        console.log('[ImageHandler] No URL provided');
        return null;
    }

    // Check if it's an IPFS URL and properly formatted
    if (url.includes('ipfs')) {
        if (!url.startsWith('https://')) {
            url = `https://ipfs.io/ipfs/${url.split('ipfs://').pop()}`;
            console.log('[ImageHandler] Converted IPFS URL to:', url);
        }
    }

    // Basic URL validation
    try {
        new URL(url);
        console.log('[ImageHandler] Valid URL format:', url);
        return url;
    } catch {
        console.error('[ImageHandler] Invalid URL format:', url);
        return null;
    }
};
