import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useNetworkStore } from '../../store/useNetworkStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const estadoDashboard = useNetworkStore((state) => state.estadoDashboard);
  const cargarDashboard = useNetworkStore((state) => state.cargarDashboard);

  useEffect(() => {
    if (estadoDashboard === 'idle') {
      void cargarDashboard();
    }
  }, [estadoDashboard, cargarDashboard]);

  useEffect(() => {
    if (!menuAbierto) {
      return;
    }

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setMenuAbierto(false);
      }
    };

    window.addEventListener('keydown', alPresionarTecla);
    return () => window.removeEventListener('keydown', alPresionarTecla);
  }, [menuAbierto]);

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <div className="relative min-h-svh bg-ink-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_-10%,rgba(251,139,18,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_100%_100%,rgba(56,189,248,0.07),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <Sidebar />
      </aside>

      <div
        id="menu-navegacion-movil"
        className={`fixed inset-0 z-50 lg:hidden ${menuAbierto ? 'visible' : 'invisible'}`}
      >
        <button
          type="button"
          onClick={cerrarMenu}
          aria-label="Cerrar menú de navegación"
          className={`absolute inset-0 h-full w-full bg-ink-950/75 backdrop-blur-sm transition-opacity duration-300 ${
            menuAbierto ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
            menuAbierto ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar onNavegar={cerrarMenu} />
          <button
            type="button"
            onClick={cerrarMenu}
            className="absolute right-3 top-4 inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-ink-900/80 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="size-4" aria-hidden />
          </button>
        </aside>
      </div>

      <div className="flex min-h-svh flex-col lg:pl-72">
        <Topbar menuAbierto={menuAbierto} onAbrirMenu={() => setMenuAbierto(true)} />
        <main className="relative mx-auto w-full max-w-[1600px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
