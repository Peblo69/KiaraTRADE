import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from 'react-router-dom'; // Added import for BrowserRouter

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter> {/* Wrapped App with BrowserRouter */}
      <App />
    </BrowserRouter>
  </StrictMode>
);