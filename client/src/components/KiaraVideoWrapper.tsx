import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm",
};

export default function KiaraVideoWrapper() {
  const [isInteractiveVideo, setIsInteractiveVideo] = useState(false);
  const [hasPlayedInteractive, setHasPlayedInteractive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if we should play interactive video automatically
    const shouldPlayInteractive = sessionStorage.getItem("shouldPlayInteractive") === "true";

    const handleCanPlay = () => {
      setIsVideoReady(true);
      if (shouldPlayInteractive && !hasPlayedInteractive) {
        setIsInteractiveVideo(true);
        video.muted = false;
        video.loop = false;
        video.src = VIDEOS.INTERACTIVE;
        video.play().catch(console.error);
        sessionStorage.removeItem("shouldPlayInteractive");
      }
    };

    const initializeVideo = () => {
      if (shouldPlayInteractive && !hasPlayedInteractive) {
        video.src = VIDEOS.INTERACTIVE;
        video.muted = false;
        video.loop = false;
        setIsInteractiveVideo(true);
      } else {
        video.src = VIDEOS.DEFAULT;
        video.muted = true;
        video.loop = true;
        setIsInteractiveVideo(false);
      }
      video.playsInline = true;
    };

    video.addEventListener("canplay", handleCanPlay);
    initializeVideo();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [hasPlayedInteractive]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video || isInteractiveVideo) return;

    // Only allow playing interactive video once per click
    setIsInteractiveVideo(true);
    video.src = VIDEOS.INTERACTIVE;
    video.muted = false;
    video.loop = false;
    video.play().catch(console.error);
  };

  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (!video || !isInteractiveVideo) return;

    // Switch back to default video after interactive ends
    setHasPlayedInteractive(true);
    setIsInteractiveVideo(false);
    video.src = VIDEOS.DEFAULT;
    video.muted = true;
    video.loop = true;
    video.play().catch(console.error);
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
      <video
        ref={videoRef}
        className={`w-full h-full object-contain cursor-pointer ${!isVideoReady ? "invisible" : ""}`}
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      />
    </Card>
  );
}