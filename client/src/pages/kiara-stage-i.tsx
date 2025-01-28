import React, { FC, useRef, useState, useEffect } from 'react';
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";
import { useTypewriter } from "@/hooks/useTypewriter";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FuturisticText } from "@/components/FuturisticText";

const TITLE = "KIARA STAGE I";
const CONTENT = `
Who is Kiara? The AI That's Changing Crypto Forever

Kiara is not just another AI assistant—she is the first step toward a new era of intelligent crypto technology. Designed to be more than just a chatbot, Kiara is a dynamic, evolving AI that helps you navigate the chaotic world of trading, blockchain, and digital assets.

She is fast. She is smart. And she is about to make history.

Right now, Kiara is in her first stage of development, offering real-time market insights, trading strategies, and deep crypto analysis. Whether you're a beginner trying to understand blockchain or a veteran trader looking for the next big move, Kiara is here to guide you.

But this is just the beginning.`;

const ROLE_CONTENT = `Kiara's Role Today – Your AI Crypto Assistant

At her current stage, Kiara is your personal AI-powered market guide, helping you make smarter moves in the crypto space. She can:

✔️ Analyze Tokens & Projects – Get instant insights on any crypto asset.
✔️ Provide Market Trends & Trading Strategies – Stay ahead of pumps, trends, and risk factors.
✔️ Help You Learn Crypto Faster – No need for endless Google searches—Kiara explains everything.
✔️ Detect Scams & Risks – She warns you before you fall for a rug pull.
✔️ Adapt to Your Trading Style – Over time, she refines her recommendations based on how you trade.

Kiara is here to help you win in the crypto space—by being faster, smarter, and more informed than anyone else.`;

const KiaraStageI: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { displayText, isComplete } = useTypewriter({
    text: CONTENT,
    typingSpeed: 20,
  });

  const { displayText: roleDisplayText, isComplete: roleIsComplete } = useTypewriter({
    text: ROLE_CONTENT,
    typingSpeed: 20,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.loop = false;
    video.addEventListener('ended', () => {
      video.currentTime = video.duration;
    });

    video.play().catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <div className="relative z-10">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto mb-8">
            <ProgressBar 
              progress={70} 
              label="Stage I Progress" 
              className="mb-12"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="col-span-1">
              <div className="relative w-[90%] mx-auto">
                <div className="video-container rounded-lg overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent z-10"></div>
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent z-10"></div>
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg shadow-2xl relative z-0 animate-float"
                    src="https://files.catbox.moe/ligfio.webm"
                    playsInline
                    style={{
                      animation: 'float 6s ease-in-out infinite',
                      boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <FuturisticText
                variant="h1"
                glitch
                gradient
                glow
                className="text-5xl md:text-7xl font-bold mb-12"
              >
                {TITLE}
              </FuturisticText>
              <FuturisticText
                variant="p"
                reveal
                parallax
                className="text-cyber-purple text-lg"
              >
                {displayText}
              </FuturisticText>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto mt-12">
            <div className="col-span-1">
              <img
                src="https://files.catbox.moe/jqrz4d.png"
                alt="Kiara AI Assistant"
                className="w-full rounded-lg shadow-2xl"
                style={{
                  maxWidth: '90%',
                  margin: '0 auto',
                  filter: 'drop-shadow(0 0 20px rgba(var(--theme-primary), 0.3))'
                }}
              />
            </div>
            <div className="col-span-1">
              <FuturisticText
                variant="div"
                reveal
                glow
                className="text-cyber-blue bg-opacity-5 backdrop-blur-sm rounded-lg p-4 border border-cyber-blue border-opacity-20"
              >
                <FuturisticText
                  variant="h2"
                  gradient
                  className="text-2xl font-semibold mb-4"
                >
                  Kiara's Role Today – Your AI Crypto Assistant
                </FuturisticText>
                {roleDisplayText.substring(roleDisplayText.indexOf('\n') + 1)}
              </FuturisticText>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default KiaraStageI;