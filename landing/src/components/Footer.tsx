import { Shield, Sparkles, Phone, Mail, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="glass-emerald-dark text-white pt-16 pb-12 border-t border-[#D4AF37]/30 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 pb-12 border-b border-white/10">
          
          {/* Col 1: Marca & Misión */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo.png"
                alt="Costo360 Logotipo"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="font-extrabold text-xl tracking-tight text-white">
                Costo<span className="text-[#F0C447]">360</span>
              </span>
            </div>
            <p className="text-xs text-[#E8F0EB] leading-relaxed mb-4">
              El software de cotización, cálculo de mermas y optimización 2D (Nesting) creado para transformar la rentabilidad de las marmolerías en Colombia.
            </p>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#F5E8D2] bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <Shield size={12} className="text-[#F0C447]" />
              <span>Desarrollado en Colombia</span>
            </div>
          </div>

          {/* Col 2: Plataforma */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F5E8D2] mb-4">
              Plataforma
            </p>
            <ul className="space-y-2 text-xs text-[#E8F0EB]">
              <li><a href="#simulador" className="hover:text-white transition-colors">Simulador en Vivo</a></li>
              <li><a href="#modulos" className="hover:text-white transition-colors">Nesting 2D y Despiece</a></li>
              <li><a href="#modulos" className="hover:text-white transition-colors">Banco de Retales</a></li>
              <li><a href="#modulos" className="hover:text-white transition-colors">Asistente con IA &quot;Cost&quot;</a></li>
              <li><a href="#roi" className="hover:text-white transition-colors">Calculadora de ROI</a></li>
              <li><a href="#precios" className="hover:text-white transition-colors">Planes y Precios</a></li>
            </ul>
          </div>

          {/* Col 3: Enlaces de Acceso */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F5E8D2] mb-4">
              Acceso a Clientes
            </p>
            <ul className="space-y-2 text-xs text-[#E8F0EB]">
              <li>
                <a
                  href="https://app.costo360.com/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F0C447] transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={12} className="text-[#F0C447]" />
                  <span>Iniciar Sesión (app.costo360.com)</span>
                </a>
              </li>
              <li><a href="https://app.costo360.com/registro" className="hover:text-white transition-colors">Crear Cuenta Taller</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Centro de Ayuda / FAQ</a></li>
            </ul>
          </div>

          {/* Col 4: Contacto */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F5E8D2] mb-4">
              Contacto Directo
            </p>
            <ul className="space-y-3 text-xs text-[#E8F0EB]">
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-[#F0C447] shrink-0" />
                <span>Barranquilla, Atlántico · Colombia</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-[#F0C447] shrink-0" />
                <span>contacto@costo360.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-[#F0C447] shrink-0" />
                <span>Soporte Marmolerías: +57 (300) 000-0000</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Barra de Derechos de Autor */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#E8F0EB]/70 gap-4">
          <p>© {new Date().getFullYear()} Costo360 S.A.S. Todos los derechos reservados.</p>
          <p className="text-center sm:text-right">
            Innovación tecnológica para la industria de la piedra natural en Colombia.
          </p>
        </div>

      </div>
    </footer>
  );
}
