import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import KiaraStageI from "@/pages/kiara-stage-i";
import AboutUs from "@/pages/about";
import { WalletContextProvider } from "@/lib/wallet";
import Landing from "@/pages/landing"; // Import the new Landing page component


function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} /> {/* Route to the Landing page */}
      <Route path="/home" component={Home} /> {/* Route to the Home page */}
      <Route path="/kiara-stage-i" component={KiaraStageI} />
      <Route path="/about" component={AboutUs} />
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