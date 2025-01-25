import { FC, useState, useEffect, useRef } from "react";
import { getTokenImage } from "@/lib/token-metadata";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Major token logos as base64 SVGs for instant loading
const MAJOR_TOKEN_LOGOS: Record<string, string> = {
  'BTC-USDT': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHBhdGggZmlsbD0iI2Y3OTMxYSIgZD0iTTE2IDMyQzcuMTYzIDMyIDAgMjQuODM3IDAgMTZTNy4xNjMgMCAxNiAwczE2IDcuMTYzIDE2IDE2LTcuMTYzIDE2LTE2IDE2em03LjE4OS0xNy41MDVjLjM2OC0yLjM0Ny0xLjQ0LTMuNjEtMy44ODctNC4wMWwuNzk1LTMuMTgtMi4wMDYtLjQ1LS43NzQgMy4wOTktLjU3Ni0uMTQ0LjgyLTMuMjgtMi4wMDYtLjQ1LS43OTUgMy4xOC0zLjIxLS44MDMtLjUzNiAyLjE1IDEuNTkuMzk4cy44ODQuMjU0LjgyNi40NzNsLS45MzIgMy43MzZjLjA1OC4wMTUuMTM2LjAzLjExLjAzbC0xLjMwOCA1LjI0Yy0uMDk5LjI0Mi0uMzUuMTg5LS43MjkuMTQ2LWMxLjU5LS4zOTgtLjg1OCAyLjA2IDMuMDI2Ljc1NS0uODIgMy4yOCAyLjAwNi40NS44MjEtMy4yOS41NzYuMTQ0LS44MiAzLjI4IDIuMDA2LjQ1Ljc5NS0zLjE4YzIuNDQyLjQ2IDQuMjgtLjE0NyA0Ljc3LTIuNjE4LjM5NS0xLjk5LS4xOTctMy4xNC0xLjY1LTMuODg1IDEuMTcxLS4yNyAyLjA1My0xLjA0IDIuMjg3LTIuNjN6bS00LjA3IDUuNzNjLS4yOCAxLjEyMi0yLjE3NS41MTUtMi43ODguMzYzbC45OTUtMy45ODRjLjYxMy4xNTMgMi41NzcuNDM3IDIuMjkzIDMuNjJ6bS4yOC01LjczYy0uMjU1IDEuMDIyLTEuODMuNTAzLTIuMzQ1LjM3NmwuOTAyLTMuNjE1Yy41MTUuMTI5IDIuMTY4LjM3IDEuNDQzIDMuMjR6Ii8+PC9zdmc+',
  'ETH-USDT': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHBhdGggZmlsbD0iIzYyN0VFQSIgZD0iTTE2IDMyQzcuMTYzIDMyIDAgMjQuODM3IDAgMTZTNy4xNjMgMCAxNiAwczE2IDcuMTYzIDE2IDE2LTcuMTYzIDE2LTE2IDE2em03LjEwMi0xNS45MDNsLTYuODctMTAuMjhjLS4yODEtLjQxOS0uOTAyLS40MTktMS4xODMgMGwtNi44NyAxMC4yOGMtLjI4MS40MTktLjI4MSAxLjAyIDAgMS40NGw2Ljg3IDEwLjI4Yy4yODEuNDE5LjkwMi40MTkgMS4xODMgMGw2Ljg3LTEwLjI4Yy4yODEtLjQyLjI4MS0xLjAyMSAwLTEuNDR6TTEzLjUgMjMuOTZWMTIuMDRMMjAgMThsLTYuNSA1Ljk2eiIvPjwvc3ZnPg==',
  'SOL-USDT': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzOTcuNyAzMTEuNyI+PHBhdGggZmlsbD0iIzAwRkZBMyIgZD0iTTY0LjYgMjM3LjljMi40LTIuNCA1LjctMy44IDkuMi0zLjhoMzE3LjRjNS44IDAgOC43IDctNC41IDEyLjFsLTkyLjQgNTMuN2MtMi40IDEuNC01LjIgMi4yLTguMSAyLjJINjUuNWMtNS44IDAtOC43LTctNC41LTEyLjFsOTEuOS01My43YzIuNC0xLjQgNS4yLTIuMiA4LjEtMi4yaDE4OS40TDY0LjYgMjM3Ljl6Ii8+PHBhdGggZmlsbD0iIzAwRkZBMyIgZD0iTTY0LjYgMy44QzY3IDEuNCA3MC4zIDAgNzMuOCAwaDMxNy40YzUuOCAwIDguNyA3LTQuNSAxMi4xbC05Mi40IDUzLjdjLTIuNCAxLjQtNS4yIDIuMi04LjEgMi4ySDY1LjVjLTUuOCAwLTguNy03LTQuNS0xMi4xbDkxLjktNTMuN0M3My44IDEuNCA3Ni42LjYgNzkuNS42aDE4OS40TDY0LjYgMy44eiIvPjxwYXRoIGZpbGw9IiMwMEZGQTMiIGQ9Ik0zMzEuNSAxMjAuOGMyLjQtMi40IDUuNy0zLjggOS4yLTMuOGg1MS41YzUuOCAwIDguNyA3LTQuNSAxMi4xbC05Mi40IDUzLjdjLTIuNCAxLjQtNS4yIDIuMi04LjEgMi4ySDY1LjVjLTUuOCAwLTguNy03LTQuNS0xMi4xbDkxLjktNTMuN2MyLjQtMS40IDUuMi0yLjIgOC4xLTIuMmgxODkuNGwtMTguOSAzLjh6Ii8+PC9zdmc+'
};

