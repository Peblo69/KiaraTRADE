import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

export default function KiaraVideoWrapper() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      if (video.duration) {
        video.currentTime = video.duration;
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.pause();
    };
  }, []);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isPlaying) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(error => console.error("Error playing video:", error));
      }
    }
  };

  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsPlaying(false);
    video.currentTime = video.duration;
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        src="https://files.catbox.moe/tq2h81.webm"
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      >
        Your browser does not support the video tag.
      </video>
    </Card>
  );
}
