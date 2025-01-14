import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm"
};

export default function KiaraVideoWrapper() {
  const [isInteractiveVideo, setIsInteractiveVideo] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const shouldPlayInteractive = sessionStorage.getItem('shouldPlayInteractive') === 'true';

    const handleCanPlay = () => {
      setIsVideoReady(true);
      if (shouldPlayInteractive) {
        video.play()
          .then(() => {
            sessionStorage.removeItem('shouldPlayInteractive');
          })
          .catch(console.error);
      }
    };

    const initializeVideo = () => {
      if (shouldPlayInteractive) {
        video.src = VIDEOS.INTERACTIVE;
        video.loop = false;
        video.muted = false;
        setIsInteractiveVideo(true);
      } else {
        video.src = VIDEOS.DEFAULT;
        video.loop = true;
        video.muted = true;
        setIsInteractiveVideo(false);
      }
      video.playsInline = true;
    };

    video.addEventListener('canplay', handleCanPlay);
    initializeVideo();

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, []);

  const switchToVideo = async (interactive: boolean) => {
    const video = videoRef.current;
    if (!video || isTransitioning) return;

    try {
      setIsTransitioning(true);
      await video.pause();

      video.src = interactive ? VIDEOS.INTERACTIVE : VIDEOS.DEFAULT;
      video.muted = !interactive;
      video.loop = !interactive;
      setIsInteractiveVideo(interactive);

      await video.load();
      await video.play();
    } catch (error) {
      console.error(`Error switching to ${interactive ? 'interactive' : 'default'} video:`, error);
      // If interactive video fails, fallback to default
      if (interactive) {
        await switchToVideo(false);
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleVideoClick = () => {
    if (!isInteractiveVideo) {
      switchToVideo(true);
    }
  };

  const handleVideoEnd = () => {
    if (isInteractiveVideo) {
      switchToVideo(false);
    }
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
      <video
        ref={videoRef}
        className={`w-full h-full object-contain cursor-pointer ${!isVideoReady ? 'invisible' : ''}`}
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      />
    </Card>
  );
}