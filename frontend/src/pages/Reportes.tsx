import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { Fuel, Navigation, Thermometer, Activity } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: string;
  current_temperature: number;
  fuel_capacity: number;
}

interface Route {
  id: string;
  vehicle_id: string;
  origin: string;
  destination: string;
  distance_km: number;
  fuel_liters: number;
  motor_hours: number;
  consumption_per_100km: number;
  efficiency_km_per_liter: number;
  consumption_per_hour: number;
  start_time: string;
  created_at: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function Reportes() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const [stats, setStats] = useState({
    totalFuelConsumed: 0,
    totalDistance: 0,
    activeVehicles: 0,
    averageTemperature: 0,
    averageConsumptionPer100km: 0,
    averageEfficiencyKmPerLiter: 0,
    totalMotorHours: 0,
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
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*');

      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(50);

      if (vehiclesError || routesError) {
        console.error('Error fetching data:', vehiclesError || routesError);
        showToast('Error al cargar los datos de reportes.', 'error');
      }

      if (vehiclesData) {
        setVehicles(vehiclesData);
        const activeCount = vehiclesData.filter(v => v.status === 'active').length;
        const avgTemp = vehiclesData.length > 0 
          ? vehiclesData.reduce((acc, v) => acc + (v.current_temperature || 0), 0) / vehiclesData.length 
          : 0;

        setStats(prev => ({
          ...prev,
          activeVehicles: activeCount,
          averageTemperature: avgTemp,
        }));
      }

      if (routesData) {
        setRoutes(routesData);
        const totalFuel = routesData.reduce((acc, r) => acc + (r.fuel_liters || 0), 0);
        const totalDist = routesData.reduce((acc, r) => acc + (r.distance_km || 0), 0);
        const totalHours = routesData.reduce((acc, r) => acc + (r.motor_hours || 0), 0);
        
        // Calcular promedios
        const routesWithConsumption = routesData.filter(r => r.consumption_per_100km);
        const avgConsumption = routesWithConsumption.length > 0
          ? routesWithConsumption.reduce((acc, r) => acc + r.consumption_per_100km, 0) / routesWithConsumption.length
          : 0;
          
        const routesWithEfficiency = routesData.filter(r => r.efficiency_km_per_liter);
        const avgEfficiency = routesWithEfficiency.length > 0
          ? routesWithEfficiency.reduce((acc, r) => acc + r.efficiency_km_per_liter, 0) / routesWithEfficiency.length
          : 0;

        setStats(prev => ({
          ...prev,
          totalFuelConsumed: totalFuel,
          totalDistance: totalDist,
          totalMotorHours: totalHours,
          averageConsumptionPer100km: avgConsumption,
          averageEfficiencyKmPerLiter: avgEfficiency,
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error inesperado al cargar los datos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para gráficas
  const consumptionByVehicleData = vehicles.map(vehicle => {
    const vehicleRoutes = routes.filter(r => r.vehicle_id === vehicle.id);
    const avgConsumption = vehicleRoutes.length > 0
      ? vehicleRoutes.reduce((acc, r) => acc + (r.consumption_per_100km || 0), 0) / vehicleRoutes.length
      : 0;
    const avgEfficiency = vehicleRoutes.length > 0
      ? vehicleRoutes.reduce((acc, r) => acc + (r.efficiency_km_per_liter || 0), 0) / vehicleRoutes.length
      : 0;
    
    return {
      name: vehicle.name,
      consumo: parseFloat(avgConsumption.toFixed(2)),
      rendimiento: parseFloat(avgEfficiency.toFixed(2)),
      rutas: vehicleRoutes.length,
    };
  }).filter(v => v.rutas > 0);

  const recentRoutesData = routes.slice(0, 10).map((route, index) => ({
    name: `Ruta ${routes.length - index}`,
    'L/100km': route.consumption_per_100km || 0,
    'km/L': route.efficiency_km_per_liter || 0,
    distancia: route.distance_km,
  }));

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
        <h1>Reportes</h1>
        <p>Análisis detallado del desempeño de la flota</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <h3>
            <Fuel size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Combustible Total
          </h3>
          <div className="stat-value">{stats.totalFuelConsumed.toFixed(1)} L</div>
          <div className="stat-label">Últimas 50 rutas</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <h3>
            <Navigation size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Kilómetros
          </h3>
          <div className="stat-value">{stats.totalDistance.toFixed(0)} km</div>
          <div className="stat-label">Distancia recorrida</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <h3>
            <Activity size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Unidades Activas
          </h3>
          <div className="stat-value">{stats.activeVehicles}</div>
          <div className="stat-label">De {vehicles.length} unidades</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
          <h3>
            <Thermometer size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Temperatura Promedio
          </h3>
          <div className="stat-value">{stats.averageTemperature.toFixed(1)}°C</div>
          <div className="stat-label">Temperatura de flota</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        <div className="card">
          <h2>Consumo de Combustible por Ruta</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelConsumptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
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
                <Bar dataKey="combustible" fill="#3b82f6" name="Combustible (L)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="distancia" fill="#10b981" name="Distancia (km)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Estado de las Unidades</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehicleStatusData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Temperatura de Unidades</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
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
                <Line
                  type="monotone"
                  dataKey="temperatura"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Temperatura (°C)"
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2>Detalles de Unidades</h2>
          <div style={{ maxHeight: '350px', overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Placa</th>
                  <th>Estado</th>
                  <th>Temperatura</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(vehicle => (
                  <tr key={vehicle.id}>
                    <td style={{ fontWeight: 500, color: '#1f2937' }}>{vehicle.name}</td>
                    <td>{vehicle.plate}</td>
                    <td>
                      <span className={`status-badge ${vehicle.status}`}>
                        {vehicle.status === 'active' ? 'Activo' :
                         vehicle.status === 'inactive' ? 'Inactivo' : 'Mantenimiento'}
                      </span>
                    </td>
                    <td>{vehicle.current_temperature}°C</td>
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

export default Reportes;
