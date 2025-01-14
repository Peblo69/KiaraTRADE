import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm",
};

export default function KiaraVideoWrapper() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start with interactive video if it's the first time
    if (sessionStorage.getItem('shouldPlayInteractive') === 'true') {
      playInteractiveVideo();
      sessionStorage.removeItem('shouldPlayInteractive');
    } else {
      playLoopingVideo();
    }
  }, []);

  const playInteractiveVideo = () => {
    const video = videoRef.current;
    if (!video || isPlaying) return;

    setIsPlaying(true);
    video.src = VIDEOS.INTERACTIVE;
    video.muted = false;
    video.loop = false;
    video.play().catch(console.error);
  };

  const playLoopingVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsPlaying(false);
    video.src = VIDEOS.DEFAULT;
    video.muted = true;
    video.loop = true;
    video.play().catch(console.error);
  };

  const handleVideoEnd = () => {
    playLoopingVideo();
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
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      />
    </Card>
  );
}