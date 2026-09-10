import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { SITE_URL } from "./src/lib/content";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "public-site-url",
      transformIndexHtml: (html) =>
        html.replaceAll("__PUBLIC_SITE_URL__", SITE_URL),
    },
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 3000 },
});
