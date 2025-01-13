import { FC } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";

const KiaraStageI: FC = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="col-span-1 relative">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <video
                  className="relative w-full rounded-lg shadow-2xl mix-blend-screen brightness-125 contrast-125"
                  autoPlay
                  loop
                  muted
                  playsInline
                  src="https://files.catbox.moe/ligfio.webm"
                />
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