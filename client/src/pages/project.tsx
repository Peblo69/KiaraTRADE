import { FC } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";
import { TokenTracker } from "@/components/TokenTracker";

const ProjectPage: FC = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackgroundEnhanced />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <TokenTracker />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectPage;
