import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import MetricsSection from '@/components/landing/MetricsSection';
import FeaturesBento from '@/components/landing/FeaturesBento';
import InteractiveDemo from '@/components/landing/InteractiveDemo';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <Navbar />
      <main>
        <Hero />
        <MetricsSection />
        <FeaturesBento />
        <InteractiveDemo />
      </main>
      <Footer />
    </div>
  );
}
