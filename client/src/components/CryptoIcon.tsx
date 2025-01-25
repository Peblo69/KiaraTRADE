import { useEffect, useRef, useState } from "react";
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
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10"
};

export const CryptoIcon = ({ symbol, size = "md", className }: CryptoIconProps) => {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(symbol);

  const generateFallbackIcon = () => {
    // For major tokens, use pre-defined SVGs
    if (MAJOR_TOKEN_LOGOS[symbol]) {
      return MAJOR_TOKEN_LOGOS[symbol];
    }

    // For Solana addresses, use a default token icon
    if (isSolanaAddress) {
      const shortAddr = `${symbol.slice(0, 2)}${symbol.slice(-2)}`;
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#1E1E1E"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9CA3AF" font-family="monospace" font-size="12">
            ${shortAddr}
          </text>
        </svg>
      `)}`;
    }

    // For other symbols, create a simple colored circle with text
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
      "#FFEEAD", "#D4A5A5", "#9FA8DA", "#CE93D8"
    ];
    
    const hash = symbol.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const color = colors[Math.abs(hash) % colors.length];
    const shortSymbol = symbol.replace("-USDT", "").slice(0, 4);

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="system-ui" font-size="12" font-weight="bold">
          ${shortSymbol}
        </text>
      </svg>
    `)}`;
  };

  useEffect(() => {
    mountedRef.current = true;

    const fetchImage = async () => {
      if (!symbol) {
        setImgSrc(generateFallbackIcon());
        setIsLoading(false);
        return;
      }

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

        if (imageUrl) {
          setImgSrc(imageUrl);
          setError(false);
        } else {
          throw new Error("No image URL returned");
        }
      } catch (err) {
        if (!mountedRef.current) return;
        setImgSrc(generateFallbackIcon());
        setError(true);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      mountedRef.current = false;
    };
  }, [symbol]);

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
      <img
        src={imgSrc}
        alt={symbol}
        className={cn(
          "w-full h-full object-cover",
          isLoading ? "opacity-0" : "opacity-100",
          "transition-all duration-200 ease-in-out transform hover:scale-110"
        )}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!error) {
            setError(true);
            target.src = generateFallbackIcon();
          }
        }}
      />
    </div>
  );
};

export default CryptoIcon;
