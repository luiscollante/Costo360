import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-4 glass shadow-sm' : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="Costo360 Logo" className="h-8 w-auto object-contain group-hover:scale-105 transition-transform duration-300" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-brand-text hover:text-brand-primary transition-colors">Características</a>
          <a href="#simulator" className="text-sm font-medium text-brand-text hover:text-brand-primary transition-colors">Simulador</a>
          <a href="#metrics" className="text-sm font-medium text-brand-text hover:text-brand-primary transition-colors">Impacto</a>
          <a href="#benefits" className="text-sm font-medium text-brand-text hover:text-brand-primary transition-colors">Beneficios</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/login"
            className="px-6 py-2.5 rounded-full bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary-light transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Solicitar Demostración
          </Link>
        </div>

        <button
          className="md:hidden text-brand-text-dark"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass border-t border-brand-border/30 px-6 py-4 flex flex-col gap-4">
          <a href="#features" className="text-brand-text-dark font-medium py-2">Características</a>
          <a href="#simulator" className="text-brand-text-dark font-medium py-2">Simulador</a>
          <a href="#metrics" className="text-brand-text-dark font-medium py-2">Impacto</a>
          <a href="#benefits" className="text-brand-text-dark font-medium py-2">Beneficios</a>
          <Link to="/login" className="px-6 py-3 rounded-full bg-brand-primary text-white text-center font-medium shadow-md">
            Solicitar Demostración
          </Link>
        </div>
      )}
    </nav>
  );
}
