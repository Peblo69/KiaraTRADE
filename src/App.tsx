import React from 'react';
import { SpaceBackground } from './components/features/SpaceBackground';
import { KiaraVideo } from './components/features/KiaraVideo';
import { AiChat } from './components/features/AiChat';
import { TopBar } from './components/layout/TopBar';

function App() {
  return (
    <div className="min-h-screen bg-[#0B0B1E]">
      <SpaceBackground />
      <TopBar />
      <main>
        <div className="container mx-auto px-4 py-6">
          <KiaraVideo />
        </div>
      </main>
      <AiChat />
    </div>
  );
}

export default App;