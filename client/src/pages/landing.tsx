import { FC, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const Landing: FC = () => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    setLocation('/home');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Video container with fade effect */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${videoEnded ? 'opacity-50' : 'opacity-100'}`}>
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent z-10"></div>
        <video
          className="w-full h-full object-cover"
          src="https://files.catbox.moe/y3zjtd.mp4"
          autoPlay
          playsInline
          muted
          onEnded={() => setVideoEnded(true)}
        />
      </div>

      <div className={`relative z-10 text-center transition-opacity duration-1000 ${videoEnded ? 'opacity-100' : 'opacity-0'}`}>
        <h1 
          className="text-8xl font-bold mb-12 animate-fade-in bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"
          style={{
            fontFamily: '"VT323", monospace',
            animation: 'textGlow 2s ease-in-out infinite',
            textShadow: '0 0 30px rgba(var(--theme-primary), 0.8)'
          }}
        >
          KIARA AI
        </h1>

        <Button
          onClick={handleContinue}
          className="px-8 py-6 text-xl bg-transparent backdrop-blur-sm border border-purple-500/20 hover:bg-purple-500/20 transition-all duration-300 animate-float"
          style={{
            boxShadow: '0 0 20px rgba(var(--theme-primary), 0.3)',
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Landing;