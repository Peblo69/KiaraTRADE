import { FC, useRef, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";
import { TypeAnimation } from 'react-type-animation';

const KiaraStageI: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, []);

  const handleVideoClick = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
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
              <TypeAnimation
                sequence={[
                  'KIARA STAGE I',
                  500,
                  `KIARA STAGE I\n\nWho is Kiara? The AI That's Changing Crypto Forever\n\nKiara is not just another AI assistant—she is the first step toward a new era of intelligent crypto technology. Designed to be more than just a chatbot, Kiara is a dynamic, evolving AI that helps you navigate the chaotic world of trading, blockchain, and digital assets.\n\nShe is fast. She is smart. And she is about to make history.\n\nRight now, Kiara is in her first stage of development, offering real-time market insights, trading strategies, and deep crypto analysis. Whether you're a beginner trying to understand blockchain or a veteran trader looking for the next big move, Kiara is here to guide you.\n\nBut this is just the beginning.`,
                ]}
                wrapper="div"
                speed={7}
                style={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"VT323", monospace',
                  fontSize: '1.1rem',
                  lineHeight: '1.5',
                  textShadow: '0 0 10px rgba(168, 85, 247, 0.5)',
                  color: 'rgb(216, 180, 254)', 
                  backdropFilter: 'blur(4px)',
                  padding: '1rem'
                }}
                className="typing-text"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default KiaraStageI;