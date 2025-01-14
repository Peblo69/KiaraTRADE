import { useEffect, useState } from "react";

interface ProgressBarProps {
  progress?: number;
  className?: string;
  label?: string;
}

export function ProgressBar({ progress = 70, className = "", label = "Progress" }: ProgressBarProps) {
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    // Animate progress on mount
    const timer = setTimeout(() => {
      setCurrentProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className={`relative w-full h-8 ${className}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm border border-purple-500/20 rounded-md overflow-hidden">
        <div
          className="h-full transition-all duration-1000 ease-out relative"
          style={{
            width: `${currentProgress}%`,
            background: `linear-gradient(90deg, 
              rgba(var(--theme-primary), 0.3) 0%, 
              rgba(var(--theme-primary), 0.6) 50%,
              rgba(var(--theme-primary), 0.3) 100%)`
          }}
        >
          {/* Animated shine effect */}
          <div
            className="absolute inset-0 animate-[progress-shine_2s_infinite]"
            style={{
              background: `linear-gradient(90deg, 
                transparent 0%, 
                rgba(var(--theme-primary), 0.4) 50%, 
                transparent 100%)`
            }}
          />
        </div>
        
        {/* Scanlines effect */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              rgba(var(--theme-primary), 0.05) 0px,
              rgba(var(--theme-primary), 0.05) 1px,
              transparent 1px,
              transparent 2px
            )`
          }}
        />
      </div>

      {/* Progress text */}
      <div className="absolute inset-0 flex justify-between items-center px-3 text-sm font-mono">
        <span className="text-white/80 drop-shadow-glow">{label}</span>
        <span className="text-white/80 drop-shadow-glow">{currentProgress}% Finished</span>
      </div>
    </div>
  );
}
