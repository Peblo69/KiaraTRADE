import { FC, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const Landing: FC = () => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    setLocation('/home');
  };

  useEffect(() => {
    // Show logo after 2 seconds
    const logoTimer = setTimeout(() => {
      setShowLogo(true);
    }, 2000);

    // Show continue button after 4 seconds
    const buttonTimer = setTimeout(() => {
      setShowButton(true);
    }, 4000);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(buttonTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Video container with fade effect */}
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent z-10"></div>
        <video
          className="w-full h-full object-cover"
          src="https://files.catbox.moe/y3zjtd.mp4"
          autoPlay
          playsInline
          loop
          onEnded={() => setVideoEnded(true)}
          style={{ pointerEvents: 'none' }}
        />
      </div>

      <div className="relative z-10 text-center space-y-8">
        <div 
          className={`transition-all duration-1000 ${
            showLogo ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-4'
          }`}
        >
          <h1 
            className="text-8xl font-bold mb-12"
            style={{
              fontFamily: '"Orbitron", sans-serif',
              background: 'linear-gradient(to right, #00ff87 0%, #60efff 50%, #0061ff 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 20px rgba(96, 239, 255, 0.6)',
              letterSpacing: '0.15em',
              filter: 'drop-shadow(0 0 10px rgba(96, 239, 255, 0.4))',
            }}
          >
            KIARA_AI
          </h1>
          <div className="flex justify-center gap-2 text-cyan-400 text-xs">
            <span className="px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/20">[QUANTUM]</span>
            <span className="px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/20">[NEURAL]</span>
            <span className="px-2 py-1 rounded bg-cyan-950/40 border border-cyan-500/20">[v2.0]</span>
          </div>
        </div>

        <div 
          className={`transition-all duration-1000 ${
            showButton ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
          }`}
        >
          <Button
            onClick={handleContinue}
            className="px-8 py-6 text-xl bg-transparent backdrop-blur-sm border-2 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all duration-300"
            style={{
              fontFamily: '"Orbitron", sans-serif',
              textShadow: '0 0 10px rgba(96, 239, 255, 0.6)',
              boxShadow: '0 0 20px rgba(96, 239, 255, 0.2)',
            }}
          >
            Initialize System
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;