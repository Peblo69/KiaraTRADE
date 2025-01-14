import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm"
};

export default function KiaraVideoWrapper() {
  const [isInteractiveVideo, setIsInteractiveVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Configure video based on type
    if (!isInteractiveVideo) {
      video.loop = true;
      video.autoplay = true;
      video.muted = true; // Required for autoplay
      video.play().catch(error => console.error("Error autoplaying video:", error));
    } else {
      video.loop = false;
      video.muted = false; // Unmute for interactive video
    }

    // Handle video load
    const handleLoadedData = () => {
      if (!isInteractiveVideo) {
        video.play().catch(error => console.error("Error playing video:", error));
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.pause();
    };
  }, [isInteractiveVideo]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isInteractiveVideo) {
      // Switching to interactive video
      setIsInteractiveVideo(true);
      // Reset and play immediately
      video.currentTime = 0;
      video.muted = false;
      // Use a Promise to ensure proper sequence
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.error("Error playing video:", error));
      }
    }
  };

  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsInteractiveVideo(false);
    // Reset for auto-playing video
    video.muted = true;
    video.loop = true;
    video.play().catch(error => console.error("Error playing video:", error));
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        src={isInteractiveVideo ? VIDEOS.INTERACTIVE : VIDEOS.DEFAULT}
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      >
        Your browser does not support the video tag.
      </video>
    </Card>
  );
}