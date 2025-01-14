import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { useLocation } from 'wouter';

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm"
};

export default function KiaraVideoWrapper() {
  const [isInteractiveVideo, setIsInteractiveVideo] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [location] = useLocation();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if this is the first load on the home page
    const isFirstLoad = location === '/home' && !hasAutoPlayed;

    // Configure video based on type and auto-play status
    if (!isInteractiveVideo) {
      video.loop = true;
      video.autoplay = true;
      video.muted = true; // Required for autoplay
      video.play().catch(error => console.error("Error autoplaying video:", error));
    } else if (isFirstLoad) {
      // Auto-play the interactive video once when first loaded
      video.src = VIDEOS.INTERACTIVE;
      video.loop = false;
      video.muted = false;
      video.currentTime = 0;
      video.play()
        .then(() => setHasAutoPlayed(true))
        .catch(error => console.error("Error autoplaying interactive video:", error));
      setIsInteractiveVideo(true);
    }

    return () => {
      video.pause();
    };
  }, [location]); // Run when location changes

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isInteractiveVideo) {
      // Switch to interactive video
      video.src = VIDEOS.INTERACTIVE;
      video.muted = false;
      video.loop = false;
      video.currentTime = 0;
      video.play();
      setIsInteractiveVideo(true);
    }
  };

  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (!video) return;

    // Switch back to default video
    video.src = VIDEOS.DEFAULT;
    video.muted = true;
    video.loop = true;
    video.play();
    setIsInteractiveVideo(false);
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        src={VIDEOS.DEFAULT}
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      >
        Your browser does not support the video tag.
      </video>
    </Card>
  );
}