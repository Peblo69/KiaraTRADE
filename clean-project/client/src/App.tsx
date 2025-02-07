import React from 'react';
import { Toaster } from "./components/ui/toaster";
import { TradingProvider } from './context/TradingContext';
import PumpFunVision from './pages/pumpfun-vision';


function App() {
  return (
    <TradingProvider>
      <div>
          <PumpFunVision />
          <Toaster/>
      </div>
    </TradingProvider>
  );
}

export default App;