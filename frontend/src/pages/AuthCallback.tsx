/**
 * Handles the redirect coming back from Supabase Google OAuth.
 * The AuthContext mount effect performs the actual token exchange;
 * this page just waits until the user appears then routes to /.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const { user, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
    else if (error) navigate('/login', { replace: true });
  }, [user, error, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        color: '#64748b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Loader2 className="spin" size={20} />
        <span>Completando inicio de sesión…</span>
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
