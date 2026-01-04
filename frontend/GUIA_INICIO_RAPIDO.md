# 🚀 Guía de Inicio Rápido - LOGISTICS-CONTROL

Esta guía te ayudará a tener la aplicación funcionando en menos de 10 minutos.

---

## 📋 Pre-requisitos

- ✅ Node.js 16+ instalado
- ✅ Cuenta en [Supabase](https://supabase.com) (gratis)
- ✅ Cuenta en [Google Cloud](https://console.cloud.google.com/) (gratis)

---

## ⚡ Paso a Paso

### 1️⃣ Configurar Supabase (3 minutos)

**A. Crear proyecto:**
1. Ve a https://supabase.com
2. Click en "New Project"
3. Nombre: `logistics-control`
4. Contraseña: `[genera una segura]`
5. Región: `[la más cercana]`
6. Click en "Create new project"
7. ⏳ Espera 2-3 minutos mientras se crea

**B. Ejecutar migración:**
1. En el panel de Supabase, ve a **SQL Editor**
2. Click en "New query"
3. Copia TODO el contenido de:
   ```
   supabase/migrations/20251025083515_create_transport_monitoring_tables.sql
   ```
4. Pega en el editor SQL
5. Click en "RUN" (esquina inferior derecha)
6. ✅ Verás "Success. No rows returned"

**C. Obtener credenciales:**
1. Ve a **Settings** (⚙️ en barra lateral)
2. Click en **API**
3. Busca:
   - **Project URL** → Copia
   - **anon/public key** → Copia
4. 📝 Guárdalas, las necesitarás en el paso 3

---

### 2️⃣ Configurar Google Maps (2 minutos)

**A. Crear proyecto:**
1. Ve a https://console.cloud.google.com/
2. Click en el menú desplegable de proyectos (arriba)
3. Click en "NEW PROJECT"
4. Nombre: `logistics-control`
5. Click "CREATE"

**B. Habilitar APIs:**
1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca y habilita:
   - **Maps JavaScript API** → Click "ENABLE"
   - **Directions API** → Click "ENABLE"

**C. Crear API Key:**
1. Ve a **APIs & Services** → **Credentials**
2. Click "CREATE CREDENTIALS" → "API Key"
3. 📝 Copia la API Key generada
4. (Opcional) Click en "RESTRICT KEY" para mayor seguridad
   - Application restrictions: HTTP referrers
   - Website restrictions: `http://localhost:5173/*`
   - API restrictions: Solo las 2 APIs habilitadas

---

### 3️⃣ Configurar el Proyecto (2 minutos)

**A. Clonar e instalar:**
```bash
# 1. Clonar el repositorio
git clone https://github.com/Jonathan-Rivera-A/LOGISTICS-CONTROL.git
cd LOGISTICS-CONTROL

# 2. Instalar dependencias
npm install
```

**B. Configurar variables de entorno:**
```bash
# Crea el archivo .env
touch .env

# O en Windows:
type nul > .env
```

Abre `.env` y pega (reemplaza con tus valores):
```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
VITE_GOOGLE_MAPS_API_KEY=tu-google-maps-api-key
```

---

### 4️⃣ Ejecutar la Aplicación (1 minuto)

```bash
npm run dev
```

✅ Abre tu navegador en: http://localhost:5173

---

## 🎉 ¡Listo!

Ahora deberías ver la aplicación funcionando. El sistema viene con datos de ejemplo:

### 🚗 Datos Pre-cargados:
- **4 vehículos** de ejemplo:
  - Unidad 001 (ABC-123) - Activo
  - Unidad 002 (DEF-456) - Activo  
  - Unidad 003 (GHI-789) - Inactivo
  - Unidad 004 (JKL-012) - Mantenimiento

---

## 🧪 Prueba Rápida

### Test 1: Ver unidades
1. Ve a **Administrador** (menú lateral)
2. ✅ Deberías ver 4 unidades listadas

### Test 2: Agregar unidad
1. Click en "Agregar Unidad"
2. Llena el formulario:
   - Nombre: `Unidad 005`
   - Placa: `XYZ-999`
   - Estado: `Activo`
   - Temperatura: `20`
   - Capacidad: `200`
3. Click "Agregar Unidad"
4. ✅ Verás notificación de éxito

### Test 3: Calcular ruta
1. Ve a **Monitor de Rutas**
2. Selecciona una unidad
3. Origen: `Ciudad de México`
4. Destino: `Guadalajara`
5. Click "Calcular Ruta"
6. ✅ Verás la ruta en el mapa

### Test 4: Ver reportes
1. Ve a **Reportes**
2. ✅ Verás estadísticas y gráficos

---

## ⚠️ Solución de Problemas Comunes

### Error: "Failed to fetch"
**Causa:** Credenciales de Supabase incorrectas
**Solución:**
1. Verifica que copiaste correctamente el URL y la key
2. Revisa que no haya espacios al inicio/final
3. Reinicia el servidor (`Ctrl+C` y `npm run dev`)

### Error: "This API project is not authorized"
**Causa:** Google Maps API Key incorrecta o sin APIs habilitadas
**Solución:**
1. Verifica que habilitaste Maps JavaScript API y Directions API
2. Espera 5 minutos (las APIs tardan en activarse)
3. Verifica que la API Key esté correcta en .env

### Error: "Row Level Security"
**Causa:** RLS está activado pero no hay autenticación
**Solución temporal para desarrollo:**
```sql
-- Ejecuta en SQL Editor de Supabase
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE material_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_status_log DISABLE ROW LEVEL SECURITY;
```

### No veo datos
**Solución:**
1. Ve a SQL Editor en Supabase
2. Ejecuta:
```sql
SELECT * FROM vehicles;
```
3. Si está vacío, ejecuta de nuevo la migración completa

---

## 📱 Siguientes Pasos

### Para Desarrollo:
1. ✅ Familiarízate con todas las secciones
2. ✅ Agrega tus propios vehículos
3. ✅ Prueba todas las funcionalidades
4. ✅ Lee el archivo `REPORTE_REVISION.md` para mejoras

### Para Producción:
1. 🔐 Implementa autenticación (Supabase Auth)
2. 🧪 Agrega tests automatizados
3. 🎨 Personaliza los estilos
4. 📱 Optimiza para móviles
5. 🚀 Deploy en Vercel/Netlify

---

## 💡 Tips Útiles

### Atajos del Sistema:
- **Monitor de Rutas**: Ver y planificar rutas en tiempo real
- **Reportes**: Análisis de consumo y rendimiento
- **BI**: Control financiero y de materiales
- **Administrador**: CRUD de vehículos

### Datos de Ejemplo:
Para resetear los datos de ejemplo, ejecuta en SQL Editor:
```sql
-- Borrar todos los datos
TRUNCATE vehicles CASCADE;

-- Reinsertar datos de ejemplo
INSERT INTO vehicles (name, plate, status, current_temperature, fuel_capacity) VALUES
  ('Unidad 001', 'ABC-123', 'active', 22.5, 200),
  ('Unidad 002', 'DEF-456', 'active', 18.0, 180),
  ('Unidad 003', 'GHI-789', 'inactive', 25.0, 200),
  ('Unidad 004', 'JKL-012', 'maintenance', 0, 220);
```

---

## 🆘 ¿Necesitas Ayuda?

1. 📖 Lee el `README.md` completo
2. 📋 Revisa el `REPORTE_REVISION.md`
3. 🐛 Abre un issue en GitHub
4. 💬 Contacta al autor

---

## ✅ Checklist de Validación

- [ ] Aplicación corre sin errores (`npm run dev`)
- [ ] Puedo ver las 4 unidades de ejemplo
- [ ] Puedo agregar una nueva unidad
- [ ] Puedo calcular una ruta en el mapa
- [ ] Los reportes muestran gráficos
- [ ] Los toasts funcionan (notificaciones)
- [ ] No hay errores en la consola del navegador

Si todos están ✅, ¡estás listo para desarrollar!

---

**Tiempo total estimado:** ⏱️ 8-10 minutos

**Dificultad:** ⭐⭐ (Fácil)

**¡Buena suerte con tu proyecto!** 🚀
