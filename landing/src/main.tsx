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
// Production reçoit le même arbre déjà rendu au build; aucune API ni serveur SSR.
if (root.hasChildNodes() && root.querySelector("main")) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
import "./process-film.css";
