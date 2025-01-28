import React from 'react';
import { Header } from './components/Header';
import { SpaceBackground } from './components/SpaceBackground';
import { NewCreations } from './components/NewCreations';
import { AboutToGraduate } from './components/AboutToGraduate';
import { Graduated } from './components/Graduated';

export default function App() {
  return (
    <div className="min-h-screen relative">
      <SpaceBackground />
      <div className="relative z-10">
        <Header />
        <main className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NewCreations />
            <AboutToGraduate />
            <Graduated />
          </div>
        </main>
      </div>
    </div>
  );
}