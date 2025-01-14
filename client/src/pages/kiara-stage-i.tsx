import { FC, useRef, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";

const KiaraStageI: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Set video to first frame when it loads
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, []);

  const handleVideoClick = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      // Reset to start if ended
      if (videoRef.current.ended) {
        videoRef.current.currentTime = 0;
      }
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="col-span-1">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg shadow-2xl cursor-pointer"
                  loop={false}
                  playsInline
                  src="https://files.catbox.moe/ligfio.webm"
                  onClick={handleVideoClick}
                  onEnded={handleVideoEnd}
                />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none rounded-b-lg" />
              </div>
            </div>
            <div className="col-span-1">
              {/* Content for the right side will be added here */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default KiaraStageI;