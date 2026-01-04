import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Map, BarChart3, TrendingUp, Settings } from 'lucide-react';
import MonitorRutas from './pages/MonitorRutas';
import Reportes from './pages/Reportes';
import BI from './pages/BI';
import Administrador from './pages/Administrador';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>Sistema de Transporte</h1>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Map size={20} />
              <span>Monitor de rutas</span>
            </NavLink>
            <NavLink to="/reportes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <BarChart3 size={20} />
              <span>Reportes</span>
            </NavLink>
            <NavLink to="/bi" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <TrendingUp size={20} />
              <span>BI</span>
            </NavLink>
            <NavLink to="/administrador" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Settings size={20} />
              <span>Administrador</span>
            </NavLink>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<MonitorRutas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/bi" element={<BI />} />
            <Route path="/administrador" element={<Administrador />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
