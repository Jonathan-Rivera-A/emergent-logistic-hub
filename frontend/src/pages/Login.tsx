import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEMO_HINT = import.meta.env.DEV
  ? 'admin@forjatec.com / fojatec11553'
  : '';

const CARD: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  padding: 36,
  background: 'white',
  borderRadius: 14,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
};

const FIELD: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 15,
  outline: 'none',
};

export default function Login() {
  const { login, loginWithGoogle, user, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (user) {
    const from = (location.state as { from?: string } | null)?.from || '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await login(email.trim(), password);
      navigate((location.state as { from?: string } | null)?.from || '/', {
        replace: true,
      });
    } catch {
      // error already set by context
    }
  };

  const onGoogle = async () => {
    setLocalError(null);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      setLocalError(e?.message || 'No se pudo iniciar Google OAuth');
    }
  };

  const msg = localError || error;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        padding: 24,
      }}
      data-testid="login-page"
    >
      <div style={CARD}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>
          Sistema de Transporte
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          Ingresa para acceder al dashboard
        </p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={FIELD}
              autoComplete="username"
              data-testid="login-email"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={FIELD}
              autoComplete="current-password"
              data-testid="login-password"
            />
          </div>

          {msg && (
            <div
              style={{
                padding: 10,
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 8,
                fontSize: 13,
              }}
              data-testid="login-error"
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            style={{
              padding: '12px 14px',
              background: '#1e40af',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
            Ingresar
          </button>
        </form>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          color: '#94a3b8', fontSize: 12, margin: '18px 0',
        }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          O
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          disabled={loading}
          data-testid="login-google"
          style={{
            width: '100%',
            padding: '12px 14px',
            background: 'white',
            color: '#0f172a',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continuar con Google
        </button>

        {DEMO_HINT && (
          <p style={{
            marginTop: 18, fontSize: 12, color: '#94a3b8', textAlign: 'center',
          }}>
            Demo: {DEMO_HINT}
          </p>
        )}
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
