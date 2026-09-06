import { useEffect } from 'react';
import Lenis from 'lenis';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MetricsBar } from './components/MetricsBar';
import { ScrollyStory } from './components/ScrollyStory';
import { InteractiveStudio } from './components/InteractiveStudio';
import { BentoEcosystem } from './components/BentoEcosystem';
import { RoiCalculator } from './components/RoiCalculator';
import { PricingSection } from './components/PricingSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';

export default function App() {
  // Inicialización de Lenis Smooth Scrolling para desplazamiento cinemático
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5E8D2] text-[#4A4A4A] relative selection:bg-[#15612E] selection:text-white">
      {/* Barra de Navegación Flotante */}
      <Navbar />

      <main>
        {/* 1. Hero con Visor de Losa Mineral 3D Interactivo */}
        <Hero />

        {/* 2. Cifras de Validación y Confianza */}
        <MetricsBar />

        {/* 3. El Viaje del Taller (Narrativa del dolor y solución) */}
        <ScrollyStory />

        {/* 4. Simulador Táctil en Tiempo Real */}
        <InteractiveStudio />

        {/* 5. Ecosistema Bento Grid de Módulos */}
        <BentoEcosystem />

        {/* 6. Calculadora de Retorno de Inversión (ROI) */}
        <RoiCalculator />

        {/* 7. Tabla de Planes y Precios Transparentes */}
        <PricingSection />

        {/* 8. Preguntas Frecuentes */}
        <FaqSection />
      </main>

      {/* 9. Pie de Página Institucional */}
      <Footer />
    </div>
  );
}
