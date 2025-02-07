import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";

// Import the only page we need
import Project from "@/pages/project";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Project />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;