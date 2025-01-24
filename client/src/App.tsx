import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/landing';
import Home from './pages/home';
import PumpFunVision from './pages/pumpfun-vision';
import NotFound from './pages/not-found';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/pump-vision" element={<PumpFunVision />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}