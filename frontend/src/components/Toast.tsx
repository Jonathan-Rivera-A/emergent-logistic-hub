import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast = ({ message, type, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const colors = {
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  };

  const style = colors[type];

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ color: style.text }}>{icons[type]}</div>
      <div style={{ flex: 1, color: style.text, fontWeight: 500, fontSize: '14px' }}>
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: style.text,
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={16} />
      </button>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Toast;
