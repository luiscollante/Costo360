import { MotionConfig } from "framer-motion";
import { Navbar } from "./components/Navbar";
import { ProductTour } from "./components/ProductTour";
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
          <ScrollyStory />
          <InteractiveStudio />
          <BentoEcosystem />
          <CostAssistant />
          <PricingSection />
          <FaqSection />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
