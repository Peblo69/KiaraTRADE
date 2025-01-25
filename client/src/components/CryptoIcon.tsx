import { FC, useState, useEffect, useRef } from "react";
import { getTokenImage } from "@/lib/token-metadata";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Major token logos as base64 SVGs for instant loading
const MAJOR_TOKEN_LOGOS: Record<string, string> = {
  'BTC-USDT': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iI0Y3OTMxQSIvPjxwYXRoIGQ9Ik0yMi42NzggMTQuMzk0Yy0uMjU2LTIuNzItMi42Ny0zLjYxNi01LjcxOS00LjE3bC0xLjE2OC00LjcwMi0yLjg1Mi41NzYgMS4xNCA0LjU3OGMtLjc1LjE1LTEuNTE4LjMxNi0yLjI4LjQ3NkwxMC42NiA2LjYwNWwtMi44NTMuNTc3IDEuMTY3IDQuNzAyYy0uNjE2LjEyNy0xLjIyLjI1LTEuODE1LjM3OGwtLjAwNC0uMDE1LTMuOTQuNzk2LjU3IDIuOTI3czIuMDktLjQyNyAyLjA1My0uMzk1YzEuMTQ2LS4yMzIgMS43LjI0NiAxLjk2NSAxLjAybDEuMzEgNS4yNzNjLjA2Ni0uMDEzLjE1Mi0uMDI4LjI0OC0uMDQzbC0uMjUuMDVjLjE4My43My4yMzEgMi4wMy0uOTAyIDIuMjYtLjAzOC4wMDgtMi4wODUuNDE3LTIuMDg1LjQxN2wuOCAzLjMzNiAzLjk0LS43OTZjLjczLS4xNDcgMS40NS0uMjg1IDIuMTU4LS40MzFsMS4xOCA0Ljc0NSAyLjg1My0uNTc3LTEuMTY4LTQuNzAyYy43ODItLjE3OCAxLjU1LS4zNDMgMi4zLS41MDVsMS4xNiA0LjY4NSAyLjg1My0uNTc2LTEuMTc1LTQuNzNjNC44NzEtMS4wNyA4LjQ1LTIuOTYgNy40NjItNy41OS0uNzktMy43MjUtMy40ODQtNC45NzItNi42MzMtNC44My42NjQtMS45NTctLjEzNS0zLjE3Ny0xLjk4My0zLjg4MXptLS42NSA4LjE2OGMxLjEyNiAzLjE4NC00LjM4IDQuNDUzLTYuMDA0IDQuODIyTDE0LjYgMjIuNzFjMS42Mi0uMzc0IDYuODEyLTEuMTI4IDcuNDI4LTQuMTQ4em0tMi44NDQtNy41ODVjMS4wMzIgMi45MjItNS44IDQuMDYyLTcuMTM3IDQuMzdsLTEuMjI3LTQuOTNjMS4zMzctLjMwOCA2LjM1My0uOTkgNy4zNjQuNTZ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+',
  'ETH-USDT': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzYyN0VFQSIvPjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMCkiPjxwYXRoIGQ9Ik0xNi4xOTggNEwxNi4wODcgNC4zNzc2VjIwLjI1NzJMMTYuMTk4IDIwLjM2ODJMMjMuNTQxNiAxNi4wODQ0TDE2LjE5OCA0WiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC42MDIiLz48cGF0aCBkPSJNMTYuMTk4IDRMOC44NTQyNSAxNi4wODQ0TDE2LjE5OCAyMC4zNjgyVjEyLjcxOTZWNFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTE2LjE5OCAyMS45MDQ2TDE2LjEzNDUgMjEuOTgyNlYyNy43OTUyTDE2LjE5OCAyNy45ODFMJQNM0NDE2IDIzLjYwMTlMMTYuMTk4IDIxLjkwNDZaIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjYwMiIvPjxwYXRoIGQ9Ik0xNi4xOTggMjcuOTgxVjIxLjkwNDZMOC44NTQyNSAyMy42MDE5TDE2LjE5OCAyNy45ODFaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xNi4xOTggMjAuMzY4MkwyMy41NDE2IDE2LjA4NDRMMTYuMTk4IDEyLjcxOTZWMjAuMzY4MloiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjxwYXRoIGQ9Ik04Ljg1NDI1IDE2LjA4NDRMMTYuMTk4IDIwLjM2ODJWMTIuNzE5Nkw4Ljg1NDI1IDE2LjA4NDRaIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjYwMiIvPjwvZz48L3N2Zz4=',
  'SOL-USDT': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzAwRkZBMyIvPjxwYXRoIGQ9Ik05LjY2NjY3IDIwLjMzMzNDOS44NjY2NyAyMC4xMzMzIDEwLjEzMzMgMjAgMTAuNDY2NyAyMEgyNS4yQzI1LjczMzMgMjAgMjYgMjAuNiAyNS42IDIxTDIyLjMzMzMgMjQuMjY2N0MyMi4xMzMzIDI0LjQ2NjcgMjEuODY2NyAyNC42IDIxLjUzMzMgMjQuNkg2LjhDNi4yNjY2NyAyNC42IDYgMjQgNi40IDIzLjZMOS42NjY2NyAyMC4zMzMzWiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNOS42NjY2NyAxMi40QzkuODY2NjcgMTIuMiAxMC4xMzMzIDEyIDEwLjQ2NjcgMTJIMjUuMkMyNS43MzMzIDEyIDI2IDEyLjYgMjUuNiAxM0wyMi4zMzMzIDE2LjI2NjdDMjIuMTMzMyAxNi40NjY3IDIxLjg2NjcgMTYuNiAyMS41MzMzIDE2LjZINi44QzYuMjY2NjcgMTYuNiA2IDE2IDYuNCAxNS42TDkuNjY2NjcgMTIuNFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTIyLjMzMzMgNC40QzIyLjEzMzMgNC4yIDIxLjg2NjcgNCAyMS41MzMzIDRINi44QzYuMjY2NjcgNCA2IDQuNiA2LjQgNUw5LjY2NjY3IDguMjY2NjdDOS44NjY2NyA4LjQ2NjY3IDEwLjEzMzMgOC42IDEwLjQ2NjcgOC42SDI1LjJDMjUuNzMzMyA4LjYgMjYgOCAyNS42IDcuNkwyMi4zMzMzIDQuNFoiIGZpbGw9IndoaXRlIi8+PC9zdmc+'
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