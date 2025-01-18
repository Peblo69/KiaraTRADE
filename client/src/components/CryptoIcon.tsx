import { FC, useState, useEffect, useCallback } from "react";
import { getCryptoIconUrl } from "@/lib/token-metadata";
import { cn } from "@/lib/utils";

interface CryptoIconProps {
  symbol: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Cache for successful image loads
const successfulImageCache = new Map<string, string>();

const CryptoIcon: FC<CryptoIconProps> = ({ 
  symbol, 
  className,
  size = "md" 
}) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState<string>(() => {
    // Try to get from cache first
    return successfulImageCache.get(symbol) || getCryptoIconUrl(symbol);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  // List of possible sources for the current symbol
  const sources = [
    // CoinGecko
    `https://assets.coingecko.com/coins/images/1/large/${symbol.replace('-USDT', '').toLowerCase()}.png`,
    `https://assets.coingecko.com/coins/images/1/thumb/${symbol.replace('-USDT', '').toLowerCase()}.png`,

    // Binance
    `https://bin.bnbstatic.com/image/crypto/${symbol.replace('-USDT', '').toLowerCase()}.png`,
    `https://dex-bin.bnbstatic.com/static/images/coins/${symbol.replace('-USDT', '').toLowerCase()}.png`,

    // CryptoCompare
    `https://www.cryptocompare.com/media/37746251/${symbol.replace('-USDT', '').toLowerCase()}.png`,

    // GitHub Cryptocurrency Icons
    `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.replace('-USDT', '').toLowerCase()}.png`,

    // Gate.io
    `https://www.gate.io/images/coin_icon/${symbol.replace('-USDT', '').toUpperCase()}.png`,

    // OKX
    `https://static.okx.com/cdn/assets/${symbol.replace('-USDT', '').toLowerCase()}/logo.png`,

    // CoinMarketCap
    `https://s2.coinmarketcap.com/static/img/coins/64x64/${symbol.replace('-USDT', '').toLowerCase()}.png`,
  ];

  const tryNextSource = useCallback(() => {
    if (currentSourceIndex < sources.length) {
      setImgSrc(sources[currentSourceIndex]);
      setCurrentSourceIndex(prev => prev + 1);
    } else {
      setError(true);
      generateFallbackIcon();
    }
  }, [currentSourceIndex, symbol, sources]);

  const generateFallbackIcon = () => {
    setIsLoading(false);
    const symbol1 = symbol.charAt(0).toUpperCase();
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Generate a color based on the symbol's first character
      ctx.fillStyle = `hsl(${symbol1.charCodeAt(0) * 137.508} 70% 50%)`;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol1, size/2, size/2);
      const fallbackUrl = canvas.toDataURL();
      setImgSrc(fallbackUrl);
      // Don't cache fallback icons
    }
  };

  useEffect(() => {
    // Reset state when symbol changes
    setIsLoading(true);
    setError(false);
    setCurrentSourceIndex(0);

    // Check cache first
    const cachedUrl = successfulImageCache.get(symbol);
    if (cachedUrl) {
      setImgSrc(cachedUrl);
      setIsLoading(false);
    } else {
      tryNextSource();
    }
  }, [symbol, tryNextSource]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
    // Cache successful loads
    successfulImageCache.set(symbol, imgSrc);
  };

  const handleError = () => {
    if (!error) {
      tryNextSource();
    }
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-muted rounded-full" />
      )}
      <img
        src={imgSrc}
        alt={`${symbol} icon`}
        className={cn(
          "rounded-full",
          sizeClasses[size],
          isLoading ? "opacity-0" : "opacity-100",
          "transition-opacity duration-200"
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default CryptoIcon;