import { MotionConfig } from "framer-motion";
import { useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { ProductTour } from "./components/ProductTour";
import { Hero } from "./components/Hero";
import { MetricsBar } from "./components/MetricsBar";
import { InteractiveStudio } from "./components/InteractiveStudio";
import { BentoEcosystem } from "./components/BentoEcosystem";
import { CostAssistant } from "./components/CostAssistant";
import { PricingSection } from "./components/PricingSection";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { SupportChat } from "./components/SupportChat";

const mostrarChat =
  import.meta.env.VITE_SUPPORT_CHAT === "1" ||
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("chat") === "1");
import { CraftDetail } from "./components/CraftDetail";

export default function App() {
  useEffect(() => {
    // Vite renders after initial navigation, so restore deep links once the
    // sections exist. Production also benefits after the tour is enhanced.
    const id = window.location.hash.slice(1);
    if (!id) return;
    let cancelled = false;
    let timer = 0;
    // Font metrics and the initially expanded tour affect the anchor position.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      // A task, rather than an animation frame, also runs in background tabs.
      timer = window.setTimeout(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "instant", block: "start" });
      }, 0);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <MotionConfig reducedMotion="never">
      <div className="site">
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <Navbar />
        <main id="contenido">
          <Hero />
          <MetricsBar />
          <ProductTour />
          <CraftDetail />
          <InteractiveStudio />
          <BentoEcosystem />
          <CostAssistant />
          <PricingSection />
          <FaqSection />
        </main>
        <Footer />
        {/* Chat de atención: público con VITE_SUPPORT_CHAT=1; en modo sombra solo
            aparece entrando con ?chat=1 (prueba del fundador antes del lanzamiento). */}
        {mostrarChat && <SupportChat />}
      </div>
    </MotionConfig>
  );
}
