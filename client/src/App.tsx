import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { TokenTracker } from "@/components/TokenTracker";

function Router() {
  return (
    <Switch>
      {/* Make TokenTracker the main route */}
      <Route path="/" component={TokenTracker} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-900 text-white py-8">
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;