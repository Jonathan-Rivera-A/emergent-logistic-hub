import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (requireAdmin && !user.is_admin) {
    return (
      <div className="page-container">
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <h2>Acceso restringido</h2>
          <p>Esta sección requiere permisos de administrador.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
