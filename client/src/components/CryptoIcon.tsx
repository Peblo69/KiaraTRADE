import { FC, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";

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
  const mountedRef = useRef(true);

  // Get token metadata from store
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => 
      isSolanaAddress ? t.address === symbol : t.symbol === symbol
    )
  );

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const generateFallbackIcon = () => {
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
    if (!mountedRef.current) return;

    // If we have token metadata with an image, use it
    if (token?.metadata?.image) {
      setImgSrc(token.metadata.image);
      setIsLoading(false);
      setError(false);
    } else if (showFallback) {
      setImgSrc(generateFallbackIcon());
      setIsLoading(false);
      setError(true);
    } else {
      setImgSrc('');
      setIsLoading(false);
      setError(true);
    }
  }, [token?.metadata?.image, symbol, showFallback, isSolanaAddress]);

  if (!symbol) {
    return null;
  }

  return (
    <div className={cn(
      "relative flex items-center justify-center overflow-hidden rounded-full bg-muted", 
      sizeClasses[size], 
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
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
            "transition-opacity duration-200"
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