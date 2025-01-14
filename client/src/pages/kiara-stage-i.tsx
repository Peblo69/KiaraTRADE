import { FC, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";
import { useTypewriter } from "@/hooks/useTypewriter";

const TITLE = "KIARA STAGE I";
const CONTENT = `
Who is Kiara? The AI That's Changing Crypto Forever

Kiara is not just another AI assistant—she is the first step toward a new era of intelligent crypto technology. Designed to be more than just a chatbot, Kiara is a dynamic, evolving AI that helps you navigate the chaotic world of trading, blockchain, and digital assets.

She is fast. She is smart. And she is about to make history.

Right now, Kiara is in her first stage of development, offering real-time market insights, trading strategies, and deep crypto analysis. Whether you're a beginner trying to understand blockchain or a veteran trader looking for the next big move, Kiara is here to guide you.

But this is just the beginning.`;

const KiaraStageI: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { displayText, isComplete } = useTypewriter({
    text: CONTENT,
    typingSpeed: 20,
  });

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="col-span-1">
              <div className="relative w-[90%] mx-auto">
                <div className="video-container rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg shadow-2xl cursor-pointer relative z-10"
                    loop={false}
                    playsInline
                    src="https://files.catbox.moe/ligfio.webm"
                    onClick={handleVideoClick}
                    onEnded={handleVideoEnd}
                  />
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <h1 
                className="text-5xl md:text-7xl font-bold mb-12 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-glitch"
                style={{
                  fontFamily: '"VT323", monospace',
                  letterSpacing: '0.05em',
                  fontWeight: '800',
                  textShadow: '0 0 30px rgba(var(--theme-primary), 0.8)'
                }}
              >
                {TITLE}
              </h1>
              <div
                style={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: '"VT323", monospace',
                  fontSize: '1.1rem',
                  lineHeight: '1.5',
                  textShadow: '0 0 10px rgba(var(--theme-primary), 0.5)',
                  color: 'rgb(216, 180, 254)',
                  backdropFilter: 'blur(4px)',
                  padding: '1rem',
                  opacity: isComplete ? 1 : 0.9,
                  transition: 'opacity 0.3s ease-in-out'
                }}
                className="typing-text"
              >
                {displayText}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default KiaraStageI;