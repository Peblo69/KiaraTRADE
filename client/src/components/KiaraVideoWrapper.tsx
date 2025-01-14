import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

const VIDEOS = {
  DEFAULT: "https://files.catbox.moe/3jiom4.webm",
  INTERACTIVE: "https://files.catbox.moe/tq2h81.webm"
};

export default function KiaraVideoWrapper() {
  const [isInteractiveVideo, setIsInteractiveVideo] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initializeVideo = async () => {
      try {
        // Set initial properties
        video.src = VIDEOS.DEFAULT;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;

        // Attempt to play
        await video.play();
      } catch (error) {
        console.error("Error initializing video:", error);
      }
    };

    initializeVideo();

    // Cleanup function
    return () => {
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, []); // Only run once on mount

  const handleVideoClick = async () => {
    const video = videoRef.current;
    if (!video || isTransitioning) return;

    if (!isInteractiveVideo) {
      try {
        setIsTransitioning(true);
        video.pause();

        // Switch to interactive video
        video.src = VIDEOS.INTERACTIVE;
        video.muted = false;
        video.loop = false;
        video.currentTime = 0;

        await video.play();
        setIsInteractiveVideo(true);
      } catch (error) {
        console.error("Error playing interactive video:", error);
        // Fallback to default video
        try {
          video.src = VIDEOS.DEFAULT;
          video.muted = true;
          video.loop = true;
          await video.play();
        } catch (fallbackError) {
          console.error("Error playing fallback video:", fallbackError);
        }
      } finally {
        setIsTransitioning(false);
      }
    }
  };

  const handleVideoEnd = async () => {
    const video = videoRef.current;
    if (!video || isTransitioning) return;

    try {
      setIsTransitioning(true);
      video.pause();

      // Switch back to default video
      video.src = VIDEOS.DEFAULT;
      video.muted = true;
      video.loop = true;
      video.currentTime = 0;

      await video.play();
      setIsInteractiveVideo(false);
    } catch (error) {
      console.error("Error returning to default video:", error);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        muted
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
      >
        Your browser does not support the video tag.
      </video>
    </Card>
  );
}