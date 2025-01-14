import { FC } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import AiChat from "@/components/AiChat";
import KiaraVideoWrapper from "@/components/KiaraVideoWrapper";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const Home: FC = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="h-[600px]">
              <KiaraVideoWrapper />
            </div>
            <div className="h-[600px] chat-window-container">
              <div className="retro-chat-overlay absolute inset-0 pointer-events-none"></div>
              <AiChat />
            </div>
          </div>
        </main>
        <ThemeSwitcher className="fixed bottom-4 right-4" />
      </div>
    </div>
  );
};

export default Home;