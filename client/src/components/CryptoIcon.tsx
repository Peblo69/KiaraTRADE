import { FC, useState, useEffect } from "react";
import { getCryptoIconUrl } from "@/lib/token-metadata";
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
  const [imgSrc, setImgSrc] = useState<string>(getCryptoIconUrl(symbol));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  useEffect(() => {
    setIsLoading(true);
    setError(false);
    setImgSrc(getCryptoIconUrl(symbol));
  }, [symbol]);

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    // Use a simple colored circle as final fallback
    const symbol1 = symbol.charAt(0).toUpperCase();
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = `hsl(${symbol1.charCodeAt(0) * 137.508} 70% 50%)`;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol1, size/2, size/2);
      setImgSrc(canvas.toDataURL());
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
        onLoad={() => setIsLoading(false)}
        onError={handleError}
      />
    </div>
  );
};

export default CryptoIcon;
