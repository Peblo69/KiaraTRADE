import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import KiaraStageI from "@/pages/kiara-stage-i";
import WalletContextProvider from "@/lib/wallet";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={Home} />
      <Route path="/kiara-stage-i" component={KiaraStageI} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContextProvider>
        <Router />
        <Toaster />
      </WalletContextProvider>
    </QueryClientProvider>
  );
}

export default App;