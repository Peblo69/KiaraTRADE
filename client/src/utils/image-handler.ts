
export const validateImageUrl = async (url: string | null | undefined): Promise<boolean> => {
    if (!url) {
        console.log('[ImageHandler] No URL provided');
        return false;
    }

    // Convert IPFS URLs to gateway URLs
    let processedUrl = url;
    if (url.includes('ipfs')) {
        if (!url.startsWith('https://')) {
            processedUrl = `https://ipfs.io/ipfs/${url.split('ipfs://').pop()}`;
            console.log('[ImageHandler] Converted IPFS URL to:', processedUrl);
        }
    }

    // Validate URL actually returns an image
    try {
        const response = await fetch(processedUrl);
        const contentType = response.headers.get('content-type');
        return contentType?.startsWith('image/') || false;
    } catch (error) {
        console.error('[ImageHandler] Error validating image:', error);
        return false;
    }
};
