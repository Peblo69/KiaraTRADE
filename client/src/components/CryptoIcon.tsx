import { useEffect, useRef, useState } from "react";
import { getTokenImage } from "@/lib/token-metadata";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// High-quality SVG logos for major tokens
const MAJOR_TOKEN_LOGOS: Record<string, string> = {
  'BTC-USDT': `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNmNzkzMWEiLz48cGF0aCBkPSJNMjMuMTg5IDE0LjAyYy4zMTQtMi4wOTYtMS4yODMtMy4yMjMtMy40NjUtMy45NzVsLjcwOC0yLjg0LTEuNzI4LS40M2wtLjY5IDIuNzY1Yy0uNDU0LS4xMTQtLjkyLS4yMi0xLjM4NS0uMzI2bC42OTUtMi43ODNMMTUuNTk2IDZsLS43MDggMi44MzljLS4zNzYtLjA4Ni0uNzQ1LS4xNy0xLjEwNC0uMjZsLjAwMi0uMDA5LTIuMzg0LS41OTUtLjQ2IDEuODQ2czEuMjgzLjI5NCAxLjI1Ni4zMTJjLjcuMTc1LjgyNi42MzguODA1IDEuMDA2bC0uODA2IDMuMjM1Yy4wNDguMDEyLjExLjAzLjE4LjA1N2wtLjE4My0uMDQ1LTEuMTMgNC41MzJjLS4wODYuMjEyLS4zMDMuNTMxLS43OTMuNDEuMDE4LjAyNi0xLjI1Ni0uMzEzLTEuMjU2LS4zMTNsLS44NTggMS45NzggMi4yNS41NjFjLjQxOC4xMDUuODI4LjIxNSAxLjIzMS4zMThsLS43MTUgMi44NzIgMS43MjcuNDMuNzE1LTIuODY2YzIuOTQ4LjU1OCA1LjE2NC4zMzMgNi4wOTctMi4zMzMuNzUyLTIuMTQ2LS4wMzctMy4zODUtMS41NTMtNC4xOTIgMS4xLS4yNTQgMS45My0uOTc3IDIuMTUtMi40N3pNMTkuMzMyIDE5LjljLS41MzQgMi4xNDctNC4xNDguOTg3LTUuMzIuNjk1bC45NS0zLjgwNWMxLjE3Mi4yOTIgNC45MjkuODczIDQuMzcgMy4xMXptLjUzNS01LjU3Yy0uNDg3IDEuOTUzLTMuNDk1Ljk2LTQuNDcuNzE3bC44Ni0zLjQ1YC45NzUuMjQ0YzMuMzkuODQ3IDQuMTE4LjI0NyAzLjYxIDIuNDc2eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==`,
  'ETH-USDT': `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2MjdlZWEiLz48ZyBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTE2LjQ5OCA0djguODdsNy40OTcgMy4zNXoiIG9wYWNpdHk9Ii42MDIiLz48cGF0aCBkPSJNMTYuNDk4IDR2OC44N2wtNy40OTcgMy4zNXoiIG9wYWNpdHk9Ii4zIi8+PHBhdGggZmlsbC1ydWxlPSJub256ZXJvIiBkPSJNMTYuNDk4IDIxLjk2OHY2LjAyN0wyNCAyMC42MTZ6IiBvcGFjaXR5PSIuNiIvPjxwYXRoIGQ9Ik0xNi40OTggMjcuOTk1di02LjAyOEw5IDIwLjYxNnoiIG9wYWNpdHk9Ii4zIi8+PHBhdGggZmlsbC1vcGFjaXR5PSI5OTUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTE2LjQ5OCAyMC41NzNsMy40OTctMy4zNS03LjQ5Ny0zLjM0OXoiIG9wYWNpdHk9Ii45MDEiLz48cGF0aCBkPSJNMTYuNDk4IDIwLjU3M2w3LjQ5Ny0zLjM1LTcuNDk3LTMuMzQ5eiIgb3BhY2l0eT0iLjMiLz48L2c+PC9zdmc+`,
  'SOL-USDT': `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzOTcuNyAzMTEuNyI+PGNpcmNsZSBjeD0iMTk4LjgiIGN5PSIxNTUuOCIgcj0iMTU1LjgiIGZpbGw9IiMwMGZmYTMiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjc2LjkgMTM1LjVjLTMuOC0xLjMtNy45LTItMTItMmgtMTY4Yy00LjEgMC04LjIuNy0xMiAyLTEyLjQgNC4yLTIxLjMgMTYtMjEuMyAyOS43IDAgMTcuNCAxNC4xIDMxLjUgMzEuNSAzMS41aDE3MS42YzE3LjQgMCAzMS41LTE0LjEgMzEuNS0zMS41IDAtMTMuNy04LjktMjUuNS0yMS4zLTI5Ljd6TTExMi41IDIxNGMtMy44LTEuMy03LjktMi0xMi0yaC0yNGMtNC4xIDAtOC4yLjctMTIgMi0xMi40IDQuMi0yMS4zIDE2LTIxLjMgMjkuNyAwIDE3LjQgMTQuMSAzMS41IDMxLjUgMzEuNWgyNy44YzE3LjQgMCAzMS41LTE0LjEgMzEuNS0zMS41IDAtMTMuNy04LjktMjUuNS0yMS4zLTI5Ljd6TTMzMy4yIDU3Yy0zLjgtMS4zLTcuOS0yLTEyLTJoLTI0Yy00LjEgMC04LjIuNy0xMiAyLTEyLjQgNC4yLTIxLjMgMTYtMjEuMyAyOS43IDAgMTcuNCAxNC4xIDMxLjUgMzEuNSAzMS41aDI3LjhjMTcuNCAwIDMxLjUtMTQuMSAzMS41LTMxLjUgMC0xMy43LTguOS0yNS41LTIxLjMtMjkuN3oiLz48L3N2Zz4=`
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

    // For other tokens, create a colorful circle with symbol
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