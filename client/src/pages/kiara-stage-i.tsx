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
          {/* Content will be added here */}
        </main>
      </div>
    </div>
  );
};

export default KiaraStageI;
