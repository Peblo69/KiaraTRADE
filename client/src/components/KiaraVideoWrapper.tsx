import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

export default function KiaraVideoWrapper() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // Ensure video starts from the first frame
      video.currentTime = 0;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (video) {
        video.pause();
      }
    };
  }, []);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isPlaying) {
      video.currentTime = 0;
      video.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error("Error playing video:", error));
    }
  };

  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (!video) return;
    setIsPlaying(false);
    // Reset to first frame when video ends
    video.currentTime = 0;
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        src="https://files.catbox.moe/tq2h81.webm"
        playsInline
        onClick={handleVideoClick}
        onEnded={handleVideoEnd}
        muted={false} // Ensure audio is enabled
      >
        Your browser does not support the video tag.
      </video>
    </Card>
  );
}