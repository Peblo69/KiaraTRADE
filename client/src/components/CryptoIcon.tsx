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

    if (!ctx) return '';

    // Generate a unique color based on the symbol
    const hue = (symbol1.charCodeAt(0) * 137.508) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();

    // Add text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol1, size/2, size/2);

    return canvas.toDataURL();
  };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(false);

    async function loadImage() {
      try {
        const imageUrl = await getTokenImage(symbol);

        if (!mounted) return;

        if (!imageUrl) {
          setImgSrc(generateFallbackIcon());
          setError(true);
          setIsLoading(false);
          return;
        }

        setImgSrc(imageUrl);
        setIsLoading(false);
        setError(false);
      } catch (err) {
        console.error(`Error loading icon for ${symbol}:`, err);
        if (mounted) {
          setImgSrc(generateFallbackIcon());
          setError(true);
          setIsLoading(false);
        }
      }
    }

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
            target.src = generateFallbackIcon();
            setError(true);
          }
        }}
      />
    </div>
  );
};

export default CryptoIcon;