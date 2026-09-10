import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Menu, X } from 'lucide-react';
import { BorderBeam } from './ui/BorderBeam';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 transition-all duration-300">
      <nav
        aria-label="Navegación principal"
        className={`max-w-7xl mx-auto rounded-full transition-all duration-300 ${
          scrolled
            ? 'glass-panel py-3 px-6 shadow-lg border-[rgba(212,175,55,0.3)] bg-white/80 backdrop-blur-xl'
            : 'bg-white/40 backdrop-blur-md py-4 px-6 border border-white/60'
        } flex items-center justify-between`}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group" aria-label="Costo360 Inicio">
          <img
            src="/logo_versiones_oscuras.png"
            alt="Costo360 Logotipo"
            className="h-8 md:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Fallback visual si la imagen tarda en resolver
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="font-extrabold text-xl tracking-tight text-[#1A1A1A] hidden sm:inline-block">
            Costo<span className="text-[#15612E]">360</span>
          </span>
        </a>

        {/* Enlaces de Navegación (Desktop) */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#4A4A4A]">
          <a href="#simulador" className="hover:text-[#15612E] transition-colors">
            Simulador
          </a>
          <a href="#modulos" className="hover:text-[#15612E] transition-colors">
            Módulos
          </a>
          <a href="#roi" className="hover:text-[#15612E] transition-colors">
            Ahorro ROI
          </a>
          <a href="#precios" className="hover:text-[#15612E] transition-colors">
            Planes
          </a>
          <a href="#faq" className="hover:text-[#15612E] transition-colors">
            Preguntas
          </a>
        </div>

        {/* Botón de Entrada a la Plataforma / Demostración */}
        <div className="flex items-center gap-3">
          <a
            href="https://costo360-web.vercel.app/login"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex text-sm font-semibold text-[#15612E] hover:text-[#00311D] px-4 py-2 rounded-full transition-colors"
          >
            Iniciar Sesión
          </a>

          <a
            href="#simulador"
            className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#15612E] hover:bg-[#1A7A3A] transition-all duration-300 shadow-md hover:shadow-xl hover:scale-[1.03] overflow-hidden group"
          >
            <BorderBeam size={40} duration={4} colorFrom="#D4AF37" colorTo="#F0C447" />
            <Sparkles size={14} className="text-[#F0C447]" />
            <span>Probar Gratis</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Menú Móvil Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#1A1A1A] hover:text-[#15612E] focus:outline-none"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Menú Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-7xl mx-auto glass-panel p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border border-[rgba(212,175,55,0.3)] bg-white/95">
          <a
            href="#simulador"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-[#1A1A1A] hover:text-[#15612E] py-2 border-b border-[#E5D5BA]/50"
          >
            Simulador de Cotización
          </a>
          <a
            href="#modulos"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-[#1A1A1A] hover:text-[#15612E] py-2 border-b border-[#E5D5BA]/50"
          >
            Ecosistema de Módulos
          </a>
          <a
            href="#roi"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-[#1A1A1A] hover:text-[#15612E] py-2 border-b border-[#E5D5BA]/50"
          >
            Calculadora de Ahorro
          </a>
          <a
            href="#precios"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-semibold text-[#1A1A1A] hover:text-[#15612E] py-2 border-b border-[#E5D5BA]/50"
          >
            Planes y Precios
          </a>
          <a
            href="https://costo360-web.vercel.app/login"
            className="text-base font-bold text-[#15612E] py-2"
          >
            Ir a la Plataforma &rarr;
          </a>
        </div>
      )}
    </header>
  );
}
