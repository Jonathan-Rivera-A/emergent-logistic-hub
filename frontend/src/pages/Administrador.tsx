import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

interface Vehicle {
  id: string;
  name: string;
  plate: string;
  status: string;
  current_temperature: number;
  fuel_capacity: number;
  average_fuel_consumption: number; // L/100km
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function Administrador() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const [formData, setFormData] = useState({
    name: '',
    plate: '',
    status: 'active',
    current_temperature: 0,
    fuel_capacity: 0,
    average_fuel_consumption: 0,
  });

  useEffect(() => {
    fetchVehicles();
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
        showToast('Error al cargar las unidades.', 'error');
        return;
      }

      if (data) {
        setVehicles(data);
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error inesperado al cargar las unidades.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      showToast('El nombre de la unidad es requerido.', 'warning');
      return false;
    }
    if (!formData.plate.trim()) {
      showToast('La placa es requerida.', 'warning');
      return false;
    }
    if (formData.fuel_capacity < 0) {
      showToast('La capacidad de combustible no puede ser negativa.', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(formData)
          .eq('id', editingVehicle.id);

        if (error) {
          console.error('Error updating vehicle:', error);
          if (error.code === '23505') {
            showToast('Ya existe una unidad con esta placa.', 'error');
          } else {
            showToast('Error al actualizar la unidad.', 'error');
          }
          return;
        }

        showToast('Unidad actualizada exitosamente.', 'success');
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert([formData]);

        if (error) {
          console.error('Error inserting vehicle:', error);
          if (error.code === '23505') {
            showToast('Ya existe una unidad con esta placa.', 'error');
          } else {
            showToast('Error al agregar la unidad.', 'error');
          }
          return;
        }

        showToast('Unidad agregada exitosamente.', 'success');
      }

      setFormData({
        name: '',
        plate: '',
        status: 'active',
        current_temperature: 0,
        fuel_capacity: 0,
        average_fuel_consumption: 0,
      });
      setShowAddModal(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error inesperado al guardar la unidad.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      plate: vehicle.plate,
      status: vehicle.status,
      current_temperature: vehicle.current_temperature,
      fuel_capacity: vehicle.fuel_capacity,
      average_fuel_consumption: vehicle.average_fuel_consumption || 0,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta unidad? Esta acción no se puede deshacer.')) {
      try {
        const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting vehicle:', error);
          showToast('Error al eliminar la unidad.', 'error');
          return;
        }

        showToast('Unidad eliminada exitosamente.', 'success');
        fetchVehicles();
      } catch (error) {
        console.error('Error:', error);
        showToast('Error inesperado al eliminar la unidad.', 'error');
      }
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingVehicle(null);
    setFormData({
      name: '',
      plate: '',
      status: 'active',
      current_temperature: 0,
      fuel_capacity: 0,
    });
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Administrador</h1>
            <p>Gestiona las unidades y configuración del sistema</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            data-testid="add-vehicle-button"
          >
            <Plus size={18} />
            Agregar Unidad
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <h2>Unidades Registradas</h2>
          {vehicles.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
              No hay unidades registradas. Haz clic en "Agregar Unidad" para comenzar.
            </p>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Placa</th>
                    <th>Estado</th>
                    <th>Temperatura</th>
                    <th>Capacidad<br/>Combustible (L)</th>
                    <th>Consumo Promedio<br/>(L/100km)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(vehicle => (
                    <tr key={vehicle.id} data-testid={`vehicle-row-${vehicle.id}`}>
                      <td style={{ fontWeight: 500, color: '#1f2937' }}>{vehicle.name}</td>
                      <td>{vehicle.plate}</td>
                      <td>
                        <span className={`status-badge ${vehicle.status}`}>
                          {vehicle.status === 'active' ? 'Activo' :
                           vehicle.status === 'inactive' ? 'Inactivo' : 'Mantenimiento'}
                        </span>
                      </td>
                      <td>{vehicle.current_temperature}°C</td>
                      <td>{vehicle.fuel_capacity}L</td>
                      <td style={{ fontWeight: 600, color: '#f59e0b' }}>
                        {vehicle.average_fuel_consumption ? vehicle.average_fuel_consumption.toFixed(2) : 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEdit(vehicle)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            data-testid={`edit-vehicle-${vehicle.id}`}
                          >
                            <Edit2 size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#fee2e2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#991b1b'
                            }}
                            data-testid={`delete-vehicle-${vehicle.id}`}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
              {editingVehicle ? 'Editar Unidad' : 'Agregar Nueva Unidad'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Nombre de la Unidad
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Placa
                  </label>
                  <input
                    type="text"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Temperatura Actual (°C)
                  </label>
                  <input
                    type="number"
                    value={formData.current_temperature}
                    onChange={(e) => setFormData({ ...formData, current_temperature: parseFloat(e.target.value) })}
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Capacidad de Combustible (L)
                  </label>
                  <input
                    type="number"
                    value={formData.fuel_capacity}
                    onChange={(e) => setFormData({ ...formData, fuel_capacity: parseFloat(e.target.value) })}
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Consumo Promedio (L/100km) ⛽
                  </label>
                  <input
                    type="number"
                    value={formData.average_fuel_consumption}
                    onChange={(e) => setFormData({ ...formData, average_fuel_consumption: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                    min="0"
                    placeholder="8.5"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    Consumo promedio del vehículo para cálculos automáticos
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                  data-testid="submit-vehicle-form"
                >
                  {submitting ? 'Guardando...' : (editingVehicle ? 'Guardar Cambios' : 'Agregar Unidad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Administrador;
