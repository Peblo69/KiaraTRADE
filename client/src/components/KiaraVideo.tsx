import { useState, useRef } from 'react';

export default function KiaraVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (!isPlaying) {
        videoRef.current.currentTime = 0; // Reset to start
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0; // Reset to first frame
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden backdrop-blur-sm bg-purple-900/10 border border-purple-500/20">
      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer"
        src="https://files.catbox.moe/tq2h81.webm"
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      >
        Your browser does not support the video tag.
      </video>
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="text-purple-300 text-sm">Click to interact with KIARA</span>
        </div>
      )}
    </div>
  );
}
