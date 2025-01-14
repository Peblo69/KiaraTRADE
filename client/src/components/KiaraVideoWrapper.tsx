import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm",
};

export default function KiaraVideoWrapper() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if we should play interactive video
    const shouldPlayInteractive = sessionStorage.getItem('shouldPlayInteractive') === 'true';

    if (shouldPlayInteractive && !hasPlayedOnce) {
      // Setup for interactive video
      video.src = VIDEOS.INTERACTIVE;
      video.muted = false;
      video.loop = false;
      setIsInteractive(true);

      video.play().catch(console.error);
      sessionStorage.removeItem('shouldPlayInteractive');
    } else {
      // Setup for default looping video
      video.src = VIDEOS.DEFAULT;
      video.muted = true;
      video.loop = true;
      setIsInteractive(false);

      video.play().catch(console.error);
    }

    // Cleanup function
    return () => {
      video.pause();
      video.src = '';
    };
  }, [hasPlayedOnce]);

  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (!video || !isInteractive) return;

    // Mark interactive video as played
    setHasPlayedOnce(true);
    setIsInteractive(false);

    // Switch to default looping video
    video.src = VIDEOS.DEFAULT;
    video.muted = true;
    video.loop = true;
    video.play().catch(console.error);
  };

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video || isInteractive) return;

    // Play interactive video once when clicked
    video.src = VIDEOS.INTERACTIVE;
    video.muted = false;
    video.loop = false;
    setIsInteractive(true);

    video.play().catch(console.error);
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      />
    </Card>
  );
}