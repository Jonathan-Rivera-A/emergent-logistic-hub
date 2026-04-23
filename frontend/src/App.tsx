import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Map, BarChart3, TrendingUp, Settings, LogOut, User } from 'lucide-react';
import MonitorRutas from './pages/MonitorRutas';
import Reportes from './pages/Reportes';
import BI from './pages/BI';
import Administrador from './pages/Administrador';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Sistema de Transporte</h1>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Map size={20} /><span>Monitor de rutas</span>
        </NavLink>
        <NavLink to="/reportes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <BarChart3 size={20} /><span>Reportes</span>
        </NavLink>
        <NavLink to="/bi" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <TrendingUp size={20} /><span>BI</span>
        </NavLink>
        <NavLink
          to="/administrador"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <Settings size={20} /><span>Administrador</span>
        </NavLink>
      </nav>
      {user && (
        <div style={{
          padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontSize: 13 }}>
            <User size={16} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user.name || user.email}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {user.provider === 'google' ? 'Google' : 'Local'}
                {user.is_admin && ' · admin'}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            data-testid="logout-button"
            style={{
              padding: '8px 12px', background: 'rgba(255,255,255,0.08)',
              color: 'white', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}

function Shell() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<MonitorRutas />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route
            path="/bi"
            element={<ProtectedRoute><BI /></ProtectedRoute>}
          />
          <Route
            path="/administrador"
            element={<ProtectedRoute requireAdmin><Administrador /></ProtectedRoute>}
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<Shell />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
