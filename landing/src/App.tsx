import { useState } from "react";
import { MotionConfig } from "framer-motion";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { MetricsBar } from "./components/MetricsBar";
import { ScrollyStory } from "./components/ScrollyStory";
import { InteractiveStudio } from "./components/InteractiveStudio";
import { BentoEcosystem } from "./components/BentoEcosystem";
import { CostAssistant } from "./components/CostAssistant";
import { PricingSection } from "./components/PricingSection";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";

export default function App() {
  const [paused, setPaused] = useState(false);
  return (
    <MotionConfig reducedMotion="never">
      <div className={paused ? "site motion-paused" : "site"}>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <Navbar />
        <main id="contenido">
          <Hero paused={paused} />
          <MetricsBar />
          <ScrollyStory paused={paused} />
          <InteractiveStudio />
          <BentoEcosystem />
          <CostAssistant />
          <PricingSection />
          <FaqSection />
        </main>
        <Footer paused={paused} onToggleMotion={() => setPaused(!paused)} />
      </div>
    </MotionConfig>
  );
}
