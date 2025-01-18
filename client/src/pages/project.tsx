import { FC } from "react";
import Navbar from "@/components/Navbar";
import DebugConsole from "@/components/DebugConsole";

const ProjectPage: FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
          PumpPortal Token Monitor
        </h1>
        <p className="text-gray-400 mt-4">
          Monitoring token creation events in real-time. Check the debug console for events.
        </p>
      </div>
      <DebugConsole />
    </div>
  );
};

export default ProjectPage;