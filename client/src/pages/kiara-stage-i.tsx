import { FC } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";

const KiaraStageI: FC = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="col-span-1">
              <video
                className="w-full rounded-lg shadow-2xl"
                autoPlay
                loop
                muted
                playsInline
                src="https://files.catbox.moe/ligfio.webm"
              />
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