import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

interface MaterialMovement {
  id: string;
  type: 'entrada' | 'salida';
  material_name: string;
  quantity: number;
  unit: string;
  date: string;
}

interface CashMovement {
  id: string;
  type: 'entrada' | 'salida';
  amount: number;
  concept: string;
  date: string;
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function BI() {
  const [materialMovements, setMaterialMovements] = useState<MaterialMovement[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const [weeklyStats, setWeeklyStats] = useState({
    materialEntradas: 0,
    materialSalidas: 0,
    cashEntradas: 0,
    cashSalidas: 0,
    netCash: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: ToastState['type']) => {
    setToast({ show: true, message, type });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: materialData, error: materialError } = await supabase
        .from('material_movements')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      const { data: cashData, error: cashError } = await supabase
        .from('cash_movements')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (materialError || cashError) {
        console.error('Error fetching data:', materialError || cashError);
        showToast('Error al cargar los datos de BI.', 'error');
      }

      if (materialData) {
        setMaterialMovements(materialData);
        const entradas = materialData.filter(m => m.type === 'entrada').length;
        const salidas = materialData.filter(m => m.type === 'salida').length;
        setWeeklyStats(prev => ({
          ...prev,
          materialEntradas: entradas,
          materialSalidas: salidas,
        }));
      }

      if (cashData) {
        setCashMovements(cashData);
        const entradas = cashData
          .filter(c => c.type === 'entrada')
          .reduce((acc, c) => acc + c.amount, 0);
        const salidas = cashData
          .filter(c => c.type === 'salida')
          .reduce((acc, c) => acc + c.amount, 0);
        setWeeklyStats(prev => ({
          ...prev,
          cashEntradas: entradas,
          cashSalidas: salidas,
          netCash: entradas - salidas,
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error inesperado al cargar los datos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const groupByWeek = (movements: any[], field: string) => {
    const weeks: { [key: string]: { entradas: number; salidas: number } } = {};

    movements.forEach(movement => {
      const date = new Date(movement.date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = { entradas: 0, salidas: 0 };
      }

      if (movement.type === 'entrada') {
        weeks[weekKey].entradas += field === 'amount' ? movement[field] : 1;
      } else {
        weeks[weekKey].salidas += field === 'amount' ? movement[field] : 1;
      }
    });

    return Object.entries(weeks)
      .map(([week, data]) => ({
        semana: new Date(week).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
        entradas: data.entradas,
        salidas: data.salidas,
      }))
      .slice(-8);
  };

  const materialWeeklyData = groupByWeek(materialMovements, 'quantity');
  const cashWeeklyData = groupByWeek(cashMovements, 'amount');

  const recentMaterialMovements = materialMovements.slice(0, 10);
  const recentCashMovements = cashMovements.slice(0, 10);

  return (
    <div className="page-container">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      
      <div className="page-header">
        <h1>Business Intelligence</h1>
        <p>Análisis de movimientos de material y flujo de efectivo</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <h3>
            <TrendingUp size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Entradas de Material
          </h3>
          <div className="stat-value">{weeklyStats.materialEntradas}</div>
          <div className="stat-label">Movimientos totales</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
          <h3>
            <TrendingDown size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Salidas de Material
          </h3>
          <div className="stat-value">{weeklyStats.materialSalidas}</div>
          <div className="stat-label">Movimientos totales</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <h3>
            <DollarSign size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Ingresos de Efectivo
          </h3>
          <div className="stat-value">${weeklyStats.cashEntradas.toLocaleString('es-MX')}</div>
          <div className="stat-label">Total de entradas</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <h3>
            <Package size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Balance Neto
          </h3>
          <div className="stat-value" style={{ color: weeklyStats.netCash >= 0 ? '#10b981' : '#ef4444' }}>
            ${weeklyStats.netCash.toLocaleString('es-MX')}
          </div>
          <div className="stat-label">Entradas - Salidas</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        <div className="card">
          <h2>Movimientos de Material por Semana</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialWeeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="entradas" fill="#10b981" name="Entradas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="salidas" fill="#ef4444" name="Salidas" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Flujo de Efectivo por Semana</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashWeeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => `$${value.toLocaleString('es-MX')}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Entradas"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="salidas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Salidas"
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Últimos Movimientos de Material</h2>
          <div style={{ maxHeight: '350px', overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Material</th>
                  <th>Cantidad</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentMaterialMovements.map(movement => (
                  <tr key={movement.id}>
                    <td>
                      <span className={`status-badge ${movement.type === 'entrada' ? 'active' : 'inactive'}`}>
                        {movement.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#1f2937' }}>{movement.material_name}</td>
                    <td>{movement.quantity} {movement.unit}</td>
                    <td>{new Date(movement.date).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Últimos Movimientos de Efectivo</h2>
          <div style={{ maxHeight: '350px', overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentCashMovements.map(movement => (
                  <tr key={movement.id}>
                    <td>
                      <span className={`status-badge ${movement.type === 'entrada' ? 'active' : 'inactive'}`}>
                        {movement.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#1f2937' }}>{movement.concept}</td>
                    <td style={{ color: movement.type === 'entrada' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      ${movement.amount.toLocaleString('es-MX')}
                    </td>
                    <td>{new Date(movement.date).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default BI;
