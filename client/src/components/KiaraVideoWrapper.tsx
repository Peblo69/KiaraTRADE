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

    return () => {
      video.pause();
    };
  }, []); // Only run once on mount to set up initial video

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