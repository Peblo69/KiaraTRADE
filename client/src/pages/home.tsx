import { FC } from "react";
import SpaceBackground from "@/components/SpaceBackground";
import AiChat from "@/components/AiChat";
import KiaraVideoWrapper from "@/components/KiaraVideoWrapper";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Link } from "wouter";

const Home: FC = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackground />
      <div className="relative z-10">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <a className="text-xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                KIARA_AI
              </a>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/kiara-stage-i">
                <a className="text-gray-300 hover:text-white">Kiara Stage I</a>
              </Link>
              <Link href="/pumpfun-vision">
                <a className="text-gray-300 hover:text-white">PumpFun Vision</a>
              </Link>
              <Link href="/crypto-news">
                <a className="text-gray-300 hover:text-white">News</a>
              </Link>
              <Link href="/about">
                <a className="text-gray-300 hover:text-white">About</a>
              </Link>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="h-[600px]">
              <div className="relative w-[90%] mx-auto">
                <div className="video-container rounded-lg overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent z-10"></div>
                  <KiaraVideoWrapper key="main-video" />
                </div>
              </div>
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