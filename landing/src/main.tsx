import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
// Producción hidrata el HTML generado durante el build, sin APIs ni servidor SSR.
if (root.hasChildNodes() && root.querySelector("main")) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
import "./product-tour.css";
