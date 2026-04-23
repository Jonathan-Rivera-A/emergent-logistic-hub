import { ReactNode } from 'react';

interface KPIProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  testId?: string;
}

export default function KpiCard({ icon, label, value, sub, color = '#3b82f6', testId }: KPIProps) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }} data-testid={testId}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color, display: 'inline-flex' }}>{icon}</span>
        {label}
      </h3>
      <div className="stat-value" style={{ color: '#1f2937' }}>
        {value}
      </div>
      {sub && <div className="stat-label">{sub}</div>}
    </div>
  );
}
