import { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";

export default function KiaraVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoClick = () => {
    if (!videoRef.current) return;

    if (!isPlaying) {
      videoRef.current.currentTime = 0;
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((error) => console.error("Error playing video:", error));
    }
  };

  const handleVideoEnd = () => {
    if (!videoRef.current) return;
    setIsPlaying(false);
    videoRef.current.currentTime = 0;
  };

  return (
    <Card className="relative w-full aspect-video rounded-lg overflow-hidden backdrop-blur-sm bg-purple-900/10 border border-purple-500/20">
      <video
        ref={videoRef}
        className="w-full h-full object-cover cursor-pointer"
        src="https://files.catbox.moe/tq2h81.webm"
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      >
        Your browser does not support the video tag.
      </video>
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="text-purple-300 text-lg font-semibold">Click to interact with KIARA</span>
        </div>
      )}
    </Card>
  );
}