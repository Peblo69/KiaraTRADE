import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import KiaraStageI from "@/pages/kiara-stage-i";
import AboutUs from "@/pages/about";
import ProjectPage from "@/pages/project";
import SubscriptionsPage from "@/pages/subscriptions";
import { WalletContextProvider } from "@/lib/wallet";
import Landing from "@/pages/landing";
import { useLocation } from "wouter";
import { useEffect } from "react";

// Protected Route component to handle session authentication
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check session authentication
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
      // Redirect to landing if not authenticated
      setLocation('/');
    }
  }, [setLocation]);

  return sessionStorage.getItem('isAuthenticated') === 'true' ? <Component /> : null;
}

function Router() {
  return (
    <Switch>
      {/* Landing is accessible without auth */}
      <Route path="/" component={Landing} />

      {/* All other routes require session auth */}
      <Route path="/home">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/kiara-stage-i">
        <ProtectedRoute component={KiaraStageI} />
      </Route>
      <Route path="/about">
        <ProtectedRoute component={AboutUs} />
      </Route>
      <Route path="/project">
        <ProtectedRoute component={ProjectPage} />
      </Route>
      <Route path="/subscriptions">
        <ProtectedRoute component={SubscriptionsPage} />
      </Route>
      <Route>
        <ProtectedRoute component={NotFound} />
      </Route>
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