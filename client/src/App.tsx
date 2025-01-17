import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { TokenTracker } from "@/components/TokenTracker";
import { WalletContextProvider } from "@/lib/wallet";

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
      <WalletContextProvider>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
          <Router />
          <Toaster />
        </div>
      </WalletContextProvider>
    </QueryClientProvider>
  );
}

export default App;