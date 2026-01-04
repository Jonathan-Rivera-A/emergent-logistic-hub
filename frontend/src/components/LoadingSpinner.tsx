const LoadingSpinner = ({ size = 40, color = '#3b82f6' }: { size?: number; color?: string }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: `4px solid ${color}20`,
          borderTop: `4px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      >
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default LoadingSpinner;
