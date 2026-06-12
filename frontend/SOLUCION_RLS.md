# 🔐 Solución al Error de RLS (Row Level Security)

## Error:
```
new row violates row-level security policy for table "vehicles"
Code: 42501
```

Este error ocurre porque Supabase tiene activadas las políticas de seguridad que requieren usuarios autenticados, pero la aplicación no tiene sistema de login.

---

## ✅ OPCIÓN A: Desactivar RLS (Recomendado para desarrollo/pruebas)

### Paso 1: Ir a Supabase
1. Ve a https://supabase.com
2. Abre tu proyecto
3. Ve a **SQL Editor** (icono de terminal en el menú lateral)

### Paso 2: Ejecutar este SQL

Copia y pega este código completo:

```sql
-- Desactivar RLS en todas las tablas
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE material_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_status_log DISABLE ROW LEVEL SECURITY;

-- Borrar las políticas existentes que requieren autenticación
DROP POLICY IF EXISTS "Allow all operations for authenticated users on vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on routes" ON routes;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on material_movements" ON material_movements;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on cash_movements" ON cash_movements;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on vehicle_status_log" ON vehicle_status_log;
```

### Paso 3: Hacer clic en "RUN" (o presionar Ctrl+Enter)

### Paso 4: Verificar
Deberías ver el mensaje: **"Success. No rows returned"**

---

## ✅ OPCIÓN B: Permitir acceso anónimo (Mantiene RLS pero permite operaciones)

Si prefieres mantener RLS activado pero permitir operaciones sin autenticación:

```sql
-- Crear políticas que permitan acceso público (anónimo)
-- IMPORTANTE: Solo para desarrollo, NO usar en producción

-- Vehicles: Permitir todo sin autenticación
CREATE POLICY "Allow public access to vehicles"
  ON vehicles
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Routes: Permitir todo sin autenticación
CREATE POLICY "Allow public access to routes"
  ON routes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Material Movements: Permitir todo sin autenticación
CREATE POLICY "Allow public access to material_movements"
  ON material_movements
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Cash Movements: Permitir todo sin autenticación
CREATE POLICY "Allow public access to cash_movements"
  ON cash_movements
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Vehicle Status Log: Permitir todo sin autenticación
CREATE POLICY "Allow public access to vehicle_status_log"
  ON vehicle_status_log
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
```

---

## 🔒 OPCIÓN C: Implementar Autenticación (Para producción)

Para usar en producción, deberías implementar autenticación:

### 1. Activar Auth en Supabase
- Ve a **Authentication** → **Providers**
- Activa Email/Password

### 2. Agregar componente de Login al frontend

Crear `/app/frontend/src/components/Auth.tsx`:

```typescript
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      alert('Error: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f5f7fa'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>
          Iniciar Sesión
        </h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 3. Modificar App.tsx para verificar autenticación

```typescript
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
// ... resto de imports

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    // ... tu código actual de Router
  );
}
```

---

## 🎯 RECOMENDACIÓN

**Para probar rápidamente tu aplicación:** Usa **OPCIÓN A** (Desactivar RLS)

**Para producción:** Implementa **OPCIÓN C** (Autenticación completa)

---

## ⚠️ IMPORTANTE

- La OPCIÓN A hace que tu base de datos sea **completamente pública**
- Solo úsala en desarrollo o bases de datos de prueba
- **NUNCA** desactives RLS en producción con datos reales

---

## ✅ Después de aplicar la solución

1. Refresca la página de preview
2. Ve a **Administrador**
3. Intenta agregar una unidad nuevamente
4. ¡Debería funcionar! ✨

---

## 📞 ¿Necesitas ayuda?

Si tienes problemas ejecutando el SQL o quieres que te ayude a implementar autenticación, avísame.
