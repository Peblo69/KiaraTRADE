import { FC } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { transformUri } from "@/lib/token-metadata";

interface CryptoIconProps {
  symbol: string;
  imageUrl?: string;  // Already transformed URL
  uri?: string;       // Original URI that needs transformation
  className?: string;
  size?: "sm" | "md" | "lg";
  showFallback?: boolean;
}

const CryptoIcon: FC<CryptoIconProps> = ({ 
  symbol, 
  imageUrl,
  uri,
  className,
  size = "md",
  showFallback = true
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  // Generate a simple fallback icon when needed
  const generateFallbackIcon = () => {
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Generate a deterministic color based on the symbol
    const hash = symbol.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash % 360);

    // Draw background
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();

    // Draw text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol.slice(0, 2).toUpperCase(), size/2, size/2);

    return canvas.toDataURL();
  };

  if (!symbol) return null;

  // Use either the provided imageUrl or transform the URI
  const finalImageUrl = imageUrl || (uri ? transformUri(uri) : '');

  return (
    <div className={cn(
      "relative flex items-center justify-center overflow-hidden rounded-full bg-muted", 
      sizeClasses[size], 
      className
    )}>
      {finalImageUrl ? (
        <img
          src={finalImageUrl}
          alt={`${symbol} icon`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (showFallback) {
              target.src = generateFallbackIcon();
            } else {
              target.style.display = 'none';
            }
          }}
        />
      ) : showFallback ? (
        <img
          src={generateFallbackIcon()}
          alt={`${symbol} icon`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className={cn(
            "animate-spin",
            size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
          )} />
        </div>
      )}
    </div>
  );
};

export default CryptoIcon;