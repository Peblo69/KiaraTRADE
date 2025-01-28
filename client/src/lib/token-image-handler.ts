import { create } from 'zustand';

interface TokenImageState {
  images: { [tokenAddress: string]: string };
  setTokenImage: (tokenAddress: string, imageUrl: string) => void;
  getTokenImage: (tokenAddress: string) => string | null;
}

export const useTokenImageStore = create<TokenImageState>((set, get) => ({
  images: {},
  
  setTokenImage: (tokenAddress, imageUrl) => {
    set((state) => ({
      images: {
        ...state.images,
        [tokenAddress]: imageUrl
      }
    }));
  },
  
  getTokenImage: (tokenAddress) => {
    return get().images[tokenAddress] || null;
  }
}));

export async function fetchTokenImage(uri: string): Promise<string | null> {
  try {
    console.log('[TokenImage] Fetching metadata from:', uri);
    const response = await fetch(uri);
    const data = await response.json();
    console.log('[TokenImage] Metadata received:', data);
    
    if (data.image) {
      return data.image;
    }
    return null;
  } catch (error) {
    console.error('[TokenImage] Error fetching metadata:', error);
    return null;
  }
}
