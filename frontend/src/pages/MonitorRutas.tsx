import { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, DirectionsService, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 21.2961,  // San Luis de la Paz, Guanajuato
  lng: -100.5156,
};

interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: string;
  average_fuel_consumption: number; // L/100km
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

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function MonitorRutas() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [fuelLiters, setFuelLiters] = useState<number>(0);
  const [motorHours, setMotorHours] = useState<number>(0);
  const [calculateRoute, setCalculateRoute] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

  useEffect(() => {
    fetchVehicles();
    fetchRoutes();
  }, []);

  const showToast = (message: string, type: ToastState['type']) => {
    setToast({ show: true, message, type });
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching vehicles:', error);
        showToast('Error al cargar las unidades. Por favor, verifica tu conexión.', 'error');
        return;
      }

      if (data) {
        setVehicles(data);
        if (data.length === 0) {
          showToast('No hay unidades registradas. Ve al Administrador para agregar unidades.', 'info');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error inesperado al cargar las unidades.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching routes:', error);
        return;
      }

      if (data) {
        setRoutes(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCalculateRoute = () => {
    if (!origin.trim()) {
      showToast('Por favor ingresa un punto de origen.', 'warning');
      return;
    }
    if (!destination.trim()) {
      showToast('Por favor ingresa un punto de destino.', 'warning');
      return;
    }
    if (!selectedVehicle) {
      showToast('Por favor selecciona una unidad.', 'warning');
      return;
    }
    
    setCalculatingRoute(true);
    setCalculateRoute(true);
  };

  const directionsCallback = async (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      setDirections(result);
      setCalculateRoute(false);
      setCalculatingRoute(false);
      
      const route = result.routes[0];
      const distanceText = route.legs[0].distance?.text || 'N/A';
      const distanceKm = route.legs[0].distance?.value ? route.legs[0].distance.value / 1000 : 0;
      const duration = route.legs[0].duration?.text || 'N/A';
      
      // Calcular automáticamente basándose en el vehículo seleccionado
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      if (vehicle && vehicle.average_fuel_consumption > 0) {
        // Calcular litros consumidos: (distancia * consumo_promedio) / 100
        const calculatedFuelLiters = (distanceKm * vehicle.average_fuel_consumption) / 100;
        setFuelLiters(parseFloat(calculatedFuelLiters.toFixed(2)));
        
        // Calcular horas de motor: distancia / 80 km/h (velocidad promedio)
        const calculatedMotorHours = distanceKm / 80;
        setMotorHours(parseFloat(calculatedMotorHours.toFixed(2)));
        
        showToast(
          `Ruta calculada: ${distanceText}, ${duration}. Consumo estimado: ${calculatedFuelLiters.toFixed(2)}L`,
          'success'
        );
      } else {
        showToast(`Ruta calculada: ${distanceText}, ${duration}`, 'success');
      }
    } else {
      console.error('Error al calcular la ruta:', status);
      setCalculateRoute(false);
      setCalculatingRoute(false);
      
      let errorMessage = 'Error al calcular la ruta.';
      if (status === 'ZERO_RESULTS') {
        errorMessage = 'No se encontró una ruta entre estos puntos.';
      } else if (status === 'NOT_FOUND') {
        errorMessage = 'No se pudo encontrar uno o ambos lugares.';
      } else if (status === 'REQUEST_DENIED') {
        errorMessage = 'Verifica tu API Key de Google Maps.';
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const saveRoute = async (distanceKm: number) => {
    try {
      // Validar que se hayan ingresado litros consumidos
      if (!fuelLiters || fuelLiters <= 0) {
        showToast('Por favor ingresa los litros de combustible consumidos.', 'warning');
        return;
      }

      // Validar que se hayan ingresado horas de motor
      if (!motorHours || motorHours <= 0) {
        showToast('Por favor ingresa las horas de motor.', 'warning');
        return;
      }

      // Calcular indicadores de consumo
      // 🔹 Consumo por distancia (L/100km)
      const consumptionPer100km = (fuelLiters / distanceKm) * 100;
      
      // 🔹 Rendimiento (km/L)
      const efficiencyKmPerLiter = distanceKm / fuelLiters;
      
      // 🔹 Consumo por hora (L/h)
      const consumptionPerHour = fuelLiters / motorHours;
      
      const routeData = {
        vehicle_id: selectedVehicle,
        origin: origin,
        destination: destination,
        distance_km: distanceKm,
        fuel_liters: fuelLiters,
        motor_hours: motorHours,
        consumption_per_100km: parseFloat(consumptionPer100km.toFixed(2)),
        efficiency_km_per_liter: parseFloat(efficiencyKmPerLiter.toFixed(2)),
        consumption_per_hour: parseFloat(consumptionPerHour.toFixed(2)),
        start_time: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('routes')
        .insert([routeData]);

      if (error) {
        console.error('Error saving route:', error);
        showToast('Ruta calculada pero no se pudo guardar en el historial.', 'warning');
        return;
      }

      showToast(
        `Ruta guardada. Consumo: ${consumptionPer100km.toFixed(2)} L/100km | Rendimiento: ${efficiencyKmPerLiter.toFixed(2)} km/L`,
        'success'
      );
      
      // Limpiar formulario
      setOrigin('');
      setDestination('');
      setFuelLiters(0);
      setMotorHours(0);
      setDirections(null);
      
      // Recargar rutas
      fetchRoutes();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al guardar la ruta.', 'error');
    }
  };

  const deleteRoute = async (routeId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta ruta del historial?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (error) {
        console.error('Error deleting route:', error);
        showToast('Error al eliminar la ruta.', 'error');
        return;
      }

      showToast('Ruta eliminada del historial.', 'success');
      fetchRoutes();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al eliminar la ruta.', 'error');
    }
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.name} (${vehicle.plate})` : 'N/A';
  };

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
        <h1>Monitor de Rutas</h1>
        <p>Visualiza y gestiona las rutas de tus unidades en tiempo real</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card" style={{ marginBottom: 0 }}>
                <h2>Planificar Ruta</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Unidad
                  </label>
                  <select
                    value={selectedVehicle || ''}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                    data-testid="vehicle-select"
                  >
                    <option value="">Seleccionar unidad</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.plate}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Origen
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Ciudad de México"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                    data-testid="origin-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Destino
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Guadalajara"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                    data-testid="destination-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Litros Consumidos ⛽
                  </label>
                  <input
                    type="number"
                    value={fuelLiters || ''}
                    onChange={(e) => setFuelLiters(parseFloat(e.target.value) || 0)}
                    placeholder="50.5"
                    min="0"
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                    data-testid="fuel-input"
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    Estimado de combustible para la ruta
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Horas de Motor 🕐
                  </label>
                  <input
                    type="number"
                    value={motorHours || ''}
                    onChange={(e) => setMotorHours(parseFloat(e.target.value) || 0)}
                    placeholder="6.5"
                    min="0"
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                    data-testid="hours-input"
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    Tiempo estimado con motor encendido
                  </span>
                </div>

                <button
                  onClick={handleCalculateRoute}
                  disabled={!origin || !destination || !selectedVehicle || calculatingRoute}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!origin || !destination || !selectedVehicle || calculatingRoute) ? 'not-allowed' : 'pointer',
                    opacity: (!origin || !destination || !selectedVehicle || calculatingRoute) ? 0.5 : 1
                  }}
                  data-testid="calculate-route-button"
                >
                  {calculatingRoute ? 'Calculando...' : 'Calcular Ruta'}
                </button>

                {directions && (
                  <button
                    onClick={() => {
                      const route = directions.routes[0];
                      const distanceKm = route.legs[0].distance?.value ? route.legs[0].distance.value / 1000 : 0;
                      saveRoute(distanceKm);
                    }}
                    disabled={!fuelLiters || !motorHours}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: (!fuelLiters || !motorHours) ? 'not-allowed' : 'pointer',
                      opacity: (!fuelLiters || !motorHours) ? 0.5 : 1,
                      marginTop: '8px'
                    }}
                    data-testid="save-route-button"
                  >
                    💾 Guardar Ruta en Historial
                  </button>
                )}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0, flex: 1, overflow: 'auto' }}>
              <h2>Unidades Activas</h2>
              <div className="vehicles-list">
                {vehicles.filter(v => v.status === 'active').length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                    No hay unidades activas
                  </p>
                ) : (
                  vehicles.filter(v => v.status === 'active').map(vehicle => (
                    <div
                      key={vehicle.id}
                      style={{
                        padding: '12px',
                        background: selectedVehicle === vehicle.id ? '#eff6ff' : '#f9fafb',
                        borderRadius: '8px',
                        border: `1px solid ${selectedVehicle === vehicle.id ? '#3b82f6' : '#e5e7eb'}`,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedVehicle(vehicle.id)}
                      data-testid={`vehicle-item-${vehicle.id}`}
                    >
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>{vehicle.name}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>{vehicle.plate}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0, padding: 0, overflow: 'hidden', height: '500px' }}>
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={14}
              >
                {calculateRoute && origin && destination && (
                  <DirectionsService
                    options={{
                      origin: origin,
                      destination: destination,
                      travelMode: google.maps.TravelMode.DRIVING,
                    }}
                    callback={directionsCallback}
                  />
                )}

                {directions && (
                  <DirectionsRenderer
                    options={{
                      directions: directions,
                    }}
                  />
                )}

                {!directions && (
                  <Marker position={center} />
                )}
              </GoogleMap>
            </LoadScript>
          </div>
        </div>

        {/* Tabla de Historial de Rutas */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>Historial de Rutas Calculadas</h2>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {routes.length} {routes.length === 1 ? 'ruta' : 'rutas'}
            </span>
          </div>

          {routes.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6b7280',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                No hay rutas calculadas aún. Calcula una ruta para ver el historial aquí.
              </p>
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Unidad</th>
                    <th>Origen → Destino</th>
                    <th>Distancia</th>
                    <th>Consumo<br/>(L/100km)</th>
                    <th>Rendimiento<br/>(km/L)</th>
                    <th>Consumo/Hora<br/>(L/h)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id} data-testid={`route-row-${route.id}`}>
                      <td style={{ fontSize: '13px' }}>
                        {new Date(route.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ fontWeight: 500, color: '#1f2937' }}>
                        {getVehicleName(route.vehicle_id)}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ fontWeight: 500 }}>{route.origin}</div>
                          <div style={{ color: '#6b7280' }}>→ {route.destination}</div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#3b82f6' }}>
                        {route.distance_km.toFixed(2)} km
                      </td>
                      <td style={{ fontWeight: 600, color: '#f59e0b' }}>
                        {route.consumption_per_100km ? route.consumption_per_100km.toFixed(2) : 'N/A'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#10b981' }}>
                        {route.efficiency_km_per_liter ? route.efficiency_km_per_liter.toFixed(2) : 'N/A'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#8b5cf6' }}>
                        {route.consumption_per_hour ? route.consumption_per_hour.toFixed(2) : 'N/A'}
                      </td>
                      <td>
                        <button
                          onClick={() => deleteRoute(route.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#991b1b',
                            fontSize: '13px',
                            fontWeight: 500
                          }}
                          data-testid={`delete-route-${route.id}`}
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}

export default MonitorRutas;
