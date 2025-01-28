import React from 'react';
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useLocation } from "wouter";

// Import components
import { NewCreations } from './components/NewCreations';
import { AboutToGraduate } from './components/AboutToGraduate';
import { Graduated } from './components/Graduated';
import { SpaceBackground } from './components/SpaceBackground';
import NotFound from "@/pages/not-found";
import { queryClient } from "./lib/queryClient";

function Router() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <SpaceBackground />

      <main className="container mx-auto p-4 pt-6">
        <div className="grid grid-cols-1 gap-6">
          <NewCreations />
          <AboutToGraduate />
          <Graduated />
        </div>
      </main>

      <Switch>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;