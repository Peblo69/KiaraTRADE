import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm",
};

export default function KiaraVideoWrapper() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;

    const video = videoRef.current;
    if (!video) return;

    // Play interactive video once on mount with muted audio
    playInteractiveVideo();
  }, []);

  const playInteractiveVideo = () => {
    const video = videoRef.current;
    if (!video || isPlaying) return;

    setIsPlaying(true);
    video.src = VIDEOS.INTERACTIVE;
    video.muted = true; // Ensure video is muted
    video.loop = false;
    video.play().catch(console.error);
  };

  const playLoopingVideo = () => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    setIsPlaying(false);
    video.src = VIDEOS.DEFAULT;
    video.muted = true; // Ensure video is muted
    video.loop = true;
    video.play().catch(console.error);
  };

  const handleVideoEnd = () => {
    if (videoRef.current?.src.includes(VIDEOS.INTERACTIVE)) {
      playLoopingVideo();
    }
  };

  const handleVideoClick = () => {
    if (!isPlaying) {
      playInteractiveVideo();
    }
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        muted // Always muted by default
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      />
    </Card>
  );
}