import React from 'react';
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useLocation } from "wouter";

// Import components
import { NewCreations } from './components/NewCreations';
import { AboutToGraduate } from './components/AboutToGraduate';
import { Graduated } from './components/Graduated';
import { Header } from './components/Header';
import { SpaceBackground } from './components/SpaceBackground';
import NotFound from "@/pages/not-found";
import { queryClient } from "./lib/queryClient";

function Router() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen">
      <SpaceBackground />
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <NewCreations />
          </div>
          <div className="col-span-1">
            <AboutToGraduate />
          </div>
          <div className="col-span-1">
            <Graduated />
          </div>
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