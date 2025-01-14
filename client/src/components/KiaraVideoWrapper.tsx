import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
//import { useLocation } from 'wouter'; //removed as per edited code

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm"
};

export default function KiaraVideoWrapper() {
  const [isInteractiveVideo, setIsInteractiveVideo] = useState(false);
  //const [hasAutoPlayed, setHasAutoPlayed] = useState(false); //removed as per edited code
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  //const [location] = useLocation(); //removed as per edited code

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Always start with default video
    video.src = VIDEOS.DEFAULT;
    video.loop = true;
    video.autoplay = true;
    video.muted = true;
    video.play().catch(error => console.error("Error autoplaying video:", error));

    return () => {
      if (video) {
        video.pause();
      }
    };
  }, []); // Only run once on mount

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video || isTransitioning) return;

    if (!isInteractiveVideo) {
      setIsTransitioning(true);

      // Switch to interactive video
      video.pause();
      video.src = VIDEOS.INTERACTIVE;
      video.muted = false;
      video.loop = false;
      video.currentTime = 0;

      // Small delay to ensure proper video loading
      const transitionTimeout = setTimeout(() => {
        video.play()
          .then(() => {
            setIsInteractiveVideo(true);
            setIsTransitioning(false);
          })
          .catch(error => {
            console.error("Error playing interactive video:", error);
            setIsTransitioning(false);
            // Fallback to default video on error
            video.src = VIDEOS.DEFAULT;
            video.muted = true;
            video.loop = true;
            video.play().catch(e => console.error("Error playing fallback video:", e));
          });
      }, 100);

      // Clear transition state if timeout exceeds
      setTimeout(() => {
        clearTimeout(transitionTimeout);
        if (isTransitioning) {
          setIsTransitioning(false);
        }
      }, 3000);
    }
  };

  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (!video || isTransitioning) return;

    setIsTransitioning(true);
    // Switch back to default video
    video.pause();
    video.src = VIDEOS.DEFAULT;
    video.muted = true;
    video.loop = true;

    // Small delay to ensure proper video loading
    const transitionTimeout = setTimeout(() => {
      video.play()
        .then(() => {
          setIsInteractiveVideo(false);
          setIsTransitioning(false);
        })
        .catch(error => {
          console.error("Error switching to default video:", error);
          setIsTransitioning(false);
        });
    }, 100);

    // Clear transition state if timeout exceeds
    setTimeout(() => {
      clearTimeout(transitionTimeout);
      if (isTransitioning) {
        setIsTransitioning(false);
      }
    }, 3000);
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