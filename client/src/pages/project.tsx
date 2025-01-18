import { FC } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";

const ProjectPage: FC = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <h1 
              className="text-4xl md:text-6xl font-bold text-center mb-8"
              style={{
                fontFamily: '"VT323", monospace',
                background: 'linear-gradient(to right, #00ff87 0%, #60efff 50%, #0061ff 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 30px rgba(96, 239, 255, 0.4)',
                letterSpacing: '0.15em',
                filter: 'drop-shadow(0 0 10px rgba(96, 239, 255, 0.2))'
              }}
            >
              Project Page
            </h1>
            {/* Token tracker removed */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectPage;