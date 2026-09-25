import { initBotId } from "botid/client/core";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./pricing.css";

// Protección contra robots de Vercel (BotID) en las rutas del chat.
initBotId({ protect: [{ path: "/api/atencion/chat", method: "POST" }, { path: "/api/atencion/lead", method: "POST" }] });

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
import "./experience.css";
import "./support-chat.css";
import "./atelier.css";
