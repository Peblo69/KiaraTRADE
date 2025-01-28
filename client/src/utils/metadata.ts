import axios from 'axios';

export const processImageUrl = (url: string) => {
  if (!url) return '';
  // Handle IPFS URLs
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  return url;
};

export const fetchTokenMetadataFromUri = async (uri: string) => {
  try {
    const response = await fetch(uri);
    const data = await response.json();
    return {
      ...data,
      image: processImageUrl(data.image),
      website: data.website || '',
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
};
