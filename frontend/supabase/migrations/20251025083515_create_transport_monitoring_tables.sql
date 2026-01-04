/*
  # Sistema de Monitoreo de Transporte
  
  1. Nuevas Tablas
    - `vehicles` (Unidades de transporte)
      - `id` (uuid, primary key)
      - `name` (text) - Nombre/identificador de la unidad
      - `plate` (text) - Placa del vehículo
      - `status` (text) - Estado: 'active', 'inactive', 'maintenance'
      - `current_temperature` (numeric) - Temperatura actual
      - `fuel_capacity` (numeric) - Capacidad de combustible
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `routes` (Rutas de transporte)
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key)
      - `origin` (text) - Punto de origen
      - `destination` (text) - Punto de destino
      - `distance_km` (numeric) - Distancia en kilómetros
      - `fuel_consumed` (numeric) - Combustible consumido
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `created_at` (timestamptz)
    
    - `material_movements` (Movimientos de material)
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key)
      - `type` (text) - 'entrada' o 'salida'
      - `material_name` (text) - Nombre del material
      - `quantity` (numeric) - Cantidad
      - `unit` (text) - Unidad de medida (kg, ton, m3, etc)
      - `date` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `cash_movements` (Movimientos de efectivo)
      - `id` (uuid, primary key)
      - `type` (text) - 'entrada' o 'salida'
      - `amount` (numeric) - Monto
      - `concept` (text) - Concepto del movimiento
      - `date` (timestamptz)
      - `related_vehicle_id` (uuid, foreign key, nullable)
      - `created_at` (timestamptz)
    
    - `vehicle_status_log` (Historial de estados de vehículos)
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key)
      - `temperature` (numeric)
      - `fuel_level` (numeric)
      - `status` (text)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `recorded_at` (timestamptz)
      - `created_at` (timestamptz)
  
  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para usuarios autenticados para leer y escribir datos
*/

-- Tabla de vehículos
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plate text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  current_temperature numeric DEFAULT 0,
  fuel_capacity numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla de rutas
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km numeric DEFAULT 0,
  fuel_consumed numeric DEFAULT 0,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on routes"
  ON routes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla de movimientos de material
CREATE TABLE IF NOT EXISTS material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('entrada', 'salida')),
  material_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on material_movements"
  ON material_movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla de movimientos de efectivo
CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('entrada', 'salida')),
  amount numeric NOT NULL DEFAULT 0,
  concept text NOT NULL,
  date timestamptz DEFAULT now(),
  related_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on cash_movements"
  ON cash_movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla de historial de estado de vehículos
CREATE TABLE IF NOT EXISTS vehicle_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  temperature numeric,
  fuel_level numeric,
  status text,
  latitude numeric,
  longitude numeric,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on vehicle_status_log"
  ON vehicle_status_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insertar datos de ejemplo
INSERT INTO vehicles (name, plate, status, current_temperature, fuel_capacity) VALUES
  ('Unidad 001', 'ABC-123', 'active', 22.5, 200),
  ('Unidad 002', 'DEF-456', 'active', 18.0, 180),
  ('Unidad 003', 'GHI-789', 'inactive', 25.0, 200),
  ('Unidad 004', 'JKL-012', 'maintenance', 0, 220)
ON CONFLICT (plate) DO NOTHING;
