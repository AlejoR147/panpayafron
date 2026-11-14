import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { InventarioPage } from './pages/InventarioPage';
import { SedesPage } from './pages/SedesPage';
import { TopologiaPage } from './pages/TopologiaPage';
import { SimulacionPage } from './pages/SimulacionPage';
import { Visualizacion3D } from './pages/Visualizacion3D';
import { PingPasoAPaso } from './pages/PingPasoAPaso';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/sedes" element={<SedesPage />} />
        <Route path="/topologia" element={<TopologiaPage />} />
        <Route path="/simulacion" element={<SimulacionPage />} />
        <Route path="/visualizacion-3d" element={<Visualizacion3D />} />
        <Route path="/simulacion-paso-paso" element={<PingPasoAPaso />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