interface CryptoIconProps {
  symbol: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showFallback?: boolean;
  isSolanaAddress?: boolean;
}

const CryptoIcon: FC<CryptoIconProps> = ({ 
  symbol, 
  className,
  size = "md",
  showFallback = true,
  isSolanaAddress = false
}) => {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const generateFallbackIcon = () => {
    // For major tokens, use pre-defined SVGs
    if (MAJOR_TOKEN_LOGOS[symbol]) {
      return MAJOR_TOKEN_LOGOS[symbol];
    }

    // For Solana addresses, use a default token icon
    if (isSolanaAddress) {
      const shortAddr = `${symbol.slice(0, 2)}${symbol.slice(-2)}`;
      return generateIconForSymbol(shortAddr);
    }
    return generateIconForSymbol(symbol);
  };

  const generateIconForSymbol = (text: string) => {
    const cleanSymbol = text.replace('-USDT', '');
    const symbol1 = cleanSymbol.charAt(0).toUpperCase();
    const symbol2 = cleanSymbol.length > 1 ? cleanSymbol.charAt(1).toLowerCase() : '';

    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Generate a deterministic color based on the symbol
    const hash = cleanSymbol.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash % 360);
    const saturation = 65 + (hash % 15); // 65-80%
    const lightness = 45 + (hash % 10); // 45-55%

    // Main background
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();

    // Text shadow for better readability
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.arc(size/2, size/2 + 1, size/2 - 1, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol1 + symbol2, size/2, size/2);

    return canvas.toDataURL();
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function loadImage() {
      if (!symbol || error && retryCount >= 2) return;

      try {
        setIsLoading(true);

        // For major tokens, use pre-defined SVGs
        if (MAJOR_TOKEN_LOGOS[symbol]) {
          setImgSrc(MAJOR_TOKEN_LOGOS[symbol]);
          setIsLoading(false);
          setError(false);
          return;
        }

        // For other tokens, fetch from API
        const imageUrl = await getTokenImage({ symbol });

        if (!mountedRef.current) return;

        if (!imageUrl) {
          throw new Error('No image URL returned');
        }

        // Preload image to ensure it loads correctly
        const img = new Image();
        img.src = imageUrl;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          // Timeout after 5 seconds
          timeoutId = setTimeout(() => reject(new Error('Image load timeout')), 5000);
        });

        if (!mountedRef.current) return;

        clearTimeout(timeoutId);
        setImgSrc(imageUrl);
        setIsLoading(false);
        setError(false);
        setRetryCount(0);
      } catch (err) {
        console.error(`Error loading icon for ${symbol}:`, err);
        if (!mountedRef.current) return;

        clearTimeout(timeoutId);
        if (retryCount < 2) {
          // Exponential backoff for retries
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            if (mountedRef.current) {
              setRetryCount(prev => prev + 1);
            }
          }, delay);
        } else {
          setImgSrc(showFallback ? generateFallbackIcon() : '');
          setError(true);
          setIsLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [symbol, retryCount, showFallback, isSolanaAddress]);

  if (!symbol) {
    return null;
  }

  return (
    <div className={cn(
      "relative flex items-center justify-center overflow-hidden rounded-full bg-muted", 
      sizeClasses[size],
      "hover:scale-110 transition-transform duration-200 ease-out",
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
          <Loader2 className={cn(
            "animate-spin",
            size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
          )} />
        </div>
      )}
      {imgSrc && (
        <img
          src={imgSrc}
          alt={`${symbol} icon`}
          className={cn(
            "w-full h-full object-cover",
            isLoading ? "opacity-0" : "opacity-100",
            "transition-all duration-200 ease-in-out transform hover:scale-110"
          )}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!error && showFallback) {
              target.src = generateFallbackIcon();
              setError(true);
            }
          }}
        />
      )}
    </div>
  );
};

export default CryptoIcon;