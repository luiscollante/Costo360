import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-brand-border/50 bg-brand-surface pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="Costo360 Logo" className="h-8 w-auto object-contain" />
              <span className="text-xl font-bold tracking-tight text-white">Costo360</span>
            </Link>
            <p className="text-brand-muted text-sm mb-6 leading-relaxed">
              El software de control de costos, presupuestos y cotizaciones diseñado para empresas del sector construcción.
            </p>
            <div className="flex items-center gap-4 text-brand-muted">
              <a href="#" className="hover:text-brand-gold transition-colors"><Globe size={20} /></a>
              <a href="#" className="hover:text-brand-gold transition-colors"><Globe size={20} /></a>
              <a href="#" className="hover:text-brand-gold transition-colors"><Globe size={20} /></a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-6">Producto</h3>
            <ul className="space-y-4">
              <li><a href="#features" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Características</a></li>
              <li><a href="#solucion" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Soluciones</a></li>
              <li><a href="#especificaciones" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Especificaciones</a></li>
              <li><Link to="/login" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Precios</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-6">Empresa</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Sobre Nosotros</a></li>
              <li><a href="#" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Blog</a></li>
              <li><a href="#" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Términos de Servicio</a></li>
              <li><a href="#" className="text-sm text-brand-muted hover:text-brand-gold transition-colors">Privacidad</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-6">Contacto</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-brand-muted">
                <Mail size={16} /> info@costo360.com
              </li>
              <li className="flex items-center gap-3 text-sm text-brand-muted">
                <Phone size={16} /> +57 300 000 0000
              </li>
              <li className="flex items-center gap-3 text-sm text-brand-muted">
                <MapPin size={16} /> Barranquilla, Colombia
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-brand-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-muted">
            &copy; {new Date().getFullYear()} Costo360. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <span className="text-xs text-brand-border px-2 py-1 bg-brand-bg rounded-md">Hecho con ❤️ en Colombia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
