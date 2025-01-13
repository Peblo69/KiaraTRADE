import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

export default function KiaraVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Add error handling
    const handleError = (e: ErrorEvent) => {
      console.error("Video error:", e);
      setIsPlaying(false);
    };

    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('error', handleError);
      if (video) {
        video.pause();
      }
    };
  }, []);

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
    videoRef.current.currentTime = videoRef.current.duration || 0; // Stay on last frame
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover cursor-pointer"
        src="https://files.catbox.moe/tq2h81.webm"
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
        onLoadedMetadata={(e) => {
          if (videoRef.current) {
            videoRef.current.currentTime = videoRef.current.duration || 0;
          }
        }}
      >
        Your browser does not support the video tag.
      </video>
    </Card>
  );
}