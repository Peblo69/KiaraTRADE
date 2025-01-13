import { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";

export default function KiaraVideo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Set to last frame initially
      videoRef.current.currentTime = videoRef.current.duration || 0;
    }
  }, []);

  const handleVideoClick = () => {
    if (!videoRef.current) return;

    if (!isPlaying) {
      videoRef.current.currentTime = 0;
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((error) => console.error("Error playing video:", error));
    }
  };

  const handleVideoEnd = () => {
    if (!videoRef.current) return;
    setIsPlaying(false);
    videoRef.current.currentTime = videoRef.current.duration; // Stay on last frame
  };

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover cursor-pointer"
        src="https://files.catbox.moe/tq2h81.webm"
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