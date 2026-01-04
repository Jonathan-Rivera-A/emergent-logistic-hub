# 🚚 Sistema de Control Logístico

Sistema integral de monitoreo y control de transporte con Business Intelligence para gestión de flotas vehiculares.

## 📋 Características

### 🗺️ Monitor de Rutas
- Visualización en tiempo real con Google Maps
- Planificación de rutas inteligente
- Seguimiento de unidades activas
- Cálculo de distancias y tiempos

### 📊 Reportes
- Análisis de consumo de combustible
- Tracking de kilómetros recorridos
- Monitoreo de temperatura de unidades
- Estado de la flota en tiempo real

### 💼 Business Intelligence
- Control de movimientos de material (entrada/salida)
- Análisis de flujo de efectivo
- Gráficos de tendencias semanales
- Balance neto de operaciones

### ⚙️ Administrador
- CRUD completo de vehículos
- Gestión de estados (Activo/Inactivo/Mantenimiento)
- Control de capacidad de combustible
- Monitoreo de temperatura

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Backend/BD**: Supabase (PostgreSQL)
- **Mapas**: Google Maps API
- **Gráficos**: Recharts
- **Iconos**: Lucide React
- **Estilos**: CSS Modules

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Jonathan-Rivera-A/LOGISTICS-CONTROL.git
cd LOGISTICS-CONTROL
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=tu-google-maps-api-key-aqui
```

#### Cómo obtener las credenciales:

**Supabase:**
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a Settings → API
4. Copia la URL del proyecto y la clave anónima (anon/public)

**Google Maps:**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Maps
4. Ve a Credenciales y crea una API Key
5. Habilita las siguientes APIs:
   - Maps JavaScript API
   - Directions API
   - Places API (opcional)

### 4. Configurar la base de datos

Ejecuta la migración de Supabase ubicada en:
```
supabase/migrations/20251025083515_create_transport_monitoring_tables.sql
```

En tu panel de Supabase:
1. Ve a SQL Editor
2. Copia y pega el contenido del archivo de migración
3. Ejecuta el script

### 5. Ejecutar el proyecto

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📚 Estructura de la Base de Datos

### Tablas Principales:

- **vehicles**: Información de vehículos
  - id, name, plate, status, current_temperature, fuel_capacity
  
- **routes**: Registro de rutas de transporte
  - id, vehicle_id, origin, destination, distance_km, fuel_consumed, start_time, end_time
  
- **material_movements**: Movimientos de material
  - id, vehicle_id, type (entrada/salida), material_name, quantity, unit, date
  
- **cash_movements**: Flujo de efectivo
  - id, type (entrada/salida), amount, concept, date, related_vehicle_id
  
- **vehicle_status_log**: Historial de estados
  - id, vehicle_id, temperature, fuel_level, status, latitude, longitude, recorded_at

## 🚀 Scripts Disponibles

```bash
npm run dev      # Inicia el servidor de desarrollo
npm run build    # Construye la aplicación para producción
npm run preview  # Vista previa de la build de producción
```

## 🔐 Seguridad

El proyecto utiliza Row Level Security (RLS) de Supabase. Las políticas actuales requieren usuarios autenticados.

### Opciones de configuración:

**Opción 1: Con autenticación (Recomendado para producción)**
- Implementar sistema de login/registro con Supabase Auth

**Opción 2: Sin autenticación (Solo desarrollo)**
- Desactivar RLS en las tablas de Supabase
- ⚠️ No recomendado para producción

## 🎨 Mejoras Implementadas

### Manejo de Errores
- ✅ Validación de formularios
- ✅ Manejo de errores de API
- ✅ Mensajes de error descriptivos
- ✅ Feedback visual con toasts

### UX/UI
- ✅ Loading states en todas las operaciones
- ✅ Confirmaciones antes de eliminar
- ✅ Estados de carga visual
- ✅ Notificaciones toast
- ✅ Data-testids para testing

### Rendimiento
- ✅ Optimización de consultas
- ✅ Límites en consultas de datos
- ✅ Manejo eficiente de estados

## 📝 Tareas Pendientes

- [ ] Implementar sistema de autenticación
- [ ] Agregar tests unitarios y de integración
- [ ] Implementar modo offline
- [ ] Agregar exportación de reportes (PDF/Excel)
- [ ] Implementar notificaciones push
- [ ] Agregar sistema de roles y permisos
- [ ] Optimizar para móviles
- [ ] Agregar modo oscuro

## 🐛 Problemas Conocidos

1. **RLS activado sin autenticación**: Las políticas de seguridad requieren usuarios autenticados
2. **API Key por defecto**: Configurar Google Maps API Key para usar mapas
3. **Datos de ejemplo**: La migración incluye datos de prueba que deben ser removidos en producción

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT.

## 👤 Autor

**Jonathan Rivera**
- GitHub: [@Jonathan-Rivera-A](https://github.com/Jonathan-Rivera-A)

## 📞 Soporte

Para soporte, abre un issue en GitHub o contacta al autor.

---

⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub
