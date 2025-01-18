import { FC, useState, useEffect } from "react";
import { getTokenImage } from "@/lib/token-metadata";
import { cn } from "@/lib/utils";

interface CryptoIconProps {
  symbol: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const CryptoIcon: FC<CryptoIconProps> = ({ 
  symbol, 
  className,
  size = "md" 
}) => {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const generateFallbackIcon = () => {
    const symbol1 = symbol.replace('-USDT', '').charAt(0).toUpperCase();
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const hue = (symbol1.charCodeAt(0) * 137.508) % 360;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol1, size/2, size/2);
      return canvas.toDataURL();
    }
    return '';
  };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(false);

    const loadImage = async () => {
      try {
        const base64Image = await getTokenImage(symbol);

        if (!mounted) return;

        if (!base64Image) {
          const fallbackIcon = generateFallbackIcon();
          setImgSrc(fallbackIcon);
          setError(true);
          setIsLoading(false);
          return;
        }

        // Create a new image to test loading
        const img = new Image();
        img.onload = () => {
          if (mounted) {
            setImgSrc(base64Image);
            setIsLoading(false);
            setError(false);
          }
        };

        img.onerror = () => {
          if (mounted) {
            const fallbackIcon = generateFallbackIcon();
            setImgSrc(fallbackIcon);
            setError(true);
            setIsLoading(false);
          }
        };

        img.src = base64Image;
      } catch (err) {
        console.error(`Error loading icon for ${symbol}:`, err);
        if (mounted) {
          const fallbackIcon = generateFallbackIcon();
          setImgSrc(fallbackIcon);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [symbol]);

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
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!error) {
            const fallbackIcon = generateFallbackIcon();
            target.src = fallbackIcon;
            setError(true);
          }
        }}
      />
    </div>
  );
};

export default CryptoIcon;