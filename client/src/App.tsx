import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import About from "@/pages/about";
import Project from "@/pages/project";
import KiaraStageI from "@/pages/kiara-stage-i";
import Subscriptions from "@/pages/subscriptions";
import SpaceBackgroundEnhanced from "@/components/SpaceBackgroundEnhanced";
import Register from "@/pages/auth/register";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/project" component={Project} />
      <Route path="/kiara-stage-i" component={KiaraStageI} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (!token) {
          return <div>Invalid verification link</div>;
        }
        return <div>Verifying your email...</div>;
      }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white relative">
        <SpaceBackgroundEnhanced />
        <Route path="/">
          {(match) => match ? null : <Layout />}
        </Route>
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
